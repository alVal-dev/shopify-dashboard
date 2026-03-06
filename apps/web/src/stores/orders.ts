import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { Order, PaginatedResponse } from '@shared/types';
import { getOrders } from '../api/orders';
import type { OrdersQueryParams } from '../api/query';

const DEFAULT_QUERY: Required<Pick<OrdersQueryParams, 'page' | 'limit' | 'sortOrder' | 'sortBy'>> =
  {
    page: 1,
    limit: 20,
    sortOrder: 'desc',
    sortBy: 'createdAt',
  };

export const useOrdersStore = defineStore('orders', () => {
  // --- State ---
  const pageData = ref<PaginatedResponse<Order> | null>(null);

  const query = ref<OrdersQueryParams>({
    ...DEFAULT_QUERY,
    status: undefined,
  });

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- Getters ---
  const orders = computed(() => pageData.value?.data ?? []);
  const total = computed(() => pageData.value?.total ?? 0);
  const page = computed(() => pageData.value?.page ?? query.value.page ?? DEFAULT_QUERY.page);
  const limit = computed(() => pageData.value?.limit ?? query.value.limit ?? DEFAULT_QUERY.limit);
  const totalPages = computed(() => pageData.value?.totalPages ?? 1);

  const hasData = computed(() => orders.value.length > 0);
  const isEmpty = computed(
    () => !isLoading.value && error.value === null && orders.value.length === 0,
  );

  // --- Actions ---
  async function fetch(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const data = await getOrders(query.value);
      pageData.value = data;
    } catch (e) {
      console.error('[OrdersStore] Erreur lors du fetch:', e);
      pageData.value = null;
      error.value = 'Erreur lors du chargement des commandes';
    } finally {
      isLoading.value = false;
    }
  }

  async function setQuery(partial: Partial<OrdersQueryParams>): Promise<void> {
    query.value = {
      ...query.value,
      ...partial,
    };
    await fetch();
  }

  async function setPage(nextPage: number): Promise<void> {
    await setQuery({ page: nextPage });
  }

  async function setLimit(nextLimit: number): Promise<void> {
    await setQuery({ limit: nextLimit, page: 1 });
  }

  async function setSort(
    sortBy: OrdersQueryParams['sortBy'],
    sortOrder: OrdersQueryParams['sortOrder'],
  ): Promise<void> {
    await setQuery({ sortBy, sortOrder, page: 1 });
  }

  async function setStatus(status: OrdersQueryParams['status']): Promise<void> {
    await setQuery({ status, page: 1 });
  }

  function reset(): void {
    pageData.value = null;
    query.value = { ...DEFAULT_QUERY, status: undefined };
    isLoading.value = false;
    error.value = null;
  }

  return {
    // State
    pageData,
    query,
    isLoading,
    error,

    // Getters
    orders,
    total,
    page,
    limit,
    totalPages,
    hasData,
    isEmpty,

    // Actions
    fetch,
    setQuery,
    setPage,
    setLimit,
    setSort,
    setStatus,
    reset,
  };
});
