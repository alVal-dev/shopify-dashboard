import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import type { Response } from 'superagent';

import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  loginUser,
  seedTestUsers,
} from './helpers/test-app';
import { PrismaService } from '../prisma/prisma.service';
import { SseSessionRegistryService } from '../sse/sse-session-registry.service';
import { SseRealtimeSimulationService } from '../sse/sse-realtime-simulation.service';
import { EventEmitter } from 'node:events';

EventEmitter.defaultMaxListeners = 20;

describe('SSE integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let registry: SseSessionRegistryService;
  let simulation: SseRealtimeSimulationService;
  const openRequests: Array<{ abort: () => void }> = [];

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
    registry = app.get(SseSessionRegistryService);
    simulation = app.get(SseRealtimeSimulationService);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await seedTestUsers(prisma);
    registry.destroyAll();
  });

  afterEach(async () => {
    for (const req of openRequests.splice(0)) {
      try {
        req.abort();
      } catch {
        // best effort cleanup
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
    registry.destroyAll();
  });

  afterAll(async () => {
    if (app) {
      await closeTestApp(app);
    }
  });

  function extractSessionId(cookie: string): string {
    const match = cookie.match(/sessionId=([^;]+)/);
    if (!match) {
      throw new Error(`Unable to extract sessionId from cookie: ${cookie}`);
    }

    return match[1]!;
  }

  function openSseRequest(cookie: string, forwardedFor = '127.0.0.1') {
    return request(app.getHttpServer())
      .get('/api/sse/events')
      .set('Cookie', cookie)
      .set('X-Forwarded-For', forwardedFor)
      .buffer(false);
  }

  async function waitForConnectedStream(
    cookie: string,
    forwardedFor = '127.0.0.1',
  ): Promise<{ req: { abort: () => void }; res: Response; body: string }> {
    return new Promise((resolve, reject) => {
      const req = openSseRequest(cookie, forwardedFor);
      openRequests.push(req);

      let settled = false;

      req.on('response', (res: Response) => {
        let body = '';

        res.on('data', (chunk: Buffer | string) => {
          body += chunk.toString();

          if (!settled && body.includes(': connected')) {
            settled = true;
            resolve({ req, res, body });
          }
        });

        res.on('error', (error: Error) => {
          if (!settled) {
            settled = true;
            reject(error);
          }
        });
      });

      req.on('error', (error: Error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      });

      req.end(() => {
        // ne rien faire ici : une connexion SSE est longue durée
      });

      setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Timed out waiting for SSE connected chunk'));
        }
      }, 3000);
    });
  }

  it('GET /api/sse/events returns 401 without auth', async () => {
    await request(app.getHttpServer()).get('/api/sse/events').expect(401);
  });

  it('GET /api/sse/events opens an SSE stream with expected headers and initial connected chunk', async () => {
    const cookie = await loginUser(app);

    const { req, res, body } = await waitForConnectedStream(cookie);

    expect(res.status).toBe(200);
    expect(String(res.headers['content-type'])).toContain('text/event-stream');
    expect(String(res.headers['cache-control'])).toContain('no-cache');
    expect(String(res.headers['connection'])).toContain('keep-alive');
    expect(body).toContain(': connected');

    req.abort();
  });

  it('registers one runtime and one connection for an authenticated session', async () => {
    const cookie = await loginUser(app);
    const sessionId = extractSessionId(cookie);

    const { req } = await waitForConnectedStream(cookie);

    expect(registry.has(sessionId)).toBe(true);
    expect(registry.getConnectionCount(sessionId)).toBe(1);

    req.abort();
  });

  it('destroys runtime on last disconnect', async () => {
    const cookie = await loginUser(app);
    const sessionId = extractSessionId(cookie);

    const { req } = await waitForConnectedStream(cookie);

    expect(registry.has(sessionId)).toBe(true);
    expect(registry.getConnectionCount(sessionId)).toBe(1);

    req.abort();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(registry.has(sessionId)).toBe(false);
  });

  it('stops simulation on last disconnect', async () => {
    const cookie = await loginUser(app);
    const sessionId = extractSessionId(cookie);

    const { req } = await waitForConnectedStream(cookie);

    expect(simulation.isActive(sessionId)).toBe(true);

    req.abort();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(simulation.isActive(sessionId)).toBe(false);
  });

  it('returns 204 when active SSE connections for the IP already reached the limit', async () => {
    const cookie = await loginUser(app);
    const sessionId = extractSessionId(cookie);
    const ip = '20.0.0.1';

    for (let i = 0; i < 10; i += 1) {
      registry.registerConnection(sessionId, ip);
    }

    expect(registry.getConnectionCount(sessionId)).toBe(10);
    expect(registry.getActiveConnectionCountByIp(ip)).toBe(10);

    await request(app.getHttpServer())
      .get('/api/sse/events')
      .set('Cookie', cookie)
      .set('X-Forwarded-For', ip)
      .expect(204);
  });
});
