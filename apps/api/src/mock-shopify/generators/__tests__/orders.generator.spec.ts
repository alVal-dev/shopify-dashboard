import { faker } from '@faker-js/faker';
import { OrdersGenerator } from '../orders.generator';
import { ProductsGenerator } from '../products.generator';
import { CustomersGenerator } from '../customers.generator';
import type { Product, Customer } from '@shared/types';

// ─── Fixtures ────────────────────────────────────────────────

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: faker.string.uuid(),
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@gmail.com',
    ordersCount: 0,
    totalSpentCents: 0,
    segment: 'new',
    city: 'Paris',
    country: 'France',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeProduct(inventoryQuantity = 100): Product {
  return {
    id: faker.string.uuid(),
    title: 'T-Shirt Classic',
    vendor: 'Maison Parisienne',
    productType: 'T-Shirt',
    imageUrl: 'https://placehold.co/400x400',
    createdAt: new Date().toISOString(),
    variants: [
      {
        id: faker.string.uuid(),
        title: 'M',
        priceCents: 3000,
        sku: `TS-${faker.string.alphanumeric(6)}`,
        inventoryQuantity,
      },
    ],
    totalInventory: inventoryQuantity,
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('OrdersGenerator', () => {
  let ordersGenerator: OrdersGenerator;

  beforeEach(() => {
    faker.seed(12345);
    ordersGenerator = new OrdersGenerator();
  });

  // ─── generateBatch API contract ────────────────────────────

  describe('generateBatch', () => {
    let products: Product[];
    let customers: Customer[];

    beforeEach(() => {
      const productsGenerator = new ProductsGenerator();
      const customersGenerator = new CustomersGenerator();
      products = productsGenerator.generateBatch({ count: 10 });
      customers = customersGenerator.generateBatch({ count: 20 });
    });

    it('generates the requested number of orders', () => {
      const orders = ordersGenerator.generateBatch({
        products,
        customers,
        count: 50,
      });

      expect(orders).toHaveLength(50);
    });

    it('throws if products array is empty', () => {
      expect(() =>
        ordersGenerator.generateBatch({
          products: [],
          customers,
          count: 10,
        }),
      ).toThrow('products is empty');
    });

    it('throws if customers array is empty', () => {
      expect(() =>
        ordersGenerator.generateBatch({
          products,
          customers: [],
          count: 10,
        }),
      ).toThrow('customers is empty');
    });

    it('returns empty array if count is 0', () => {
      const orders = ordersGenerator.generateBatch({
        products,
        customers,
        count: 0,
      });

      expect(orders).toHaveLength(0);
    });

    it('assigns sequential order numbers in chronological order', () => {
      const orders = ordersGenerator.generateBatch({
        products,
        customers,
        count: 20,
        startingOrderNumber: 1001,
      });

      const sortedChronologically = [...orders].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );

      for (let i = 0; i < sortedChronologically.length; i++) {
        expect(sortedChronologically[i]!.orderNumber).toBe(1001 + i);
      }
    });

    it('returns orders sorted most recent first', () => {
      const orders = ordersGenerator.generateBatch({
        products,
        customers,
        count: 20,
      });

      for (let i = 1; i < orders.length; i++) {
        expect(orders[i - 1]!.createdAt >= orders[i]!.createdAt).toBe(true);
      }
    });
  });

  // ─── Order data integrity ──────────────────────────────────

  describe('order data integrity', () => {
    it('computes totalPriceCents from line items', () => {
      const products = [makeProduct(100)];
      const customers = [makeCustomer()];

      const order = ordersGenerator.generateOne({
        products,
        customers,
        currency: 'EUR',
        orderNumber: 1001,
      });

      expect(order).not.toBeNull();
      const expected = order!.lineItems.reduce(
        (sum, li) => sum + li.unitPriceCents * li.quantity,
        0,
      );
      expect(order!.totalPriceCents).toBe(expected);
    });

    it('references valid customer and product IDs', () => {
      const products = [makeProduct(100)];
      const customers = [makeCustomer()];

      const order = ordersGenerator.generateOne({
        products,
        customers,
        currency: 'EUR',
        orderNumber: 1001,
      });

      expect(order).not.toBeNull();
      expect(order!.customerId).toBe(customers[0]!.id);
      for (const li of order!.lineItems) {
        expect(li.productId).toBe(products[0]!.id);
      }
    });

    it('has currency EUR and shippingCountry France', () => {
      const products = [makeProduct(100)];
      const customers = [makeCustomer()];

      const order = ordersGenerator.generateOne({
        products,
        customers,
        currency: 'EUR',
        orderNumber: 1001,
      });

      expect(order).not.toBeNull();
      expect(order!.currency).toBe('EUR');
      expect(order!.shippingCountry).toBe('France');
    });

    it('all amounts are positive', () => {
      const products = [makeProduct(100)];
      const customers = [makeCustomer()];

      const order = ordersGenerator.generateOne({
        products,
        customers,
        currency: 'EUR',
        orderNumber: 1001,
      });

      expect(order).not.toBeNull();
      expect(order!.totalPriceCents).toBeGreaterThan(0);
      for (const li of order!.lineItems) {
        expect(li.unitPriceCents).toBeGreaterThan(0);
        expect(li.quantity).toBeGreaterThan(0);
      }
    });
  });

  // ─── Stock management ──────────────────────────────────────

  describe('stock management', () => {
    it('decrements stock correctly for paid and pending orders', () => {
      const initialInventory = 200;
      const products = [makeProduct(initialInventory)];
      const customers = [makeCustomer()];

      const orders = ordersGenerator.generateBatch({
        products,
        customers,
        count: 30,
      });

      // Calculate expected stock decrease from paid/pending orders
      let soldUnits = 0;
      for (const order of orders) {
        if (order.financialStatus === 'paid' || order.financialStatus === 'pending') {
          for (const li of order.lineItems) {
            soldUnits += li.quantity;
          }
        }
      }

      const expectedInventory = initialInventory - soldUnits;
      expect(products[0]!.totalInventory).toBe(expectedInventory);
    });

    it('never creates negative stock', () => {
      const products = [makeProduct(50)];
      const customers = [makeCustomer()];

      ordersGenerator.generateBatch({
        products,
        customers,
        count: 30,
      });

      expect(products[0]!.totalInventory).toBeGreaterThanOrEqual(0);
      for (const variant of products[0]!.variants) {
        expect(variant.inventoryQuantity).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ─── Customer stats ────────────────────────────────────────

  describe('customer stats', () => {
    it('increments ordersCount for non-cancelled orders', () => {
      const products = [makeProduct(200)];
      const customers = [makeCustomer()];

      const orders = ordersGenerator.generateBatch({
        products,
        customers,
        count: 50,
      });

      const nonCancelled = orders.filter((o) => o.financialStatus !== 'cancelled').length;

      expect(customers[0]!.ordersCount).toBe(nonCancelled);
    });

    it('updates totalSpentCents correctly (paid - refunded)', () => {
      const products = [makeProduct(500)];
      const customers = [makeCustomer()];

      const orders = ordersGenerator.generateBatch({
        products,
        customers,
        count: 100,
      });

      let expectedSpent = 0;
      for (const order of orders) {
        if (order.financialStatus === 'paid') {
          expectedSpent += order.totalPriceCents;
        } else if (order.financialStatus === 'refunded') {
          expectedSpent -= order.totalPriceCents;
        }
      }
      expectedSpent = Math.max(0, expectedSpent);

      expect(customers[0]!.totalSpentCents).toBe(expectedSpent);
    });
  });

  // ─── Status coherence ──────────────────────────────────────

  describe('status coherence', () => {
    it('cancelled orders are always unfulfilled', () => {
      const products = [makeProduct(500)];
      const customers = [makeCustomer()];

      const orders = ordersGenerator.generateBatch({
        products,
        customers,
        count: 200,
      });

      const cancelled = orders.filter((o) => o.financialStatus === 'cancelled');
      for (const order of cancelled) {
        expect(order.fulfillmentStatus).toBe('unfulfilled');
      }
    });

    it('has valid financial and fulfillment statuses', () => {
      const products = [makeProduct(500)];
      const customers = [makeCustomer()];

      const orders = ordersGenerator.generateBatch({
        products,
        customers,
        count: 100,
      });

      const validFinancial = ['pending', 'paid', 'refunded', 'cancelled'];
      const validFulfillment = ['unfulfilled', 'partial', 'fulfilled', 'shipped', 'delivered'];

      for (const order of orders) {
        expect(validFinancial).toContain(order.financialStatus);
        expect(validFulfillment).toContain(order.fulfillmentStatus);
      }
    });
  });
});
