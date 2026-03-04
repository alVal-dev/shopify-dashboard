import { AnalyticsGenerator } from '../analytics.generator';
import type { Order, Product } from '@shared/types';

describe('AnalyticsGenerator', () => {
  let generator: AnalyticsGenerator;

  beforeEach(() => {
    generator = new AnalyticsGenerator();
  });

  it('computes KPIs, salesTrend and topProducts from real orders (paid - refunded)', () => {
    const now = new Date('2026-01-31T00:00:00.000Z');

    const products: Product[] = [
      {
        id: 'p1',
        title: 'T-Shirt Classic',
        vendor: 'Maison Parisienne',
        productType: 'T-Shirt',
        variants: [],
        imageUrl: 'https://placehold.co/400x400',
        totalInventory: 0,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      {
        id: 'p2',
        title: 'Pull Premium',
        vendor: 'Atelier Lyon',
        productType: 'Pull',
        variants: [],
        imageUrl: 'https://placehold.co/400x400',
        totalInventory: 0,
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ];

    const orders: Order[] = [
      // ── Current window (last 30 days): start = 2026-01-01, end = 2026-01-31 (exclusive)
      {
        id: 'o1',
        orderNumber: 1001,
        customerId: 'c1',
        email: 'c1@gmail.com',
        customerName: 'Client 1',
        totalPriceCents: 10_000,
        currency: 'EUR',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [
          {
            id: 'li1',
            productId: 'p1',
            variantId: 'v1',
            title: 'T-Shirt Classic — M',
            quantity: 2,
            unitPriceCents: 5_000,
            sku: 'TS-000001',
          },
        ],
        shippingCity: 'Paris',
        shippingCountry: 'France',
        createdAt: '2026-01-15T12:00:00.000Z',
      },
      {
        id: 'o2',
        orderNumber: 1002,
        customerId: 'c2',
        email: 'c2@gmail.com',
        customerName: 'Client 2',
        totalPriceCents: 2_000,
        currency: 'EUR',
        financialStatus: 'refunded',
        fulfillmentStatus: 'delivered',
        lineItems: [
          {
            id: 'li2',
            productId: 'p1',
            variantId: 'v1',
            title: 'T-Shirt Classic — M',
            quantity: 1,
            unitPriceCents: 2_000,
            sku: 'TS-000002',
          },
        ],
        shippingCity: 'Lyon',
        shippingCountry: 'France',
        createdAt: '2026-01-16T12:00:00.000Z',
      },
      {
        id: 'o3',
        orderNumber: 1003,
        customerId: 'c3',
        email: 'c3@gmail.com',
        customerName: 'Client 3',
        totalPriceCents: 3_000,
        currency: 'EUR',
        financialStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        lineItems: [
          {
            id: 'li3',
            productId: 'p2',
            variantId: 'v2',
            title: 'Pull Premium — M',
            quantity: 1,
            unitPriceCents: 3_000,
            sku: 'PU-000001',
          },
        ],
        shippingCity: 'Nice',
        shippingCountry: 'France',
        createdAt: '2026-01-20T12:00:00.000Z',
      },

      // ── Previous window (30-60 days ago): start = 2025-12-02, end = 2026-01-01 (exclusive)
      {
        id: 'o4',
        orderNumber: 900,
        customerId: 'c9',
        email: 'c9@gmail.com',
        customerName: 'Client 9',
        totalPriceCents: 4_000,
        currency: 'EUR',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [
          {
            id: 'li4',
            productId: 'p2',
            variantId: 'v2',
            title: 'Pull Premium — M',
            quantity: 1,
            unitPriceCents: 4_000,
            sku: 'PU-000010',
          },
        ],
        shippingCity: 'Nantes',
        shippingCountry: 'France',
        createdAt: '2025-12-15T12:00:00.000Z',
      },

      // ── Cancelled should not affect ordersCount/customersCount/revenue
      {
        id: 'o5',
        orderNumber: 901,
        customerId: 'c10',
        email: 'c10@gmail.com',
        customerName: 'Client 10',
        totalPriceCents: 9_999,
        currency: 'EUR',
        financialStatus: 'cancelled',
        fulfillmentStatus: 'unfulfilled',
        lineItems: [],
        shippingCity: 'Paris',
        shippingCountry: 'France',
        createdAt: '2026-01-10T12:00:00.000Z',
      },
    ];

    const snapshot = generator.compute(orders, products, {
      now,
      kpiWindowDays: 30,
      trendDays: 30,
      topProductsLimit: 5,
    });

    // ─── KPIs (current window) ────────────────────────────────
    // revenue = paid - refunded = 10000 - 2000 = 8000
    expect(snapshot.kpis.revenueCents).toBe(8_000);

    // previous revenue = 4000 => change = +100%
    expect(snapshot.kpis.revenueChange).toBe(100);

    // ordersCount excludes cancelled: current has paid+refunded+pending = 3
    expect(snapshot.kpis.ordersCount).toBe(3);

    // customersCount excludes cancelled: c1,c2,c3 => 3
    expect(snapshot.kpis.customersCount).toBe(3);

    // AOV paid-only: 10000 / 1 = 10000
    expect(snapshot.kpis.averageOrderValueCents).toBe(10_000);

    // ─── Trend ────────────────────────────────────────────────
    expect(snapshot.salesTrend).toHaveLength(30);
    expect(snapshot.salesTrend[snapshot.salesTrend.length - 1]!.date).toBe('2026-01-31');

    // Vérifie 2 jours clés (paid puis refunded)
    const d15 = snapshot.salesTrend.find((p) => p.date === '2026-01-15');
    const d16 = snapshot.salesTrend.find((p) => p.date === '2026-01-16');

    expect(d15).toBeTruthy();
    expect(d15!.revenueCents).toBe(10_000);
    expect(d15!.ordersCount).toBe(1);

    expect(d16).toBeTruthy();
    expect(d16!.revenueCents).toBe(-2_000);
    expect(d16!.ordersCount).toBe(1);

    // ─── Top products (paid only, current window) ─────────────
    expect(snapshot.topProducts.length).toBeGreaterThan(0);
    expect(snapshot.topProducts[0]!.productId).toBe('p1');
    expect(snapshot.topProducts[0]!.revenueCents).toBe(10_000);
    expect(snapshot.topProducts[0]!.unitsSold).toBe(2);
  });
});
