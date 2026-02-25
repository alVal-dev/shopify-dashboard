import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { AuthGuard } from './auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionsService, AuthGuard],
  exports: [AuthService, SessionsService, AuthGuard],
})
export class AuthModule {}