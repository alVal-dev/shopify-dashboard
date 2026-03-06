import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { useOrdersStore } from './orders';
import { useAnalyticsStore } from './analytics';

export const useDashboardStore = defineStore('dashboard', () => {
  // --- Dépendances ---
  const ordersStore = useOrdersStore();
  const analyticsStore = useAnalyticsStore();

  // --- State ---
  const isLoading = ref(false);

  // --- Getters ---
  const errors = computed(() => {
    const list: string[] = [];
    if (ordersStore.error) list.push(ordersStore.error);
    if (analyticsStore.error) list.push(analyticsStore.error);
    return list;
  });

  const hasError = computed(() => errors.value.length > 0);
  const isReady = computed(() => !isLoading.value && !hasError.value);

  // --- Actions ---
  async function load(): Promise<void> {
    isLoading.value = true;

    const results = await Promise.allSettled([ordersStore.fetch(), analyticsStore.fetch()]);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const storeName = index === 0 ? 'orders' : 'analytics';
        console.error(`[DashboardStore] Échec inattendu ${storeName}:`, result.reason);
      }
    });

    isLoading.value = false;
  }

  function reset(): void {
    isLoading.value = false;
  }

  return {
    // State
    isLoading,

    // Getters
    errors,
    hasError,
    isReady,

    // Actions
    load,
    reset,
  };
});
