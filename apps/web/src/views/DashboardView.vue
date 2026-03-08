<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue';
import { useRouter } from 'vue-router';
import type { FinancialStatus, WidgetConfig, WidgetType } from '@shared/types';
import type { OrdersSortBy } from '../api/query';

import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Chip from 'primevue/chip';
import Divider from 'primevue/divider';
import Sidebar from 'primevue/sidebar';
import Tooltip from 'primevue/tooltip';

import { useAuthStore } from '../stores/auth';
import { useDashboardStore } from '../stores/dashboard';
import { useOrdersStore } from '../stores/orders';
import { useAnalyticsStore } from '../stores/analytics';
import { useTheme } from '../composables/useTheme';

import DashboardGrid from '../components/DashboardGrid.vue';
import WidgetCatalog from '../components/WidgetCatalog.vue';
import KpiCardWidget from '../components/widgets/KpiCardWidget.vue';
import RevenueTrendWidget from '../components/widgets/RevenueTrendWidget.vue';
import OrdersTableWidget from '../components/widgets/OrdersTableWidget.vue';
import TopProductsWidget from '../components/widgets/TopProductsWidget.vue';
import type { DashboardGridItemState } from '../composables/useDashboardGrid';
import { getDashboardWidgetDefinition } from '../config/dashboard-widgets';

const vTooltip = Tooltip;

type WidgetListeners = Record<string, (...args: any[]) => void>;

type WidgetViewModel = {
  id: string;
  title: string;
  position: WidgetConfig['position'];
  minW: number;
  minH: number;
  component: Component | null;
  props: Record<string, unknown>;
  listeners?: WidgetListeners;
  className?: string;
};

type WidgetCatalogItem = {
  type: WidgetType;
  title: string;
  description: string;
  icon: string;
};

type LayoutChangePayload = {
  changedItems: DashboardGridItemState[];
  currentItems: DashboardGridItemState[];
};

const WIDGET_CATALOG_ITEMS: readonly WidgetCatalogItem[] = [
  {
    type: 'kpi-cards',
    title: 'Indicateurs clés',
    description: "Chiffre d'affaires, commandes, panier moyen et clients.",
    icon: 'pi pi-chart-bar',
  },
  {
    type: 'revenue-trend',
    title: "Tendance du chiffre d'affaires",
    description: "Graphique d'évolution des revenus sur la période.",
    icon: 'pi pi-chart-line',
  },
  {
    type: 'orders-table',
    title: 'Commandes',
    description: 'Liste paginée des commandes récentes.',
    icon: 'pi pi-list',
  },
  {
    type: 'top-products',
    title: 'Top produits',
    description: 'Classement des produits les plus vendus.',
    icon: 'pi pi-star',
  },
  {
    type: 'realtime-feed',
    title: 'Flux temps réel',
    description: 'Activité en direct de la boutique. Affiché en placeholder dans cette phase.',
    icon: 'pi pi-bolt',
  },
];

const router = useRouter();
const auth = useAuthStore();
const dashboard = useDashboardStore();
const orders = useOrdersStore();
const analytics = useAnalyticsStore();
const theme = useTheme();

const isWidgetCatalogVisible = ref(false);

const userEmail = computed(() => auth.user?.email ?? '');
const envLabel = computed(() => (auth.isDemo ? 'Démo publique' : 'Session utilisateur'));
const envSeverity = computed(() => (auth.isDemo ? 'warning' : 'success'));

const themeIcon = computed(() => (theme.isDark.value ? 'pi pi-sun' : 'pi pi-moon'));
const themeLabel = computed(() => (theme.isDark.value ? 'Clair' : 'Sombre'));

const resolvedWidgets = computed<WidgetViewModel[]>(() =>
  dashboard.orderedWidgets.map((widget) => buildWidgetViewModel(widget)),
);

const availableCatalogItems = computed<WidgetCatalogItem[]>(() => {
  if (!dashboard.hasLayout) {
    return [];
  }

  const availableTypes = new Set(dashboard.availableWidgetTypes);
  return WIDGET_CATALOG_ITEMS.filter((item) => availableTypes.has(item.type));
});

const canOpenWidgetCatalog = computed(() => {
  return dashboard.hasLayout && !dashboard.isLayoutLoading && dashboard.canAddMoreWidgets;
});

