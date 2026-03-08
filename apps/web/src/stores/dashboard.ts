import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { DashboardLayout, WidgetConfig, WidgetType } from '@shared/types';

import { getLayout, saveLayout as saveDashboardLayout } from '../api/dashboard';
import type { DashboardGridItemState } from '../composables/useDashboardGrid';
import { ALL_WIDGET_TYPES, getDashboardWidgetDefinition } from '../config/dashboard-widgets';
import { mapGridItemsToWidgetConfigs } from '../utils/layout-mapper';
import { useOrdersStore } from './orders';
import { useAnalyticsStore } from './analytics';

function compareWidgetsByPosition(a: WidgetConfig, b: WidgetConfig): number {
  if (a.position.y !== b.position.y) {
    return a.position.y - b.position.y;
  }

  return a.position.x - b.position.x;
}

function getNextWidgetY(widgets: readonly WidgetConfig[]): number {
  if (widgets.length === 0) {
    return 0;
  }

  return widgets.reduce((maxBottom, widget) => {
    const widgetBottom = widget.position.y + widget.position.h;
    return Math.max(maxBottom, widgetBottom);
  }, 0);
}

function createWidgetId(type: WidgetType): string {
  return `${type}-${crypto.randomUUID()}`;
}

function buildDefaultWidgetConfig(
  type: WidgetType,
  existingWidgets: readonly WidgetConfig[],
): WidgetConfig {
  const definition = getDashboardWidgetDefinition(type);

  return {
    id: createWidgetId(type),
    type,
    title: definition.title,
    position: {
      x: 0,
      y: getNextWidgetY(existingWidgets),
      w: definition.size.w,
      h: definition.size.h,
    },
  };
}

export const useDashboardStore = defineStore('dashboard', () => {
  const ordersStore = useOrdersStore();
  const analyticsStore = useAnalyticsStore();

  const isLoading = ref(false);
  const isLayoutLoading = ref(false);
  const isSavingLayout = ref(false);

  const layout = ref<DashboardLayout | null>(null);
  const layoutError = ref<string | null>(null);
  const saveLayoutError = ref<string | null>(null);

  const orderedWidgets = computed<WidgetConfig[]>(() => {
    if (!layout.value) return [];

    return [...layout.value.widgets].sort(compareWidgetsByPosition);
  });

  const widgetTypesInLayout = computed<WidgetType[]>(() => {
    return orderedWidgets.value.map((widget) => widget.type);
  });

  const availableWidgetTypes = computed<WidgetType[]>(() => {
    const presentTypes = new Set(widgetTypesInLayout.value);
    return ALL_WIDGET_TYPES.filter((type) => !presentTypes.has(type));
  });

  const canAddMoreWidgets = computed(() => availableWidgetTypes.value.length > 0);

  const hasLayout = computed(() => layout.value !== null);
  const hasWidgets = computed(() => orderedWidgets.value.length > 0);

  const errors = computed(() => {
    const list: string[] = [];

    if (layoutError.value) list.push(layoutError.value);
    if (saveLayoutError.value) list.push(saveLayoutError.value);
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

  function addWidget(type: WidgetType): WidgetConfig | null {
    if (!layout.value) {
      console.warn(
        "[DashboardStore] Impossible d'ajouter un widget : la disposition n'est pas chargée.",
      );
      return null;
    }

    const alreadyExists = layout.value.widgets.some((widget) => widget.type === type);
    if (alreadyExists) {
      console.warn(`[DashboardStore] Le widget "${type}" est déjà présent dans la disposition.`);
      return null;
    }

    const nextWidget = buildDefaultWidgetConfig(type, layout.value.widgets);

    layout.value = {
      ...layout.value,
      widgets: [...layout.value.widgets, nextWidget],
    };

    return nextWidget;
  }

  function applyGridLayout(currentItems: readonly DashboardGridItemState[]): DashboardLayout {
    if (!layout.value) {
      throw new Error(
        "[DashboardStore] Impossible d'appliquer le layout Gridstack : la disposition n'est pas chargée.",
      );
    }

    const nextWidgets = mapGridItemsToWidgetConfigs(currentItems, layout.value.widgets);

    const nextLayout: DashboardLayout = {
      ...layout.value,
      widgets: nextWidgets,
    };

    layout.value = nextLayout;
    return nextLayout;
  }

  async function persistLayout(): Promise<DashboardLayout | null> {
    if (!layout.value) {
      console.warn(
        "[DashboardStore] Impossible d'enregistrer la disposition : la disposition n'est pas chargée.",
      );
      return null;
    }

    isSavingLayout.value = true;
    saveLayoutError.value = null;

    try {
      const savedLayout = await saveDashboardLayout(layout.value);
      layout.value = savedLayout;
      return savedLayout;
    } catch (error) {
      saveLayoutError.value = "Impossible d'enregistrer la disposition du tableau de bord.";
      console.error('[DashboardStore] Échec de la sauvegarde de la disposition :', error);
      return null;
    } finally {
      isSavingLayout.value = false;
    }
  }

  async function applyGridLayoutAndPersist(
    currentItems: readonly DashboardGridItemState[],
    options: { persistRemotely: boolean },
  ): Promise<boolean> {
    saveLayoutError.value = null;

    try {
      applyGridLayout(currentItems);
    } catch (error) {
      saveLayoutError.value = 'Impossible de mettre à jour la disposition du tableau de bord.';
      console.error("[DashboardStore] Échec de l'application du layout Gridstack :", error);
      return false;
    }

    if (!options.persistRemotely) {
      return true;
    }

    const savedLayout = await persistLayout();
    return savedLayout !== null;
  }

  function removeWidget(widgetId: string): WidgetConfig | null {
    if (!layout.value) {
      console.warn(
        "[DashboardStore] Impossible de supprimer un widget : la disposition n'est pas chargée.",
      );
      return null;
    }

    const widgetToRemove = layout.value.widgets.find((widget) => widget.id === widgetId);
    if (!widgetToRemove) {
      console.warn(`[DashboardStore] Widget introuvable pour suppression : "${widgetId}".`);
      return null;
    }

    layout.value = {
      ...layout.value,
      widgets: layout.value.widgets.filter((widget) => widget.id !== widgetId),
    };

    return widgetToRemove;
  }

  function clearSaveLayoutError(): void {
    saveLayoutError.value = null;
  }

  function reset(): void {
    isLoading.value = false;
    isLayoutLoading.value = false;
    isSavingLayout.value = false;
    layout.value = null;
    layoutError.value = null;
    saveLayoutError.value = null;
  }

  return {
    isLoading,
    isLayoutLoading,
    isSavingLayout,
    layout,
    layoutError,
    saveLayoutError,

    orderedWidgets,
    widgetTypesInLayout,
    availableWidgetTypes,
    canAddMoreWidgets,
    hasLayout,
    hasWidgets,
    errors,
    hasError,
    isReady,

    fetchLayout,
    load,
    addWidget,
    applyGridLayout,
    persistLayout,
    applyGridLayoutAndPersist,
    clearSaveLayoutError,
    removeWidget,
    reset,
  };
});
