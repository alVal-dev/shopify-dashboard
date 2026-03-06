import type { ApiResponse, Order, PaginatedResponse } from '@shared/types';
import { api } from './index';
import type { OrdersQueryParams } from './query';

export async function getOrders(params?: OrdersQueryParams): Promise<PaginatedResponse<Order>> {
  const response = await api().get<ApiResponse<PaginatedResponse<Order>>>('/orders', { params });
  return response.data.data;
}
