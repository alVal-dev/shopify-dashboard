import { Injectable, Logger } from '@nestjs/common';

import { AnalyticsGenerator } from './generators/analytics.generator';
import { CustomersGenerator } from './generators/customers.generator';
import { OrdersGenerator } from './generators/orders.generator';
import { ProductsGenerator } from './generators/products.generator';
import { MockDataStore, type MockShopifySnapshot } from './store/mock-data.store';

@Injectable()
export class MockShopifyDataService {
  private readonly logger = new Logger(MockShopifyDataService.name);

  constructor(
    private readonly productsGenerator: ProductsGenerator,
    private readonly customersGenerator: CustomersGenerator,
    private readonly ordersGenerator: OrdersGenerator,
    private readonly analyticsGenerator: AnalyticsGenerator,
    private readonly store: MockDataStore,
  ) {}

  initForSession(sessionId: string): MockShopifySnapshot {
    const snapshot = this.generateSnapshot();
    this.store.set(sessionId, snapshot);
    this.logger.log(`Mock dataset initialized. storeSize=${this.store.size()}`);
    return snapshot;
  }

  getOrInitForSession(sessionId: string): MockShopifySnapshot {
    const existing = this.store.get(sessionId);
    if (existing) return existing;

    this.logger.warn('Mock dataset missing for session; regenerating (fallback).');
    return this.initForSession(sessionId);
  }

  clearForSession(sessionId: string): void {
    this.store.delete(sessionId);
  }

  clearForSessions(sessionIds: Iterable<string>): number {
    return this.store.deleteMany(sessionIds);
  }

  update(sessionId: string, updater: (snapshot: MockShopifySnapshot) => void): MockShopifySnapshot {
    return this.store.update(sessionId, updater);
  }

  private generateSnapshot(): MockShopifySnapshot {
    const products = this.productsGenerator.generateBatch();
    const customers = this.customersGenerator.generateBatch();

    const orders = this.ordersGenerator.generateBatch({ products, customers });

    this.customersGenerator.recalculateSegments(customers);

    const analytics = this.analyticsGenerator.compute(orders, products);

    return {
      products,
      customers,
      orders,
      analytics,
      generatedAt: new Date().toISOString(),
    };
  }
}
