<script setup lang="ts">
import { computed } from 'vue';
import type { KpiMetrics } from '@shared/types';
import WidgetWrapper from '../WidgetWrapper.vue';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/format';

interface Props {
  kpis: KpiMetrics | null;
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
});

interface KpiItem {
  key: string;
  label: string;
  icon: string;
  value: string;
  change: number;
}

const kpiItems = computed<KpiItem[]>(() => {
  if (!props.kpis) {
    return [
      { key: 'revenue', label: "Chiffre d'affaires", icon: 'pi pi-euro', value: '—', change: 0 },
      { key: 'orders', label: 'Commandes', icon: 'pi pi-shopping-cart', value: '—', change: 0 },
      { key: 'aov', label: 'Panier moyen', icon: 'pi pi-calculator', value: '—', change: 0 },
      { key: 'customers', label: 'Clients', icon: 'pi pi-users', value: '—', change: 0 },
    ];
  }

  return [
    {
      key: 'revenue',
      label: "Chiffre d'affaires",
      icon: 'pi pi-euro',
      value: formatCurrency(props.kpis.revenueCents),
      change: props.kpis.revenueChange,
    },
    {
      key: 'orders',
      label: 'Commandes',
      icon: 'pi pi-shopping-cart',
      value: formatNumber(props.kpis.ordersCount),
      change: props.kpis.ordersCountChange,
    },
    {
      key: 'aov',
      label: 'Panier moyen',
      icon: 'pi pi-calculator',
      value: formatCurrency(props.kpis.averageOrderValueCents),
      change: props.kpis.averageOrderValueChange,
    },
    {
      key: 'customers',
      label: 'Clients',
      icon: 'pi pi-users',
      value: formatNumber(props.kpis.customersCount),
      change: props.kpis.customersCountChange,
    },
  ];
});

function getChangeClass(change: number): string {
  if (change > 0) return 'change--positive';
  if (change < 0) return 'change--negative';
  return '';
}

function getChangeIcon(change: number): string {
  if (change > 0) return 'pi pi-arrow-up';
  if (change < 0) return 'pi pi-arrow-down';
  return '';
}
</script>

<template>
  <WidgetWrapper title="Indicateurs clés" icon="pi pi-chart-bar" :loading="loading">
    <div v-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ error }}</span>
    </div>

    <div v-else class="kpi-grid">
      <div v-for="item in kpiItems" :key="item.key" class="kpi-card">
        <div class="kpi-header">
          <i :class="item.icon" class="kpi-icon" />
          <span class="kpi-label">{{ item.label }}</span>
        </div>

        <div class="kpi-value">{{ item.value }}</div>

        <div v-if="item.change !== 0" :class="['kpi-change', getChangeClass(item.change)]">
          <i :class="getChangeIcon(item.change)" />
          <span>{{ formatPercent(item.change) }}</span>
        </div>
      </div>
    </div>
  </WidgetWrapper>
</template>

<style scoped>
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 100%;
  color: var(--p-text-muted-color);
}

.error-state i {
  color: var(--p-orange-500);
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  height: 100%;
}

@media (max-width: 640px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: var(--p-border-radius);
  border: 1px solid var(--p-surface-border);
  background: var(--p-surface-ground);
}

.kpi-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.kpi-icon {
  color: var(--p-primary-color);
  font-size: 0.9rem;
}

.kpi-label {
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.kpi-change {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.85rem;
  font-weight: 500;
}

.kpi-change i {
  font-size: 0.75rem;
}

.change--positive {
  color: var(--p-green-500);
}

.change--negative {
  color: var(--p-red-500);
}
</style>
