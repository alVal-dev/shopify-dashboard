import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { buildSwaggerConfig } from './config/swagger.config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.enableCors({
    origin: ['https://shopify-dashboard-web.onrender.com'],
    credentials: true,
  });

  // Trust proxy : nécessaire pour que le throttler identifie la vraie IP client
  // derrière un reverse proxy (Render, Cloudflare, etc.)
  const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS || '0', 10);
  if (trustProxyHops > 0) {
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.set('trust proxy', trustProxyHops);
  }

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  if (nodeEnv !== 'production') {
    const swaggerConfig = buildSwaggerConfig();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`API listening on port ${port}`, 'Bootstrap');
}

bootstrap();
