import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AnalyticsController } from './controllers/analytics.controller';
import { CustomersController } from './controllers/customers.controller';
import { OrdersController } from './controllers/orders.controller';
import { ProductsController } from './controllers/products.controller';
import { MockShopifyDataModule } from './mock-shopify-data.module';

@Module({
  imports: [MockShopifyDataModule, AuthModule],
  controllers: [OrdersController, ProductsController, CustomersController, AnalyticsController],
})
export class MockShopifyModule {}
