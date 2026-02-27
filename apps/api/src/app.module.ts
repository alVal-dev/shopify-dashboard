import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validate } from './config/env.validation';
import { getLoggerConfig } from './config/logger.config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import type { Response } from 'express';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web', 'dist'),
      exclude: ['/api{/*path}'],
      serveStaticOptions: {
        setHeaders: (res: Response, filePath: string) => {
          const p = filePath.replace(/\\/g, '/');

          // 1) index.html: toujours revalider (évite index stale qui référence de vieux assets hashés)
          if (p.endsWith('/index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
            return;
          }

          // 2) Assets Vite hashés: cache long + immutable
          if (p.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return;
          }

          // 3) Favicon (non hashé, mais change rarement) : cache modéré
          if (p.endsWith('/favicon.ico')) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h
            return;
          }

          // 4) Autres fichiers (safe default)
          res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h
        },
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 60 secondes
        limit: 300, // 300 requêtes max
      },
    ]),

    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        return getLoggerConfig(nodeEnv);
      },
    }),

    ScheduleModule.forRoot(),

    HealthModule,
    PrismaModule,
    AuthModule,
  ],
  providers: [
    // Appliqué sur TOUTES les routes avant les autres guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
