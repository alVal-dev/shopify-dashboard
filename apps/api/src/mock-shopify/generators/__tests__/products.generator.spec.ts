import { faker } from '@faker-js/faker';
import { ProductsGenerator } from '../products.generator';

describe('ProductsGenerator', () => {
  let generator: ProductsGenerator;

  beforeEach(() => {
    faker.seed(12345);
    generator = new ProductsGenerator();
  });

  // ─── generateBatch API contract ────────────────────────────

  describe('generateBatch', () => {
    it('generates the requested number of products', () => {
      const products = generator.generateBatch({ count: 15 });
      expect(products).toHaveLength(15);
    });

    it('returns empty array if count is 0', () => {
      const products = generator.generateBatch({ count: 0 });
      expect(products).toHaveLength(0);
    });

    it('returns products sorted by createdAt oldest first', () => {
      const products = generator.generateBatch({ count: 20 });

      for (let i = 1; i < products.length; i++) {
        expect(products[i - 1]!.createdAt <= products[i]!.createdAt).toBe(true);
      }
    });
  });

  // ─── Product data integrity ────────────────────────────────

  describe('product data integrity', () => {
    it('has unique product IDs', () => {
      const products = generator.generateBatch({ count: 30 });
      const ids = products.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('has unique SKUs across all variants', () => {
      const products = generator.generateBatch({ count: 30 });
      const skus = products.flatMap((p) => p.variants.map((v) => v.sku));
      expect(new Set(skus).size).toBe(skus.length);
    });

    it('computes totalInventory from variants', () => {
      const products = generator.generateBatch({ count: 20 });

      for (const product of products) {
        const expected = product.variants.reduce((sum, v) => sum + v.inventoryQuantity, 0);
        expect(product.totalInventory).toBe(expected);
      }
    });

    it('has at least one variant per product', () => {
      const products = generator.generateBatch({ count: 20 });

      for (const product of products) {
        expect(product.variants.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('has positive prices (minimum 5€)', () => {
      const products = generator.generateBatch({ count: 20 });

      for (const product of products) {
        for (const variant of product.variants) {
          expect(variant.priceCents).toBeGreaterThanOrEqual(500);
        }
      }
    });

    it('has positive inventory quantities', () => {
      const products = generator.generateBatch({ count: 20 });

      for (const product of products) {
        for (const variant of product.variants) {
          expect(variant.inventoryQuantity).toBeGreaterThan(0);
        }
      }
    });

    it('has valid product types', () => {
      const products = generator.generateBatch({ count: 30 });
      const validTypes = [
        'T-Shirt',
        'Pantalon',
        'Robe',
        'Veste',
        'Pull',
        'Chemise',
        'Short',
        'Jupe',
        'Manteau',
        'Accessoire',
      ];

      for (const product of products) {
        expect(validTypes).toContain(product.productType);
      }
    });

    it('has valid vendors', () => {
      const products = generator.generateBatch({ count: 30 });
      const validVendors = [
        'Maison Parisienne',
        'Atelier Lyon',
        'Studio Marseille',
        'Comptoir Bordeaux',
        'Fabrique Lille',
        'Création Nantes',
      ];

      for (const product of products) {
        expect(validVendors).toContain(product.vendor);
      }
    });

    it('has valid image URLs', () => {
      const products = generator.generateBatch({ count: 10 });

      for (const product of products) {
        expect(product.imageUrl).toMatch(/^https:\/\/placehold\.co\//);
      }
    });
  });
});
