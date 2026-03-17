import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
process.env.NODE_ENV = 'development';
process.env.DATABASE_URL ??=
  'postgresql://dashboard:dashboard_dev_password@localhost:5432/shopify_dashboard';
process.env.TRUST_PROXY_HOPS = '1';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../common/filters/all-exceptions.filter';
import { PrismaService } from '../../prisma/prisma.service';

export interface TestAppContext {
  app: INestApplication;
  prisma: PrismaService;
}

const DEMO_EMAIL = 'demo@shopify-dashboard.com';
const USER_EMAIL = 'john@example.com';
const USER_PASSWORD = 'password123';

export async function createTestApp(): Promise<TestAppContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS || '0', 10);
  if (trustProxyHops > 0) {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', trustProxyHops);
  }

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  await app.close();
}

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.client.dashboardLayout.deleteMany();
  await prisma.client.session.deleteMany();
  await prisma.client.user.deleteMany({
    where: {
      email: {
        in: [DEMO_EMAIL, USER_EMAIL],
      },
    },
  });
}

export async function seedTestUsers(prisma: PrismaService): Promise<void> {
  await prisma.client.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { role: 'DEMO', password: null },
    create: {
      email: DEMO_EMAIL,
      role: 'DEMO',
      password: null,
    },
  });

  const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);

  await prisma.client.user.upsert({
    where: { email: USER_EMAIL },
    update: { role: 'USER', password: hashedPassword },
    create: {
      email: USER_EMAIL,
      role: 'USER',
      password: hashedPassword,
    },
  });
}

function extractSessionCookie(setCookieHeader: unknown): string {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : typeof setCookieHeader === 'string'
      ? [setCookieHeader]
      : [];

  if (cookies.length === 0) {
    throw new Error('Expected Set-Cookie header but none was found');
  }

  const sessionCookie = cookies.find((value) => value.startsWith('sessionId='));
  if (!sessionCookie) {
    throw new Error('Expected sessionId cookie but none was found');
  }

  return sessionCookie.split(';')[0]!;
}

export async function loginDemo(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer()).post('/api/auth/demo');

  return extractSessionCookie(response.headers['set-cookie']);
}

export async function loginUser(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer()).post('/api/auth/login').send({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });

  return extractSessionCookie(response.headers['set-cookie']);
}

export const TEST_USERS = {
  demoEmail: DEMO_EMAIL,
  userEmail: USER_EMAIL,
  userPassword: USER_PASSWORD,
};
