// Orders

export type FinancialStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'shipped' | 'delivered';

export interface OrderLineItem {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
  sku: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  customerId: string;
  email: string;
  customerName: string;
  totalPriceCents: number;
  currency: string;
  financialStatus: FinancialStatus;
  fulfillmentStatus: FulfillmentStatus;
  lineItems: OrderLineItem[];
  shippingCity: string;
  shippingCountry: string;
  createdAt: string;
}

// Products

export interface ProductVariant {
  id: string;
  title: string;
  priceCents: number;
  sku: string;
  inventoryQuantity: number;
}

export interface Product {
  id: string;
  title: string;
  vendor: string;
  productType: string;
  variants: ProductVariant[];
  imageUrl: string;
  totalInventory: number;
  createdAt: string;
}

// Customers

export type CustomerSegment = 'new' | 'returning' | 'vip';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  ordersCount: number;
  totalSpentCents: number;
  segment: CustomerSegment;
  city: string;
  country: string;
  createdAt: string;
}
