import request from 'supertest';
import { INestApplication } from '@nestjs/common';

import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  loginDemo,
  loginUser,
  seedTestUsers,
  TEST_USERS,
} from './helpers/test-app';
import { PrismaService } from '../prisma/prisma.service';

describe('Auth integration', () => {
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

  it('POST /api/auth/demo returns 200, sets session cookie and creates session in DB', async () => {
    const response = await request(app.getHttpServer()).post('/api/auth/demo').expect(200);

    expect(response.body.data).toMatchObject({
      email: TEST_USERS.demoEmail,
      role: 'demo',
    });

    const rawSetCookie = response.headers['set-cookie'];
    const setCookie = Array.isArray(rawSetCookie)
      ? rawSetCookie
      : typeof rawSetCookie === 'string'
        ? [rawSetCookie]
        : undefined;
    expect(setCookie).toBeDefined();
    expect(setCookie?.some((value) => value.startsWith('sessionId='))).toBe(true);
    expect(setCookie?.some((value) => /HttpOnly/i.test(value))).toBe(true);

    const sessions = await prisma.client.session.findMany({
      include: { user: true },
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.user.email).toBe(TEST_USERS.demoEmail);
  });

  it('POST /api/auth/login returns 200, sets cookie and returns standard user for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.userEmail,
        password: TEST_USERS.userPassword,
      })
      .expect(200);

    expect(response.body.data).toMatchObject({
      email: TEST_USERS.userEmail,
      role: 'user',
    });

    const rawSetCookie = response.headers['set-cookie'];
    const setCookie = Array.isArray(rawSetCookie)
      ? rawSetCookie
      : typeof rawSetCookie === 'string'
        ? [rawSetCookie]
        : undefined;
    expect(setCookie).toBeDefined();
    expect(setCookie?.some((value) => value.startsWith('sessionId='))).toBe(true);
  });

  it('POST /api/auth/login returns 401 for invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: TEST_USERS.userEmail,
        password: 'wrong-password',
      })
      .expect(401);
  });

  it('POST /api/auth/login returns 400 for invalid body', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'not-an-email',
        password: '123',
      })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(Array.isArray(response.body.message)).toBe(true);
  });

  it('GET /api/auth/me returns 200 for a valid session cookie', async () => {
    const cookie = await loginUser(app);

    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toMatchObject({
      email: TEST_USERS.userEmail,
      role: 'user',
    });
  });

  it('GET /api/auth/me returns 401 without cookie', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me returns 401 for an invalid session cookie', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', 'sessionId=does-not-exist')
      .expect(401);
  });

  it('GET /api/auth/me returns 401 for an expired session and lazy deletes it', async () => {
    const user = await prisma.client.user.findUniqueOrThrow({
      where: { email: TEST_USERS.userEmail },
    });

    await prisma.client.session.create({
      data: {
        sessionId: 'expired-session-id',
        userId: user.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', 'sessionId=expired-session-id')
      .expect(401);

    const session = await prisma.client.session.findUnique({
      where: { sessionId: 'expired-session-id' },
    });

    expect(session).toBeNull();
  });

  it('POST /api/auth/logout returns 200, clears cookie and deletes the session', async () => {
    const cookie = await loginUser(app);

    const sessionBefore = await prisma.client.session.findFirst();
    expect(sessionBefore).not.toBeNull();

    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({
      data: { ok: true },
    });

    const rawSetCookie = response.headers['set-cookie'];
    const setCookie = Array.isArray(rawSetCookie)
      ? rawSetCookie
      : typeof rawSetCookie === 'string'
        ? [rawSetCookie]
        : undefined;
    expect(setCookie).toBeDefined();
    expect(setCookie?.some((value) => value.startsWith('sessionId='))).toBe(true);

    const sessionsAfter = await prisma.client.session.findMany();
    expect(sessionsAfter).toHaveLength(0);
  });

  it('GET /api/auth/me returns 401 after logout', async () => {
    const cookie = await loginDemo(app);

    await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', cookie).expect(200);

    await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookie).expect(401);
  });
});
