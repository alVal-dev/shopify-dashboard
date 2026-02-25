import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { validate } from './config/env.validation';
import { getLoggerConfig } from './config/logger.config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,    // 60 secondes
        limit: 300,     // 300 requêtes max
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
