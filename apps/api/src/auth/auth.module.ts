import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { AuthGuard } from './auth.guard';
import { SessionCleanupService } from './session-cleanup.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionsService, AuthGuard, SessionCleanupService],
  exports: [AuthService, SessionsService, AuthGuard],
})
export class AuthModule {}