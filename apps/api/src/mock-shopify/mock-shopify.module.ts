import { Module } from '@nestjs/common';

import { AnalyticsController } from './controllers/analytics.controller';
import { CustomersController } from './controllers/customers.controller';
import { OrdersController } from './controllers/orders.controller';
import { ProductsController } from './controllers/products.controller';
import { MockShopifyDataModule } from './mock-shopify-data.module';

@Module({
  imports: [MockShopifyDataModule],
  controllers: [OrdersController, ProductsController, CustomersController, AnalyticsController],
})
export class MockShopifyModule {}
