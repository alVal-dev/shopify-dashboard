import { Injectable } from '@nestjs/common';

import type { KpiMetrics, Order, Product, SalesTrend, TopProduct } from '@shared/types';

export interface ComputeAnalyticsOptions {
  now?: Date;
  kpiWindowDays?: number; // default 30
  trendDays?: number; // default 30 (includes today)
  topProductsLimit?: number; // default 5
}

export interface AnalyticsSnapshot {
  kpis: KpiMetrics;
  salesTrend: SalesTrend;
  topProducts: TopProduct[];
}

@Injectable()
export class AnalyticsGenerator {
  compute(
    orders: Order[],
    products: Product[],
    options: ComputeAnalyticsOptions = {},
  ): AnalyticsSnapshot {
    const { now = new Date(), kpiWindowDays = 30, trendDays = 30, topProductsLimit = 5 } = options;

    const currentEnd = now;
    const currentStart = this.addDays(currentEnd, -kpiWindowDays);
    const previousEnd = currentStart;
    const previousStart = this.addDays(previousEnd, -kpiWindowDays);

    const currentOrders = orders.filter((o) =>
      this.isInRange(new Date(o.createdAt), currentStart, currentEnd),
    );
    const previousOrders = orders.filter((o) =>
      this.isInRange(new Date(o.createdAt), previousStart, previousEnd),
    );

    const current = this.computeWindowStats(currentOrders);
    const previous = this.computeWindowStats(previousOrders);

    const kpis: KpiMetrics = {
      revenueCents: current.revenueCents,
      revenueChange: this.percentChange(current.revenueCents, previous.revenueCents),
      ordersCount: current.ordersCount,
      ordersCountChange: this.percentChange(current.ordersCount, previous.ordersCount),
      averageOrderValueCents: current.averageOrderValueCents,
      averageOrderValueChange: this.percentChange(
        current.averageOrderValueCents,
        previous.averageOrderValueCents,
      ),
      customersCount: current.customersCount,
      customersCountChange: this.percentChange(current.customersCount, previous.customersCount),
    };

    const salesTrend = this.computeSalesTrend(orders, now, trendDays);
    const topProducts = this.computeTopProducts(
      orders,
      products,
      currentStart,
      currentEnd,
      topProductsLimit,
    );

    return { kpis, salesTrend, topProducts };
  }

  // ─── Window stats ──────────────────────────────────────────

  private computeWindowStats(orders: Order[]): {
    revenueCents: number;
    ordersCount: number;
    customersCount: number;
    averageOrderValueCents: number;
  } {
    let revenueCents = 0;
    let ordersCount = 0;
    let paidOrdersCount = 0;
    let paidRevenueCents = 0;
    const customerIds = new Set<string>();

    for (const o of orders) {
      if (o.financialStatus === 'cancelled') {
        continue;
      }

      ordersCount += 1;
      customerIds.add(o.customerId);

      if (o.financialStatus === 'paid') {
        revenueCents += o.totalPriceCents;
        paidRevenueCents += o.totalPriceCents;
        paidOrdersCount += 1;
      } else if (o.financialStatus === 'refunded') {
        revenueCents -= o.totalPriceCents;
      }
    }

    const averageOrderValueCents =
      paidOrdersCount === 0 ? 0 : Math.round(paidRevenueCents / paidOrdersCount);

    return {
      revenueCents,
      ordersCount,
      customersCount: customerIds.size,
      averageOrderValueCents,
    };
  }

  // ─── Trend ─────────────────────────────────────────────────

  private computeSalesTrend(orders: Order[], now: Date, trendDays: number): SalesTrend {
    if (trendDays <= 0) {
      return [];
    }

    const buckets = new Map<string, { revenueCents: number; ordersCount: number }>();
    const orderedKeys: string[] = [];

    for (let offset = trendDays - 1; offset >= 0; offset--) {
      const key = this.toDateKey(this.addDays(now, -offset));
      orderedKeys.push(key);
      buckets.set(key, { revenueCents: 0, ordersCount: 0 });
    }

    for (const o of orders) {
      const key = this.toDateKey(new Date(o.createdAt));
      const bucket = buckets.get(key);
      if (!bucket) {
        continue;
      }

      if (o.financialStatus === 'cancelled') {
        continue;
      }

      bucket.ordersCount += 1;

      if (o.financialStatus === 'paid') {
        bucket.revenueCents += o.totalPriceCents;
      } else if (o.financialStatus === 'refunded') {
        bucket.revenueCents -= o.totalPriceCents;
      }
    }

    return orderedKeys.map((date) => {
      const v = buckets.get(date)!;
      return {
        date,
        revenueCents: v.revenueCents,
        ordersCount: v.ordersCount,
      };
    });
  }

  // ─── Top products ──────────────────────────────────────────

  private computeTopProducts(
    orders: Order[],
    products: Product[],
    start: Date,
    end: Date,
    limit: number,
  ): TopProduct[] {
    const productTitleById = new Map(products.map((p) => [p.id, p.title]));
    const stats = new Map<string, { revenueCents: number; unitsSold: number; title: string }>();

    for (const o of orders) {
      const d = new Date(o.createdAt);
      if (!this.isInRange(d, start, end)) {
        continue;
      }
      if (o.financialStatus !== 'paid') {
        continue;
      }

      for (const li of o.lineItems) {
        const revenue = li.unitPriceCents * li.quantity;
        const existing = stats.get(li.productId);

        if (existing) {
          existing.revenueCents += revenue;
          existing.unitsSold += li.quantity;
        } else {
          stats.set(li.productId, {
            revenueCents: revenue,
            unitsSold: li.quantity,
            title: productTitleById.get(li.productId) ?? li.title,
          });
        }
      }
    }

    const topProducts: TopProduct[] = [];
    for (const [productId, v] of stats.entries()) {
      topProducts.push({
        productId,
        title: v.title,
        revenueCents: v.revenueCents,
        unitsSold: v.unitsSold,
      });
    }

    topProducts.sort((a, b) => b.revenueCents - a.revenueCents);
    return topProducts.slice(0, limit);
  }

  // ─── Utils ─────────────────────────────────────────────────

  private percentChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  private isInRange(d: Date, start: Date, end: Date): boolean {
    return d.getTime() >= start.getTime() && d.getTime() < end.getTime();
  }

  private toDateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private addDays(d: Date, days: number): Date {
    return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
  }
}
