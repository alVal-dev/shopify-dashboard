<script setup lang="ts">
import { computed, onMounted, type Component, type CSSProperties } from 'vue';
import { useRouter } from 'vue-router';
import type { FinancialStatus, WidgetConfig, WidgetType } from '@shared/types';
import type { OrdersSortBy } from '../api/query';

import Toolbar from 'primevue/toolbar';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Chip from 'primevue/chip';
import Divider from 'primevue/divider';

import { useAuthStore } from '../stores/auth';
import { useDashboardStore } from '../stores/dashboard';
import { useOrdersStore } from '../stores/orders';
import { useAnalyticsStore } from '../stores/analytics';
import { useTheme } from '../composables/useTheme';

import KpiCardWidget from '../components/widgets/KpiCardWidget.vue';
import RevenueTrendWidget from '../components/widgets/RevenueTrendWidget.vue';
import OrdersTableWidget from '../components/widgets/OrdersTableWidget.vue';
import TopProductsWidget from '../components/widgets/TopProductsWidget.vue';

type WidgetGridStyle = CSSProperties & {
  '--widget-col-start': string;
  '--widget-col-span': string;
  '--widget-row-start': string;
  '--widget-row-span': string;
};

type WidgetListeners = {
  'page-change'?: (page: number) => void;
  'sort-change'?: (field: OrdersSortBy, order: 'asc' | 'desc') => void;
  'status-change'?: (status: FinancialStatus | null) => void;
};

type WidgetViewModel = {
  id: string;
  title: string;
  component: Component | null;
  props: Record<string, unknown>;
  listeners: WidgetListeners;
  className: string;
  style: WidgetGridStyle;
};

const router = useRouter();
const auth = useAuthStore();
const dashboard = useDashboardStore();
const orders = useOrdersStore();
const analytics = useAnalyticsStore();
const theme = useTheme();

const userEmail = computed(() => auth.user?.email ?? '');
const envLabel = computed(() => (auth.isDemo ? 'Démo publique' : 'Session utilisateur'));
const envSeverity = computed(() => (auth.isDemo ? 'warning' : 'success'));

const themeIcon = computed(() => (theme.isDark.value ? 'pi pi-sun' : 'pi pi-moon'));
const themeLabel = computed(() => (theme.isDark.value ? 'Clair' : 'Sombre'));

const resolvedWidgets = computed<WidgetViewModel[]>(() =>
  dashboard.orderedWidgets.map((widget) => buildWidgetViewModel(widget)),
);

onMounted(() => {
  dashboard.load();
});

async function handleLogout(): Promise<void> {
  await auth.logout();
  await router.replace('/login');
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

function getWidgetGridStyle(widget: WidgetConfig): WidgetGridStyle {
  return {
    '--widget-col-start': String(widget.position.x + 1),
    '--widget-col-span': String(widget.position.w),
    '--widget-row-start': String(widget.position.y + 1),
    '--widget-row-span': String(widget.position.h),
  };
}

function buildWidgetViewModel(widget: WidgetConfig): WidgetViewModel {
  const base = {
    id: widget.id,
    title: widget.title,
    style: getWidgetGridStyle(widget),
    listeners: {},
  } satisfies Omit<WidgetViewModel, 'component' | 'props' | 'className'>;

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

        <div v-else class="widgets-grid">
          <div
            v-for="widget in resolvedWidgets"
            :key="widget.id"
            class="widget-cell"
            :class="widget.className"
            :style="widget.style"
          >
            <component
              v-if="widget.component"
              :is="widget.component"
              v-bind="widget.props"
              v-on="widget.listeners"
            />

            <div v-else class="unsupported-widget">
              <div class="unsupported-widget-title">{{ widget.title }}</div>
              <div class="unsupported-widget-text">
                Ce widget n'est pas encore disponible dans cette phase du tableau de bord.
              </div>
            </div>
          </div>
        </div>
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

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: minmax(120px, auto);
  gap: 1rem;
}

.widget-cell {
  min-height: 0;
  grid-column: var(--widget-col-start) / span var(--widget-col-span);
  grid-row: var(--widget-row-start) / span var(--widget-row-span);
}

.widget-kpis {
  min-height: 200px;
}

.widget-trend {
  min-height: 300px;
}

.widget-orders {
  min-height: 400px;
}

.widget-products,
.widget-realtime {
  min-height: 300px;
}

.unsupported-widget {
  display: flex;
  height: 100%;
  min-height: inherit;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  border: 1px dashed var(--p-content-border-color);
  border-radius: 1rem;
  background: var(--p-surface-card);
}

.unsupported-widget-title {
  font-weight: 600;
}

.unsupported-widget-text {
  color: var(--p-text-muted-color);
}

@media (max-width: 900px) {
  .widget-cell {
    grid-column: 1 / -1;
    grid-row: auto;
  }

  .widget-kpis,
  .widget-trend,
  .widget-orders,
  .widget-products,
  .widget-realtime {
    min-height: 300px;
  }

  .widget-orders {
    min-height: 400px;
  }
}

@media (max-width: 640px) {
  .brand-subtitle {
    display: none;
  }

  .user-chip {
    display: none;
  }
}
</style>
