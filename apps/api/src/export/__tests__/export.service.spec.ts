import { BadRequestException } from '@nestjs/common';

import { ExportService } from '../export.service';
import type { MockShopifyDataService } from '../../mock-shopify/mock-shopify-data.service';
import type { Customer, Order, Product } from '@shared/types';

describe('ExportService', () => {
  const sessionId = 'session-test-1';
  const now = new Date('2026-02-01T10:20:30.000Z');

  let getOrInitForSession: jest.Mock;
  let service: ExportService;

  beforeEach(() => {
    getOrInitForSession = jest.fn();

    const mockShopifyDataService = {
      getOrInitForSession,
    } as unknown as MockShopifyDataService;

    service = new ExportService(mockShopifyDataService);
  });

  function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
      id: 'order-1',
      orderNumber: 1001,
      customerId: 'customer-1',
      email: 'alice@example.com',
      customerName: 'Alice Martin',
      totalPriceCents: 12345,
      currency: 'EUR',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      lineItems: [
        {
          id: 'li-1',
          productId: 'product-1',
          variantId: 'variant-1',
          title: 'T-Shirt Classic — M',
          quantity: 2,
          unitPriceCents: 6172,
          sku: 'TS-000001',
        },
      ],
      shippingCity: 'Paris',
      shippingCountry: 'France',
      createdAt: '2026-01-15T12:34:56.000Z',
      ...overrides,
    };
  }

  function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: 'product-1',
      title: 'Classic T-Shirt Coton',
      vendor: 'Maison Parisienne',
      productType: 'T-Shirt',
      variants: [
        {
          id: 'variant-1',
          title: 'M',
          priceCents: 2999,
          sku: 'TS-000001',
          inventoryQuantity: 12,
        },
      ],
      imageUrl: 'https://placehold.co/400x400',
      totalInventory: 12,
      createdAt: '2026-01-10T08:09:10.000Z',
      ...overrides,
    };
  }

  function makeCustomer(overrides: Partial<Customer> = {}): Customer {
    return {
      id: 'customer-1',
      firstName: 'Alice',
      lastName: 'Martin',
      email: 'alice@example.com',
      ordersCount: 3,
      totalSpentCents: 98765,
      segment: 'returning',
      city: 'Lyon',
      country: 'France',
      createdAt: '2025-12-20T11:22:33.000Z',
      ...overrides,
    };
  }

  function makeSnapshot(params?: {
    orders?: Order[];
    products?: Product[];
    customers?: Customer[];
  }) {
    return {
      orders: params?.orders ?? [],
      products: params?.products ?? [],
      customers: params?.customers ?? [],
      analytics: {
        kpis: {
          revenueCents: 0,
          revenueChange: 0,
          ordersCount: 0,
          ordersCountChange: 0,
          averageOrderValueCents: 0,
          averageOrderValueChange: 0,
          customersCount: 0,
          customersCountChange: 0,
        },
        salesTrend: [],
        topProducts: [],
      },
      generatedAt: '2026-02-01T00:00:00.000Z',
    };
  }

  describe('generateCsv', () => {
    it('throws BadRequestException for unsupported export type', () => {
      expect(() => service.generateCsv('analytics', sessionId, now)).toThrow(BadRequestException);
    });

    it('uses MockShopifyDataService.getOrInitForSession with the provided sessionId', () => {
      getOrInitForSession.mockReturnValue(makeSnapshot());

      service.generateCsv('orders', sessionId, now);

      expect(getOrInitForSession).toHaveBeenCalledWith(sessionId);
      expect(getOrInitForSession).toHaveBeenCalledTimes(1);
    });

    it('generates orders CSV with BOM, CRLF, expected filename, headers and formatted values', () => {
      getOrInitForSession.mockReturnValue(
        makeSnapshot({
          orders: [makeOrder()],
        }),
      );

      const result = service.generateCsv('orders', sessionId, now);

      expect(result.filename).toBe('orders-2026-02-01.csv');
      expect(result.content.startsWith('\uFEFF')).toBe(true);
      expect(result.content.endsWith('\r\n')).toBe(true);

      const content = result.content.slice(1);
      const lines = content.split('\r\n').filter((line) => line.length > 0);

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe(
        'Order Number;Customer;Email;Total;Currency;Financial Status;Fulfillment Status;Items;City;Country;Date',
      );
      expect(lines[1]).toBe(
        '1001;Alice Martin;alice@example.com;123.45;EUR;paid;fulfilled;1;Paris;France;2026-01-15 12:34:56 UTC',
      );
    });

    it('generates products CSV with expected filename, headers and formatted values', () => {
      getOrInitForSession.mockReturnValue(
        makeSnapshot({
          products: [makeProduct()],
        }),
      );

      const result = service.generateCsv('products', sessionId, now);

      expect(result.filename).toBe('products-2026-02-01.csv');

      const content = result.content.slice(1);
      const lines = content.split('\r\n').filter((line) => line.length > 0);

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe('Title;Vendor;Type;Variants;Total Inventory;Created');
      expect(lines[1]).toBe(
        'Classic T-Shirt Coton;Maison Parisienne;T-Shirt;1;12;2026-01-10 08:09:10 UTC',
      );
    });

    it('generates customers CSV with expected filename, headers and formatted money values', () => {
      getOrInitForSession.mockReturnValue(
        makeSnapshot({
          customers: [makeCustomer()],
        }),
      );

      const result = service.generateCsv('customers', sessionId, now);

      expect(result.filename).toBe('customers-2026-02-01.csv');

      const content = result.content.slice(1);
      const lines = content.split('\r\n').filter((line) => line.length > 0);

      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe(
        'First Name;Last Name;Email;Orders;Total Spent;Segment;City;Country;Created',
      );
      expect(lines[1]).toBe(
        'Alice;Martin;alice@example.com;3;987.65;returning;Lyon;France;2025-12-20 11:22:33 UTC',
      );
    });

    it('quotes CSV cells containing a semicolon', () => {
      getOrInitForSession.mockReturnValue(
        makeSnapshot({
          customers: [makeCustomer({ city: 'Paris;Centre' })],
        }),
      );

      const result = service.generateCsv('customers', sessionId, now);
      const lines = result.content
        .slice(1)
        .split('\r\n')
        .filter((line) => line.length > 0);

      expect(lines[1]).toContain('"Paris;Centre"');
    });

    it('quotes CSV cells containing double quotes and escapes them by doubling', () => {
      getOrInitForSession.mockReturnValue(
        makeSnapshot({
          products: [makeProduct({ title: 'Pull "Premium"' })],
        }),
      );

      const result = service.generateCsv('products', sessionId, now);
      const lines = result.content
        .slice(1)
        .split('\r\n')
        .filter((line) => line.length > 0);

      expect(lines[1]).toContain('"Pull ""Premium"""');
    });

    it('quotes CSV cells containing line breaks', () => {
      getOrInitForSession.mockReturnValue(
        makeSnapshot({
          customers: [makeCustomer({ city: 'Paris\nCentre' })],
        }),
      );

      const result = service.generateCsv('customers', sessionId, now);

      expect(result.content).toContain('"Paris\nCentre"');
    });

    it('preserves invalid date values as-is in CSV output', () => {
      getOrInitForSession.mockReturnValue(
        makeSnapshot({
          products: [makeProduct({ createdAt: 'not-a-date' })],
        }),
      );

      const result = service.generateCsv('products', sessionId, now);
      const lines = result.content
        .slice(1)
        .split('\r\n')
        .filter((line) => line.length > 0);

      expect(lines[1]).toBe('Classic T-Shirt Coton;Maison Parisienne;T-Shirt;1;12;not-a-date');
    });
  });
});
