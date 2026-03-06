import type { FinancialStatus } from '@shared/types';

export type SortOrder = 'asc' | 'desc';

export interface PaginationQueryParams {
  page?: number;
  limit?: number;
  sortOrder?: SortOrder;
}

export type OrdersSortBy = 'createdAt' | 'totalPriceCents' | 'orderNumber';

export interface OrdersQueryParams extends PaginationQueryParams {
  sortBy?: OrdersSortBy;
  status?: FinancialStatus;
}
