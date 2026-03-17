import { faker } from '@faker-js/faker';
import { CustomersGenerator } from '../customers.generator';

describe('CustomersGenerator', () => {
  let generator: CustomersGenerator;

  beforeEach(() => {
    faker.seed(12345);
    generator = new CustomersGenerator();
  });

  // ─── generateBatch API contract ────────────────────────────

  describe('generateBatch', () => {
    it('generates the requested number of customers', () => {
      const customers = generator.generateBatch({ count: 50 });
      expect(customers).toHaveLength(50);
    });

    it('returns empty array if count is 0', () => {
      const customers = generator.generateBatch({ count: 0 });
      expect(customers).toHaveLength(0);
    });

    it('returns empty array if count is negative', () => {
      const customers = generator.generateBatch({ count: -4 });
      expect(customers).toHaveLength(0);
    });

    it('returns customers sorted by createdAt oldest first', () => {
      const customers = generator.generateBatch({ count: 20 });

      for (let i = 1; i < customers.length; i++) {
        expect(customers[i - 1]!.createdAt <= customers[i]!.createdAt).toBe(true);
      }
    });

    it('keeps createdAt within the requested daysBack window', () => {
      const before = new Date();
      const daysBack = 14;

      const customers = generator.generateBatch({ count: 20, daysBack });

      const after = new Date();
      const min = before.getTime() - daysBack * 24 * 60 * 60 * 1000;
      const max = after.getTime();

      for (const customer of customers) {
        const createdAt = new Date(customer.createdAt).getTime();
        expect(createdAt).toBeGreaterThanOrEqual(min);
        expect(createdAt).toBeLessThanOrEqual(max);
      }
    });
  });

  // ─── Customer data integrity ───────────────────────────────

  describe('customer data integrity', () => {
    it('has unique customer IDs', () => {
      const customers = generator.generateBatch({ count: 80 });
      const ids = customers.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('has unique emails', () => {
      const customers = generator.generateBatch({ count: 80 });
      const emails = customers.map((c) => c.email);
      expect(new Set(emails).size).toBe(emails.length);
    });

    it('has valid email format', () => {
      const customers = generator.generateBatch({ count: 50 });
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (const customer of customers) {
        expect(customer.email).toMatch(emailRegex);
      }
    });

    it('has valid email domains', () => {
      const customers = generator.generateBatch({ count: 50 });
      const validDomains = ['gmail.com', 'outlook.fr', 'yahoo.fr', 'orange.fr', 'free.fr'];

      for (const customer of customers) {
        const domain = customer.email.split('@')[1];
        expect(validDomains).toContain(domain);
      }
    });

    it('initializes with ordersCount 0', () => {
      const customers = generator.generateBatch({ count: 20 });

      for (const customer of customers) {
        expect(customer.ordersCount).toBe(0);
      }
    });

    it('initializes with totalSpentCents 0', () => {
      const customers = generator.generateBatch({ count: 20 });

      for (const customer of customers) {
        expect(customer.totalSpentCents).toBe(0);
      }
    });

    it('initializes with segment new', () => {
      const customers = generator.generateBatch({ count: 20 });

      for (const customer of customers) {
        expect(customer.segment).toBe('new');
      }
    });

    it('has country France', () => {
      const customers = generator.generateBatch({ count: 20 });

      for (const customer of customers) {
        expect(customer.country).toBe('France');
      }
    });

    it('has non-empty names', () => {
      const customers = generator.generateBatch({ count: 20 });

      for (const customer of customers) {
        expect(customer.firstName.length).toBeGreaterThan(0);
        expect(customer.lastName.length).toBeGreaterThan(0);
      }
    });

    it('has non-empty city', () => {
      const customers = generator.generateBatch({ count: 20 });

      for (const customer of customers) {
        expect(customer.city.length).toBeGreaterThan(0);
      }
    });

    it('normalizes email local part to lowercase ASCII letters', () => {
      const customers = generator.generateBatch({ count: 100 });

      for (const customer of customers) {
        const localPart = customer.email.split('@')[0]!;
        expect(localPart).toMatch(/^[a-z.0-9]+$/);
      }
    });
  });

  // ─── recalculateSegments ───────────────────────────────────

  describe('recalculateSegments', () => {
    it('assigns new for 0-1 orders', () => {
      const customers = generator.generateBatch({ count: 2 });
      customers[0]!.ordersCount = 0;
      customers[1]!.ordersCount = 1;

      generator.recalculateSegments(customers);

      expect(customers[0]!.segment).toBe('new');
      expect(customers[1]!.segment).toBe('new');
    });

    it('assigns returning for 2-4 orders', () => {
      const customers = generator.generateBatch({ count: 2 });
      customers[0]!.ordersCount = 2;
      customers[1]!.ordersCount = 4;

      generator.recalculateSegments(customers);

      expect(customers[0]!.segment).toBe('returning');
      expect(customers[1]!.segment).toBe('returning');
    });

    it('assigns vip for 5+ orders', () => {
      const customers = generator.generateBatch({ count: 2 });
      customers[0]!.ordersCount = 5;
      customers[1]!.ordersCount = 10;

      generator.recalculateSegments(customers);

      expect(customers[0]!.segment).toBe('vip');
      expect(customers[1]!.segment).toBe('vip');
    });
  });
});