const widgetCatalogDisabledMessage = computed(() => {
  if (dashboard.isLayoutLoading) {
    return 'La disposition du tableau de bord est en cours de chargement.';
  }

  if (!dashboard.hasLayout) {
    return "La disposition du tableau de bord doit être chargée avant d'ajouter un widget.";
  }

  return 'Tous les widgets disponibles sont déjà présents dans le tableau de bord.';
});

onMounted(() => {
  dashboard.load();
});

async function handleLogout(): Promise<void> {
  await auth.logout();
  await router.replace('/login');
}

function openWidgetCatalog(): void {
  if (!canOpenWidgetCatalog.value) {
    return;
  }

  isWidgetCatalogVisible.value = true;
}

function closeWidgetCatalog(): void {
  isWidgetCatalogVisible.value = false;
}

async function handleAddWidget(type: WidgetType): Promise<void> {
  const addedWidget = dashboard.addWidget(type);

  if (!addedWidget) {
    return;
  }

  closeWidgetCatalog();

  if (auth.isDemo) {
    return;
  }

  await dashboard.persistLayout();
}

async function handleLayoutChange(payload: LayoutChangePayload): Promise<void> {
  await dashboard.applyGridLayoutAndPersist(payload.currentItems, {
    persistRemotely: !auth.isDemo,
  });
}

function handlePageChange(page: number): void {
  orders.setPage(page);
}

function handleSortChange(field: OrdersSortBy, order: 'asc' | 'desc'): void {
  orders.setSort(field, order);
}

function handleStatusChange(status: FinancialStatus | null): void {
  orders.setStatus(status ?? undefined);
}

function buildWidgetViewModel(widget: WidgetConfig): WidgetViewModel {
  const definition = getDashboardWidgetDefinition(widget.type);

  const base = {
    id: widget.id,
    title: widget.title,
    position: widget.position,
    minW: definition.minSize.minW,
    minH: definition.minSize.minH,
  } satisfies Pick<WidgetViewModel, 'id' | 'title' | 'position' | 'minW' | 'minH'>;

  switch (widget.type) {
    case 'kpi-cards':
      return {
        ...base,
        component: KpiCardWidget,
        className: 'widget-kpis',
        props: {
          kpis: analytics.kpis,
          loading: analytics.isLoading,
          error: analytics.error,
        },
      };

    case 'revenue-trend':
      return {
        ...base,
        component: RevenueTrendWidget,
        className: 'widget-trend',
        props: {
          salesTrend: analytics.salesTrend,
          loading: analytics.isLoading,
          error: analytics.error,
        },
      };

    case 'orders-table':
      return {
        ...base,
        component: OrdersTableWidget,
        className: 'widget-orders',
        props: {
          orders: orders.orders,
          total: orders.total,
          page: orders.page,
          limit: orders.limit,
          loading: orders.isLoading,
          error: orders.error,
          currentStatus: orders.query.status ?? null,
        },
        listeners: {
          'page-change': handlePageChange,
          'sort-change': handleSortChange,
          'status-change': handleStatusChange,
        },
      };

    case 'top-products':
      return {
        ...base,
        component: TopProductsWidget,
        className: 'widget-products',
        props: {
          topProducts: analytics.topProducts,
          loading: analytics.isLoading,
          error: analytics.error,
        },
      };

    case 'realtime-feed':
      return {
        ...base,
        component: null,
        className: 'widget-realtime',
        props: {},
      };
  }
}

async function handleRemoveWidget(widgetId: string): Promise<void> {
  const removedWidget = dashboard.removeWidget(widgetId);

  if (!removedWidget) {
    return;
  }

  if (auth.isDemo) {
    return;
  }

  await dashboard.persistLayout();
}
</script>

