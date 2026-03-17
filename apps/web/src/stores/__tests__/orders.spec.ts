import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useOrdersStore } from '../orders';
import type { Order, PaginatedResponse } from '@shared/types';

vi.mock('@/api/orders', () => ({
  getOrders: vi.fn(),
}));

import { getOrders } from '../../api/orders';

function makePageData(): PaginatedResponse<Order> {
  return {
    data: [
      {
        id: 'o1',
        orderNumber: 1001,
        customerId: 'c1',
        email: 'john@example.com',
        customerName: 'John Doe',
        totalPriceCents: 1000,
        currency: 'EUR',
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        lineItems: [],
        shippingCity: 'Paris',
        shippingCountry: 'France',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };
}

describe('orders store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetch() stores paginated orders on success', async () => {
    vi.mocked(getOrders).mockResolvedValue(makePageData());

    const store = useOrdersStore();
    await store.fetch();

    expect(store.pageData).toEqual(makePageData());
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
    expect(store.orders).toEqual(makePageData().data);
  });

  it('fetch() sets error on failure', async () => {
    vi.mocked(getOrders).mockRejectedValue(new Error('boom'));

    const store = useOrdersStore();
    await store.fetch();

    expect(store.pageData).toBeNull();
    expect(store.error).toBe('Erreur lors du chargement des commandes');
    expect(store.isLoading).toBe(false);
  });

  it('setQuery() updates query and triggers fetch', async () => {
    vi.mocked(getOrders).mockResolvedValue(makePageData());

    const store = useOrdersStore();
    await store.setQuery({ page: 2, status: 'paid' });

    expect(store.query.page).toBe(2);
    expect(store.query.status).toBe('paid');
    expect(getOrders).toHaveBeenCalledTimes(1);
  });

  it('setPage() updates page and fetches', async () => {
    vi.mocked(getOrders).mockResolvedValue(makePageData());

    const store = useOrdersStore();
    await store.setPage(3);

    expect(store.query.page).toBe(3);
    expect(getOrders).toHaveBeenCalledTimes(1);
  });

  it('setLimit() resets page to 1 and fetches', async () => {
    vi.mocked(getOrders).mockResolvedValue(makePageData());

    const store = useOrdersStore();
    store.query.page = 4;

    await store.setLimit(50);

    expect(store.query.limit).toBe(50);
    expect(store.query.page).toBe(1);
  });

  it('setSort() updates sort and resets page to 1', async () => {
    vi.mocked(getOrders).mockResolvedValue(makePageData());

    const store = useOrdersStore();
    store.query.page = 3;

    await store.setSort('orderNumber', 'asc');

    expect(store.query.sortBy).toBe('orderNumber');
    expect(store.query.sortOrder).toBe('asc');
    expect(store.query.page).toBe(1);
  });

  it('setStatus() updates status and resets page to 1', async () => {
    vi.mocked(getOrders).mockResolvedValue(makePageData());

    const store = useOrdersStore();
    store.query.page = 3;

    await store.setStatus('refunded');

    expect(store.query.status).toBe('refunded');
    expect(store.query.page).toBe(1);
  });

  it('getters expose defaults when pageData is null', () => {
    const store = useOrdersStore();

    expect(store.orders).toEqual([]);
    expect(store.total).toBe(0);
    expect(store.page).toBe(1);
    expect(store.limit).toBe(20);
    expect(store.totalPages).toBe(1);
    expect(store.hasData).toBe(false);
    expect(store.isEmpty).toBe(true);
  });

  it('reset() restores default state', () => {
    const store = useOrdersStore();
    store.pageData = makePageData();
    store.query.page = 5;
    store.error = 'err';
    store.isLoading = true;

    store.reset();

    expect(store.pageData).toBeNull();
    expect(store.query.page).toBe(1);
    expect(store.query.limit).toBe(20);
    expect(store.query.sortBy).toBe('createdAt');
    expect(store.query.sortOrder).toBe('desc');
    expect(store.query.status).toBeUndefined();
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
  });
});
