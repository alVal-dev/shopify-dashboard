import type { ApiResponse, Customer, PaginatedResponse } from '@shared/types';
import { api } from './index';
import type { PaginationQueryParams } from './query';

export async function getCustomers(
  params?: PaginationQueryParams,
): Promise<PaginatedResponse<Customer>> {
  const response = await api().get<ApiResponse<PaginatedResponse<Customer>>>('/customers', {
    params,
  });
  return response.data.data;
}
