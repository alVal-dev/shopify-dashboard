<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

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

const router = useRouter();
const auth = useAuthStore();
const dashboard = useDashboardStore();
const orders = useOrdersStore();
const analytics = useAnalyticsStore();
const theme = useTheme();

const userEmail = computed(() => auth.user?.email ?? '');
const envLabel = computed(() => (auth.isDemo ? 'Sandbox demo' : 'User session'));
const envSeverity = computed(() => (auth.isDemo ? 'warning' : 'success'));

const themeIcon = computed(() => (theme.isDark.value ? 'pi pi-sun' : 'pi pi-moon'));
const themeLabel = computed(() => (theme.isDark.value ? 'Light' : 'Dark'));

onMounted(() => {
  dashboard.load();
});

async function handleLogout(): Promise<void> {
  await auth.logout();
  await router.replace('/login');
}

function handlePageChange(page: number) {
  orders.setPage(page);
}

function handleSortChange(field: string, order: 'asc' | 'desc') {
  const sortBy = field as 'createdAt' | 'totalPriceCents' | 'orderNumber';
  orders.setSort(sortBy, order);
}

function handleStatusChange(status: 'pending' | 'paid' | 'refunded' | 'cancelled' | null) {
  orders.setStatus(status ?? undefined);
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
              Data-viz dashboard sandbox • Single-origin (API + SSE + SPA)
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
            label="Logout"
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

    <main class="content">
      <div class="container">
        <div class="widgets-grid">
          <div class="widget-cell widget-kpis">
            <KpiCardWidget
              :kpis="analytics.kpis"
              :loading="analytics.isLoading"
              :error="analytics.error"
            />
          </div>

          <div class="widget-cell widget-trend">
            <RevenueTrendWidget
              :sales-trend="analytics.salesTrend"
              :loading="analytics.isLoading"
              :error="analytics.error"
            />
          </div>

          <div class="widget-cell widget-orders">
            <OrdersTableWidget
              :orders="orders.orders"
              :total="orders.total"
              :page="orders.page"
              :limit="orders.limit"
              :loading="orders.isLoading"
              :error="orders.error"
              :current-status="orders.query.status ?? null"
              @page-change="handlePageChange"
              @sort-change="handleSortChange"
              @status-change="handleStatusChange"
            />
          </div>

          <div class="widget-cell widget-products">
            <TopProductsWidget
              :top-products="analytics.topProducts"
              :loading="analytics.isLoading"
              :error="analytics.error"
            />
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

.content {
  padding: 1.25rem 1rem 2rem;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
}

.widgets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.widget-cell {
  min-height: 0;
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

.widget-products {
  min-height: 300px;
}

@media (max-width: 900px) {
  .widgets-grid {
    grid-template-columns: 1fr;
  }

  .widget-kpis,
  .widget-trend,
  .widget-orders,
  .widget-products {
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
