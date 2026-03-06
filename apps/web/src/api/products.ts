import type { ApiResponse, PaginatedResponse, Product } from '@shared/types';
import { api } from './index';
import type { PaginationQueryParams } from './query';

export async function getProducts(
  params?: PaginationQueryParams,
): Promise<PaginatedResponse<Product>> {
  const response = await api().get<ApiResponse<PaginatedResponse<Product>>>('/products', {
    params,
  });
  return response.data.data;
}