<template>
  <div class="page">
    <Toolbar class="header">
      <template #start>
        <div class="brand">
          <div class="brand-mark">
            <i class="pi pi-chart-bar" />
          </div>

          <div class="brand-text">
            <div class="brand-title-row">
              <span class="brand-title">Shopify Analytics</span>
              <Tag :value="envLabel" :severity="envSeverity" class="env-tag" />
            </div>

            <div class="brand-subtitle">
              Tableau de bord analytique • API et SPA sur la même origine
            </div>

            <div class="brand-subactions">
              <Button
                v-if="canOpenWidgetCatalog"
                icon="pi pi-plus"
                label="Ajouter un widget"
                size="small"
                severity="secondary"
                outlined
                @click="openWidgetCatalog"
              />

              <span
                v-else
                v-tooltip.bottom="widgetCatalogDisabledMessage"
                class="catalog-button-wrapper"
              >
                <Button
                  icon="pi pi-plus"
                  label="Ajouter un widget"
                  size="small"
                  severity="secondary"
                  outlined
                  disabled
                />
              </span>
            </div>
          </div>
        </div>
      </template>

      <template #end>
        <div class="actions">
          <Chip v-if="userEmail" class="user-chip">
            <span class="user-chip-inner" :title="userEmail">
              <i class="pi pi-user" />
              <span class="user-email">{{ userEmail }}</span>
            </span>
          </Chip>

          <Divider layout="vertical" class="v-divider" />

          <Button
            :icon="themeIcon"
            :label="themeLabel"
            text
            severity="secondary"
            @click="theme.toggleTheme()"
          />

          <Button
            icon="pi pi-sign-out"
            label="Déconnexion"
            text
            severity="secondary"
            @click="handleLogout"
          />
        </div>
      </template>
    </Toolbar>

    <Sidebar
      v-model:visible="isWidgetCatalogVisible"
      position="left"
      :style="{ width: '28rem', maxWidth: '100vw' }"
    >
      <WidgetCatalog :items="availableCatalogItems" @add-widget="handleAddWidget" />
    </Sidebar>

    <div v-if="auth.isDemo" class="notice">
      <i class="pi pi-info-circle" />
      <span>
        Mode démo : données fictives, réinitialisées régulièrement. Ne pas utiliser de données
        réelles.
      </span>
    </div>

    <div v-if="auth.isDemo" class="notice notice-secondary">
      <i class="pi pi-lock" />
      <span>La disposition du tableau de bord n'est pas sauvegardée en mode démo.</span>
    </div>

    <main class="content">
      <div class="container">
        <div v-if="dashboard.isLayoutLoading && !dashboard.hasLayout" class="layout-state">
          <i class="pi pi-spin pi-spinner" />
          <span>Chargement de la disposition du tableau de bord…</span>
        </div>

        <div
          v-else-if="dashboard.layoutError && !dashboard.hasLayout"
          class="layout-state layout-state-error"
        >
          <i class="pi pi-exclamation-triangle" />
          <span>{{ dashboard.layoutError }}</span>
        </div>

        <div v-else-if="!dashboard.hasWidgets" class="layout-state">
          <i class="pi pi-inbox" />
          <span>Aucun widget n'est configuré sur ce tableau de bord.</span>
        </div>

        <DashboardGrid
          v-else
          :widgets="resolvedWidgets"
          @layout-change="handleLayoutChange"
          @remove-widget="handleRemoveWidget"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--p-surface-ground);
  color: var(--p-text-color);
}

.header {
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
  background: color-mix(in srgb, var(--p-surface-card), transparent 0%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-mark {
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
  color: var(--p-primary-color);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.brand-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-title {
  font-weight: 700;
  letter-spacing: -0.2px;
}

.brand-subtitle {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.brand-subactions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.catalog-button-wrapper {
  display: inline-flex;
}

.env-tag {
  font-size: 0.75rem;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.v-divider {
  height: 1.5rem;
  margin: 0 0.25rem;
  opacity: 0.5;
}

.user-chip {
  max-width: 280px;
}

.user-chip-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 260px;
}

.user-email {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  background: color-mix(in srgb, var(--p-primary-color), transparent 94%);
  border-bottom: 1px solid color-mix(in srgb, var(--p-primary-color), transparent 80%);
  color: var(--p-text-color);
}

.notice i {
  color: var(--p-primary-color);
}

.notice-secondary {
  background: color-mix(in srgb, var(--p-orange-500), transparent 94%);
  border-bottom-color: color-mix(in srgb, var(--p-orange-500), transparent 80%);
}

.notice-secondary i {
  color: var(--p-orange-500);
}

.content {
  padding: 1.25rem 1rem 2rem;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
}

.layout-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 240px;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-surface-card);
  color: var(--p-text-muted-color);
}

.layout-state-error {
  color: var(--p-red-500);
}

@media (max-width: 640px) {
  .brand-subtitle {
    display: none;
  }

  .user-chip {
    display: none;
  }

  .brand-subactions {
    margin-top: 0.35rem;
  }
}
</style>
