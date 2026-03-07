import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { LayoutSaveRateLimitGuard } from './layout-save-rate-limit.guard';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, LayoutSaveRateLimitGuard],
})
export class DashboardModule {}
