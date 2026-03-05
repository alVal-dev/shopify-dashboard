import { Injectable } from '@nestjs/common';
import type { AnalyticsSnapshot, Customer, Order, Product } from '@shared/types';

export interface MockShopifySnapshot {
  products: Product[];
  customers: Customer[];
  orders: Order[];
  analytics: AnalyticsSnapshot;
  generatedAt: string; // ISO
}

/**
 * In-memory store keyed by sessionId.
 * Pure storage: pas de règle métier, pas de générateurs.
 */
@Injectable()
export class MockDataStore {
  private readonly store = new Map<string, MockShopifySnapshot>();

  get(sessionId: string): MockShopifySnapshot | undefined {
    return this.store.get(sessionId);
  }

  set(sessionId: string, snapshot: MockShopifySnapshot): void {
    this.store.set(sessionId, snapshot);
  }

  has(sessionId: string): boolean {
    return this.store.has(sessionId);
  }

  delete(sessionId: string): boolean {
    return this.store.delete(sessionId);
  }

  deleteMany(sessionIds: Iterable<string>): number {
    let deleted = 0;
    for (const id of sessionIds) {
      if (this.store.delete(id)) deleted += 1;
    }
    return deleted;
  }

  size(): number {
    return this.store.size;
  }

  /**
   * Mutation d'entrypoint centralisés.
   */
  update(sessionId: string, updater: (snapshot: MockShopifySnapshot) => void): MockShopifySnapshot {
    const snapshot = this.store.get(sessionId);
    if (!snapshot) {
      throw new Error('MockDataStore.update: snapshot not found for sessionId');
    }

    updater(snapshot);
    // snapshot peut avoir été modifié. on conserve la référence stockée.
    this.store.set(sessionId, snapshot);
    return snapshot;
  }
}
