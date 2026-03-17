import request from 'supertest';
import { INestApplication } from '@nestjs/common';

import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  loginUser,
  seedTestUsers,
} from './helpers/test-app';
import { PrismaService } from '../prisma/prisma.service';

describe('Export integration', () => {
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

  it('GET /api/export/orders returns 401 without auth', async () => {
    await request(app.getHttpServer()).get('/api/export/orders').expect(401);
  });

  it('GET /api/export/orders returns CSV with download headers and BOM when authenticated', async () => {
    const cookie = await loginUser(app);

    const response = await request(app.getHttpServer())
      .get('/api/export/orders')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="orders-\d{4}-\d{2}-\d{2}\.csv"$/,
    );

    const bodyText =
      typeof response.text === 'string' && response.text.length > 0
        ? response.text
        : Buffer.from(response.body).toString('utf8');

    expect(bodyText.startsWith('\uFEFF')).toBe(true);
    expect(bodyText.length).toBeGreaterThan(0);
  });

  it('GET /api/export/products returns CSV with the expected filename when authenticated', async () => {
    const cookie = await loginUser(app);

    const response = await request(app.getHttpServer())
      .get('/api/export/products')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="products-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
  });

  it('GET /api/export/customers returns CSV with the expected filename when authenticated', async () => {
    const cookie = await loginUser(app);

    const response = await request(app.getHttpServer())
      .get('/api/export/customers')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv; charset=utf-8');
    expect(response.headers['content-disposition']).toMatch(
      /^attachment; filename="customers-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
  });

  it('GET /api/export/unknown returns 400 for unsupported export type', async () => {
    const cookie = await loginUser(app);

    await request(app.getHttpServer()).get('/api/export/unknown').set('Cookie', cookie).expect(400);
  });
});
