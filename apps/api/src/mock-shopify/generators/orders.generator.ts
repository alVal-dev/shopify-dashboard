import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';

import type {
  Customer,
  FinancialStatus,
  FulfillmentStatus,
  Order,
  OrderLineItem,
  Product,
  ProductVariant,
} from '@shared/types';

export interface GenerateBatchOptions {
  products: Product[];
  customers: Customer[];

  count?: number; // default 450
  daysBack?: number; // default 90
  startingOrderNumber?: number; // default 1001

  currency?: string; // default 'EUR'
}

const FRENCH_CITIES = [
  'Paris',
  'Marseille',
  'Lyon',
  'Toulouse',
  'Nice',
  'Nantes',
  'Montpellier',
  'Strasbourg',
  'Bordeaux',
  'Lille',
  'Rennes',
  'Reims',
  'Saint-Étienne',
  'Toulon',
  'Grenoble',
  'Dijon',
  'Angers',
  'Nîmes',
  'Villeurbanne',
  'Clermont-Ferrand',
  'Le Havre',
  'Aix-en-Provence',
  'Brest',
  'Tours',
  'Amiens',
  'Limoges',
  'Annecy',
  'Perpignan',
  'Metz',
  'Besançon',
] as const;

@Injectable()
export class OrdersGenerator {
  generateBatch(options: GenerateBatchOptions): Order[] {
    const {
      products,
      customers,
      count = 450,
      daysBack = 90,
      startingOrderNumber = 1001,
      currency = 'EUR',
    } = options;

    if (products.length === 0) throw new Error('OrdersGenerator: products is empty.');
    if (customers.length === 0) throw new Error('OrdersGenerator: customers is empty.');
    if (count <= 0) return [];

    const now = new Date();
    const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const orders: Order[] = [];

    // Retry pour garantir "count" ou échouer explicitement si stock insuffisant
    const maxAttempts = count * 15;
    let attempts = 0;

    while (orders.length < count && attempts < maxAttempts) {
      attempts += 1;

      const createdAt = faker.date.between({ from, to: now });

      const order = this.generateOne({
        products,
        customers,
        currency,
        createdAt,
        orderNumber: startingOrderNumber, // temporaire, renuméroté après tri chrono
      });

      if (!order) continue;
      orders.push(order);
    }

    if (orders.length < count) {
      throw new Error(
        `OrdersGenerator: unable to generate ${count} orders with current stock. ` +
          `Generated=${orders.length}. Increase initial inventory or reduce order volume.`,
      );
    }

    // orderNumber corrélé au temps: tri chrono asc puis numérotation séquentielle
    orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (let i = 0; i < orders.length; i += 1) {
      orders[i]!.orderNumber = startingOrderNumber + i;
    }

    orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return orders;
  }

