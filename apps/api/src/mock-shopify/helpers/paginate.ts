import type { PaginatedResponse } from '@shared/types';

export function paginate<T>(items: T[], page: number, limit: number): PaginatedResponse<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const start = (safePage - 1) * limit;
  const data = items.slice(start, start + limit);

  return {
    data,
    total,
    page: safePage,
    limit,
    totalPages,
  };
}
