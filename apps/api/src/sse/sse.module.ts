import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SseController } from './sse.controller';
import { SseSessionRegistryService } from './sse-session-registry.service';

@Module({
  imports: [AuthModule],
  controllers: [SseController],
  providers: [SseSessionRegistryService],
  exports: [SseSessionRegistryService],
})
export class SseModule {}
