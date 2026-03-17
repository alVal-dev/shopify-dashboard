import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAnalyticsStore } from '../analytics';
import type { AnalyticsSnapshot } from '@shared/types';

vi.mock('@/api/analytics', () => ({
  getAnalytics: vi.fn(),
}));

import { getAnalytics } from '../../api/analytics';

function makeSnapshot(): AnalyticsSnapshot {
  return {
    kpis: {
      revenueCents: 1000,
      revenueChange: 10,
      ordersCount: 3,
      ordersCountChange: 20,
      averageOrderValueCents: 333,
      averageOrderValueChange: 5,
      customersCount: 2,
      customersCountChange: 15,
    },
    salesTrend: [{ date: '2026-01-01', revenueCents: 1000, ordersCount: 3 }],
    topProducts: [{ productId: 'p1', title: 'Product', revenueCents: 1000, unitsSold: 2 }],
  };
}

describe('analytics store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetch() stores analytics snapshot on success', async () => {
    vi.mocked(getAnalytics).mockResolvedValue(makeSnapshot());

    const store = useAnalyticsStore();
    await store.fetch();

    expect(store.snapshot).toEqual(makeSnapshot());
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  it('fetch() sets error on failure', async () => {
    vi.mocked(getAnalytics).mockRejectedValue(new Error('boom'));

    const store = useAnalyticsStore();
    await store.fetch();

    expect(store.snapshot).toBeNull();
    expect(store.error).toBe('Erreur lors du chargement des analytics');
    expect(store.isLoading).toBe(false);
  });

  it('setSnapshot() updates derived getters', () => {
    const store = useAnalyticsStore();
    const snapshot = makeSnapshot();

    store.setSnapshot(snapshot);

    expect(store.kpis).toEqual(snapshot.kpis);
    expect(store.salesTrend).toEqual(snapshot.salesTrend);
    expect(store.topProducts).toEqual(snapshot.topProducts);
    expect(store.hasData).toBe(true);
    expect(store.isEmpty).toBe(false);
  });

  it('reset() clears state', () => {
    const store = useAnalyticsStore();
    store.setSnapshot(makeSnapshot());
    store.error = 'err';
    store.isLoading = true;

    store.reset();

    expect(store.snapshot).toBeNull();
    expect(store.error).toBeNull();
    expect(store.isLoading).toBe(false);
  });

  it('getters return empty defaults without snapshot', () => {
    const store = useAnalyticsStore();

    expect(store.kpis).toBeNull();
    expect(store.salesTrend).toEqual([]);
    expect(store.topProducts).toEqual([]);
    expect(store.hasData).toBe(false);
    expect(store.isEmpty).toBe(true);
  });
});
