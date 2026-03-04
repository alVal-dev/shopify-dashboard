import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';

import type { Product, ProductVariant } from '@shared/types';

export interface GenerateProductsOptions {
  count?: number; // default 30
  daysBack?: number; // default 120
}

const PRODUCT_TYPES = [
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
] as const;

const VENDORS = [
  'Maison Parisienne',
  'Atelier Lyon',
  'Studio Marseille',
  'Comptoir Bordeaux',
  'Fabrique Lille',
  'Création Nantes',
] as const;

const SIZE_VARIANTS = ['XS', 'S', 'M', 'L', 'XL'] as const;
const COLOR_VARIANTS = ['Noir', 'Blanc', 'Bleu', 'Rouge', 'Vert', 'Gris'] as const;

@Injectable()
export class ProductsGenerator {
  generateBatch(options: GenerateProductsOptions = {}): Product[] {
    const { count = 30, daysBack = 120 } = options;

    if (count <= 0) {
      return [];
    }

    const now = new Date();
    const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const skuSet = new Set<string>();
    const products: Product[] = [];

    for (let i = 0; i < count; i++) {
      products.push(this.generateOne({ from, to: now, skuSet }));
    }

    // Sort by creation date, oldest first
    products.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return products;
  }

  generateOne(params: { from: Date; to: Date; skuSet: Set<string> }): Product {
    const productType = faker.helpers.arrayElement(PRODUCT_TYPES);
    const title = this.buildProductTitle(productType);
    const variants = this.buildVariants(productType, params.skuSet);

    const totalInventory = variants.reduce((sum, v) => sum + v.inventoryQuantity, 0);

    return {
      id: randomUUID(),
      title,
      vendor: faker.helpers.arrayElement(VENDORS),
      productType,
      variants,
      imageUrl: this.buildImageUrl(title),
      totalInventory,
      createdAt: faker.date.between({ from: params.from, to: params.to }).toISOString(),
    };
  }

  // ─── Title ─────────────────────────────────────────────────

  private buildProductTitle(productType: string): string {
    const adjective = faker.helpers.arrayElement([
      'Classic',
      'Modern',
      'Urban',
      'Vintage',
      'Premium',
      'Essential',
      'Casual',
      'Élégant',
    ]);

    const material = faker.helpers.arrayElement([
      'Coton',
      'Lin',
      'Laine',
      'Soie',
      'Denim',
      'Velours',
    ]);

    return `${adjective} ${productType} ${material}`;
  }

  // ─── Variants ──────────────────────────────────────────────

  private buildVariants(productType: string, skuSet: Set<string>): ProductVariant[] {
    const variants: ProductVariant[] = [];
    const basePrice = this.pickBasePrice(productType);

    const strategy = faker.helpers.weightedArrayElement([
      { value: 'sizes', weight: 40 },
      { value: 'colors', weight: 30 },
      { value: 'single', weight: 30 },
    ]);

    if (strategy === 'single') {
      variants.push(this.createVariant('Default', basePrice, skuSet));
    } else if (strategy === 'sizes') {
      const sizes = faker.helpers.arrayElements(SIZE_VARIANTS, { min: 3, max: 5 });
      for (const size of sizes) {
        variants.push(this.createVariant(size, basePrice, skuSet));
      }
    } else {
      const colors = faker.helpers.arrayElements(COLOR_VARIANTS, { min: 2, max: 4 });
      for (const color of colors) {
        const priceVariation = faker.number.int({ min: -500, max: 500 });
        variants.push(this.createVariant(color, basePrice + priceVariation, skuSet));
      }
    }

    return variants;
  }

  private createVariant(title: string, priceCents: number, skuSet: Set<string>): ProductVariant {
    return {
      id: randomUUID(),
      title,
      priceCents: Math.max(500, priceCents),
      sku: this.generateUniqueSku(skuSet),
      inventoryQuantity: this.pickInventoryQuantity(),
    };
  }

  private generateUniqueSku(skuSet: Set<string>): string {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const prefix = faker.string.alpha({ length: 2, casing: 'upper' });
      const number = faker.string.numeric({ length: 6 });
      const sku = `${prefix}-${number}`;

      if (!skuSet.has(sku)) {
        skuSet.add(sku);
        return sku;
      }
    }

    throw new Error('ProductsGenerator: unable to generate unique SKU');
  }

  // ─── Pricing ───────────────────────────────────────────────

  private pickBasePrice(productType: string): number {
    const priceRanges: Record<string, { min: number; max: number }> = {
      'T-Shirt': { min: 2500, max: 4500 },
      Pantalon: { min: 5000, max: 9000 },
      Robe: { min: 6000, max: 12000 },
      Veste: { min: 8000, max: 15000 },
      Pull: { min: 4500, max: 8000 },
      Chemise: { min: 4000, max: 7500 },
      Short: { min: 3000, max: 5500 },
      Jupe: { min: 4000, max: 7000 },
      Manteau: { min: 12000, max: 25000 },
      Accessoire: { min: 1500, max: 4000 },
    };

    const range = priceRanges[productType] ?? { min: 3000, max: 8000 };
    return faker.number.int({ min: range.min, max: range.max });
  }

  // ─── Stock ─────────────────────────────────────────────────

  private pickInventoryQuantity(): number {
    const stockLevel = faker.helpers.weightedArrayElement([
      { value: 'high', weight: 50 },
      { value: 'medium', weight: 30 },
      { value: 'low', weight: 20 },
    ]);

    switch (stockLevel) {
      case 'high':
        return faker.number.int({ min: 100, max: 150 });
      case 'medium':
        return faker.number.int({ min: 60, max: 99 });
      case 'low':
        return faker.number.int({ min: 15, max: 40 });
      default:
        return faker.number.int({ min: 60, max: 99 });
    }
  }

  // ─── Image ─────────────────────────────────────────────────

  private buildImageUrl(title: string): string {
    const encoded = encodeURIComponent(title.substring(0, 20));
    return `https://placehold.co/400x400/e2e8f0/475569?text=${encoded}`;
  }
}
