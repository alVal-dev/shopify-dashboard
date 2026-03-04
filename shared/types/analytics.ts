export interface KpiMetrics {
  revenueCents: number;
  revenueChange: number;
  ordersCount: number;
  ordersCountChange: number;
  averageOrderValueCents: number;
  averageOrderValueChange: number;
  customersCount: number;
  customersCountChange: number;
}

export interface SalesTrendPoint {
  date: string;
  revenueCents: number;
  ordersCount: number;
}

export type SalesTrend = SalesTrendPoint[];

export interface TopProduct {
  productId: string;
  title: string;
  revenueCents: number;
  unitsSold: number;
}