  generateOne(params: {
    products: Product[];
    customers: Customer[];
    currency: string;
    createdAt?: Date;
    orderNumber: number;
  }): Order | null {
    const customer = faker.helpers.arrayElement(params.customers);

    const financialStatus = this.pickFinancialStatus();
    const fulfillmentStatus = this.pickFulfillmentStatus(financialStatus);

    const enforceStock =
      financialStatus === 'paid' || financialStatus === 'pending' || financialStatus === 'refunded';

    const lineItems = this.buildLineItems({
      products: params.products,
      enforceStock,
    });

    if (lineItems.length === 0) return null;

    this.applyStockMovement(params.products, lineItems, financialStatus);

    const totalPriceCents = this.computeTotalCents(lineItems);
    this.updateCustomerStats(customer, financialStatus, totalPriceCents);

    const shippingCity = customer.city?.trim() ? customer.city : this.pickFrenchCity();

    return {
      id: randomUUID(),
      orderNumber: params.orderNumber,
      customerId: customer.id,
      email: customer.email,
      customerName: `${customer.firstName} ${customer.lastName}`,
      totalPriceCents,
      currency: params.currency,
      financialStatus,
      fulfillmentStatus,
      lineItems,
      shippingCity,
      shippingCountry: 'France',
      createdAt: (params.createdAt ?? new Date()).toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Line items
  // ─────────────────────────────────────────────────────────────

  private buildLineItems(input: { products: Product[]; enforceStock: boolean }): OrderLineItem[] {
    const targetCount = faker.number.int({ min: 1, max: 4 });
    const items: OrderLineItem[] = [];

    const usedVariantIds = new Set<string>();
    const maxAttempts = targetCount * 10;

    for (let attempt = 0; attempt < maxAttempts && items.length < targetCount; attempt += 1) {
      const pick = this.pickSellableVariant({
        products: input.products,
        desiredQuantity: faker.number.int({ min: 1, max: 3 }),
        enforceStock: input.enforceStock,
      });

      if (!pick) continue;

      const { product, variant, quantity } = pick;

      if (usedVariantIds.has(variant.id)) continue;
      usedVariantIds.add(variant.id);

      items.push(this.createLineItem(product, variant, quantity));
    }

    return items;
  }

  private pickSellableVariant(input: {
    products: Product[];
    desiredQuantity: number;
    enforceStock: boolean;
  }): { product: Product; variant: ProductVariant; quantity: number } | null {
    const maxAttempts = 80;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const product = faker.helpers.arrayElement(input.products);
      const variant = faker.helpers.arrayElement(product.variants);

      if (!input.enforceStock) {
        return { product, variant, quantity: input.desiredQuantity };
      }

      const available = variant.inventoryQuantity;
      if (available <= 0) continue;

      const quantity = Math.min(input.desiredQuantity, available);
      if (quantity <= 0) continue;

      return { product, variant, quantity };
    }

    return null;
  }

  private createLineItem(
    product: Product,
    variant: ProductVariant,
    quantity: number,
  ): OrderLineItem {
    const vTitle = variant.title?.trim();
    const title =
      !vTitle || vTitle.toLowerCase() === 'default'
        ? product.title
        : `${product.title} — ${vTitle}`;

    return {
      id: randomUUID(),
      productId: product.id,
      variantId: variant.id,
      title,
      quantity,
      unitPriceCents: variant.priceCents,
      sku: variant.sku,
    };
  }

  private computeTotalCents(items: OrderLineItem[]): number {
    return items.reduce((sum, li) => sum + li.unitPriceCents * li.quantity, 0);
  }

  // ─────────────────────────────────────────────────────────────
  // Stock
  // ─────────────────────────────────────────────────────────────

  private applyStockMovement(
    products: Product[],
    lineItems: OrderLineItem[],
    status: FinancialStatus,
  ): void {
    if (status === 'cancelled') return;

    const productById = new Map(products.map((p) => [p.id, p]));

    for (const li of lineItems) {
      const product = productById.get(li.productId);
      if (!product) continue;

      const variant = product.variants.find((v) => v.id === li.variantId);
      if (!variant) continue;

      if (status === 'paid' || status === 'pending') {
        variant.inventoryQuantity = Math.max(0, variant.inventoryQuantity - li.quantity);
      } else if (status === 'refunded') {
        variant.inventoryQuantity = Math.max(0, variant.inventoryQuantity - li.quantity);
        variant.inventoryQuantity += li.quantity;
      }

      // Source de vérité: recalcul systématique
      product.totalInventory = product.variants.reduce((sum, v) => sum + v.inventoryQuantity, 0);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Customer stats
  // ─────────────────────────────────────────────────────────────

  private updateCustomerStats(
    customer: Customer,
    status: FinancialStatus,
    totalPriceCents: number,
  ): void {
    if (status === 'cancelled') return;

    customer.ordersCount += 1;

    if (status === 'paid') {
      customer.totalSpentCents += totalPriceCents;
    } else if (status === 'refunded') {
      customer.totalSpentCents = Math.max(0, customer.totalSpentCents - totalPriceCents);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Status distributions
  // ─────────────────────────────────────────────────────────────

  private pickFinancialStatus(): FinancialStatus {
    // Ajustable, mais déjà raisonnable pour une démo
    return this.pickWeighted<FinancialStatus>([
      { value: 'paid', weight: 70 },
      { value: 'pending', weight: 18 },
      { value: 'refunded', weight: 8 },
      { value: 'cancelled', weight: 4 },
    ]);
  }

  private pickFulfillmentStatus(financial: FinancialStatus): FulfillmentStatus {
    if (financial === 'cancelled') return 'unfulfilled';

    if (financial === 'pending') {
      // Majoritairement non expédié, mais un peu de bruit réaliste
      return this.pickWeighted<FulfillmentStatus>([
        { value: 'unfulfilled', weight: 92 },
        { value: 'partial', weight: 3 },
        { value: 'shipped', weight: 3 },
        { value: 'delivered', weight: 2 },
      ]);
    }

    if (financial === 'refunded') {
      // Souvent expédié/livré avant retour
      return this.pickWeighted<FulfillmentStatus>([
        { value: 'delivered', weight: 50 },
        { value: 'shipped', weight: 25 },
        { value: 'fulfilled', weight: 15 },
        { value: 'partial', weight: 5 },
        { value: 'unfulfilled', weight: 5 },
      ]);
    }

    // paid
    return this.pickWeighted<FulfillmentStatus>([
      { value: 'unfulfilled', weight: 15 },
      { value: 'partial', weight: 15 },
      { value: 'fulfilled', weight: 25 },
      { value: 'shipped', weight: 20 },
      { value: 'delivered', weight: 25 },
    ]);
  }

  // ─────────────────────────────────────────────────────────────
  // Misc
  // ─────────────────────────────────────────────────────────────

  private pickFrenchCity(): string {
    return faker.helpers.arrayElement(FRENCH_CITIES);
  }

  private pickWeighted<T>(choices: Array<{ value: T; weight: number }>): T {
    const total = choices.reduce((sum, c) => sum + c.weight, 0);
    let roll = faker.number.int({ min: 1, max: total });

    for (const c of choices) {
      roll -= c.weight;
      if (roll <= 0) return c.value;
    }

    return choices[choices.length - 1]!.value;
  }
}
