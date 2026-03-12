import { Module } from '@nestjs/common';

import { AnalyticsGenerator } from './generators/analytics.generator';
import { CustomersGenerator } from './generators/customers.generator';
import { OrdersGenerator } from './generators/orders.generator';
import { ProductsGenerator } from './generators/products.generator';
import { MockShopifyDataService } from './mock-shopify-data.service';
import { MockDataStoreModule } from './store/mock-data-store.module';

@Module({
  imports: [MockDataStoreModule],
  providers: [
    ProductsGenerator,
    CustomersGenerator,
    OrdersGenerator,
    AnalyticsGenerator,
    MockShopifyDataService,
  ],
  exports: [MockShopifyDataService, OrdersGenerator, AnalyticsGenerator],
})
export class MockShopifyDataModule {}
