import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { AnalyticsSnapshot, KpiMetrics, SalesTrend, TopProduct } from '@shared/types';
import { getAnalytics } from '../api/analytics';

export const useAnalyticsStore = defineStore('analytics', () => {
  // --- State ---
  const snapshot = ref<AnalyticsSnapshot | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- Getters ---
  const kpis = computed<KpiMetrics | null>(() => snapshot.value?.kpis ?? null);
  const salesTrend = computed<SalesTrend>(() => snapshot.value?.salesTrend ?? []);
  const topProducts = computed<TopProduct[]>(() => snapshot.value?.topProducts ?? []);

  const hasData = computed(() => snapshot.value !== null);
  const isEmpty = computed(
    () => !isLoading.value && error.value === null && snapshot.value === null,
  );

  // --- Actions ---
  async function fetch(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      const data = await getAnalytics();
      setSnapshot(data);
    } catch (e) {
      console.error('[AnalyticsStore] Erreur lors du fetch:', e);
      snapshot.value = null;
      error.value = 'Erreur lors du chargement des analytics';
    } finally {
      isLoading.value = false;
    }
  }

  function setSnapshot(data: AnalyticsSnapshot): void {
    snapshot.value = data;
  }

  function reset(): void {
    snapshot.value = null;
    isLoading.value = false;
    error.value = null;
  }

  return {
    // State
    snapshot,
    isLoading,
    error,

    // Getters
    kpis,
    salesTrend,
    topProducts,
    hasData,
    isEmpty,

    // Actions
    fetch,
    setSnapshot,
    reset,
  };
});
