import request from 'supertest';
import { INestApplication } from '@nestjs/common';

import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  loginDemo,
  loginUser,
  seedTestUsers,
} from './helpers/test-app';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_LAYOUT } from '../dashboard/default-layout';

describe('Dashboard integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await seedTestUsers(prisma);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('GET /api/dashboard/layout returns 401 without auth', async () => {
    await request(app.getHttpServer()).get('/api/dashboard/layout').expect(401);
  });

  it('GET /api/dashboard/layout returns DEFAULT_LAYOUT when no saved layout exists', async () => {
    const cookie = await loginUser(app);

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/layout')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({
      data: DEFAULT_LAYOUT,
    });
  });

  it('PUT /api/dashboard/layout saves a valid layout for a standard user', async () => {
    const cookie = await loginUser(app);

    const payload = {
      widgets: [
        {
          id: 'custom-1',
          type: 'kpi-cards',
          title: 'Mes KPIs',
          position: { x: 1, y: 2, w: 4, h: 3 },
        },
      ],
    };

    const response = await request(app.getHttpServer())
      .put('/api/dashboard/layout')
      .set('Cookie', cookie)
      .send(payload)
      .expect(200);

    expect(response.body).toEqual({
      data: payload,
    });

    const user = await prisma.client.user.findUniqueOrThrow({
      where: { email: 'john@example.com' },
    });

    const saved = await prisma.client.dashboardLayout.findUnique({
      where: { userId: user.id },
    });

    expect(saved).not.toBeNull();
    expect(saved?.config).toEqual(payload);
  });

  it('GET /api/dashboard/layout returns the saved layout after PUT', async () => {
    const cookie = await loginUser(app);

    const payload = {
      widgets: [
        {
          id: 'saved-1',
          type: 'top-products',
          title: 'Top custom',
          position: { x: 0, y: 0, w: 6, h: 4 },
        },
      ],
    };

    await request(app.getHttpServer())
      .put('/api/dashboard/layout')
      .set('Cookie', cookie)
      .send(payload)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/dashboard/layout')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({
      data: payload,
    });
  });

  it('PUT /api/dashboard/layout returns 403 for demo user', async () => {
    const cookie = await loginDemo(app);

    await request(app.getHttpServer())
      .put('/api/dashboard/layout')
      .set('Cookie', cookie)
      .send({
        widgets: [
          {
            id: 'demo-1',
            type: 'kpi-cards',
            title: 'Demo',
            position: { x: 0, y: 0, w: 6, h: 3 },
          },
        ],
      })
      .expect(403);
  });

  it('PUT /api/dashboard/layout returns 400 for invalid payload', async () => {
    const cookie = await loginUser(app);

    const response = await request(app.getHttpServer())
      .put('/api/dashboard/layout')
      .set('Cookie', cookie)
      .send({
        widgets: [
          {
            id: 'invalid-1',
            title: 'Missing type',
            position: { x: 0, y: 0, w: 6, h: 3 },
          },
        ],
      })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });
});
