import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { DashboardLayout, WidgetConfig } from '@shared/types';

import { getLayout } from '../api/dashboard';
import { useOrdersStore } from './orders';
import { useAnalyticsStore } from './analytics';

export const useDashboardStore = defineStore('dashboard', () => {
  const ordersStore = useOrdersStore();
  const analyticsStore = useAnalyticsStore();

  const isLoading = ref(false);
  const isLayoutLoading = ref(false);

  const layout = ref<DashboardLayout | null>(null);
  const layoutError = ref<string | null>(null);

  const orderedWidgets = computed<WidgetConfig[]>(() => {
    if (!layout.value) return [];

    return [...layout.value.widgets].sort((a, b) => {
      if (a.position.y !== b.position.y) {
        return a.position.y - b.position.y;
      }

      return a.position.x - b.position.x;
    });
  });

  const hasLayout = computed(() => layout.value !== null);
  const hasWidgets = computed(() => orderedWidgets.value.length > 0);

  const errors = computed(() => {
    const list: string[] = [];

    if (layoutError.value) list.push(layoutError.value);
    if (ordersStore.error) list.push(ordersStore.error);
    if (analyticsStore.error) list.push(analyticsStore.error);

    return list;
  });

  const hasError = computed(() => errors.value.length > 0);
  const isReady = computed(() => !isLoading.value && hasLayout.value);

  async function fetchLayout(): Promise<void> {
    isLayoutLoading.value = true;
    layoutError.value = null;

    try {
      layout.value = await getLayout();
    } catch (error) {
      layout.value = null;
      layoutError.value = 'Impossible de charger la disposition du tableau de bord.';
      console.error('[DashboardStore] Échec du chargement de la disposition :', error);
    } finally {
      isLayoutLoading.value = false;
    }
  }

  async function load(): Promise<void> {
    isLoading.value = true;

    const results = await Promise.allSettled([
      fetchLayout(),
      ordersStore.fetch(),
      analyticsStore.fetch(),
    ]);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const source = index === 0 ? 'layout' : index === 1 ? 'orders' : 'analytics';
        console.error(`[DashboardStore] Échec inattendu de ${source} :`, result.reason);
      }
    });

    isLoading.value = false;
  }

  function reset(): void {
    isLoading.value = false;
    isLayoutLoading.value = false;
    layout.value = null;
    layoutError.value = null;
  }

  return {
    isLoading,
    isLayoutLoading,
    layout,
    layoutError,

    orderedWidgets,
    hasLayout,
    hasWidgets,
    errors,
    hasError,
    isReady,

    fetchLayout,
    load,
    reset,
  };
});
