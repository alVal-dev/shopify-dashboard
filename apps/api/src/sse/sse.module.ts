import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MockShopifyDataModule } from '../mock-shopify/mock-shopify-data.module';
import { SseController } from './sse.controller';
import { SseRealtimeSimulationService } from './sse-realtime-simulation.service';
import { SseSessionRegistryService } from './sse-session-registry.service';

@Module({
  imports: [AuthModule, MockShopifyDataModule],
  controllers: [SseController],
  providers: [SseSessionRegistryService, SseRealtimeSimulationService],
  exports: [SseSessionRegistryService, SseRealtimeSimulationService],
})
export class SseModule {}
