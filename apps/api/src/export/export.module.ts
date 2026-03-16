import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { MockShopifyDataModule } from '../mock-shopify/mock-shopify-data.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [MockShopifyDataModule, AuthModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
