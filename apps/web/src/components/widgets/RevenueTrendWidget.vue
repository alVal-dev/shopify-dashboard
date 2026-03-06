<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import type { SalesTrend } from '@shared/types';
import { VChart } from '../../plugins/echarts';
import { useEchartsTheme } from '../../composables/useEchartsTheme';
import { formatCurrency } from '../../utils/format';
import WidgetWrapper from '../WidgetWrapper.vue';

interface Props {
  salesTrend: SalesTrend;
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
});

const { theme } = useEchartsTheme();

/**
 * Formate une date ISO (YYYY-MM-DD) en format court (DD/MM)
 */
function formatDateShort(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

/**
 * Formate une date ISO en format long pour le tooltip (D MMM YYYY)
 */
function formatDateLong(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Formate l'axe Y (euros sans centimes)
 */
function formatAxisValue(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

const chartOption = computed<EChartsOption>(() => {
  const dates = props.salesTrend.map((p) => formatDateShort(p.date));
  const revenues = props.salesTrend.map((p) => p.revenueCents / 100);

  const primaryColor = theme.value.seriesColors[0];

  return {
    ...theme.value.option,
    xAxis: {
      ...theme.value.option.xAxis,
      data: dates,
    },
    yAxis: {
      ...theme.value.option.yAxis,
      axisLabel: {
        ...(theme.value.option.yAxis as any)?.axisLabel,
        formatter: formatAxisValue,
      },
    },
    tooltip: {
      ...theme.value.option.tooltip,
      formatter: (params: any) => {
        const index = params[0]?.dataIndex;
        if (index === undefined) return '';

        const point = props.salesTrend[index];
        if (!point) return '';

        const dateFormatted = formatDateLong(point.date);
        const revenueFormatted = formatCurrency(point.revenueCents);

        return `${dateFormatted}<br/><strong>${revenueFormatted}</strong>`;
      },
    },
    series: [
      {
        type: 'line',
        name: "Chiffre d'affaires",
        data: revenues,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          width: 2,
          color: primaryColor,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${primaryColor}40` },
              { offset: 1, color: `${primaryColor}05` },
            ],
          },
        },
      },
    ],
  };
});

const hasData = computed(() => props.salesTrend.length > 0);
</script>

<template>
  <WidgetWrapper title="Tendance du chiffre d'affaires" icon="pi pi-chart-line" :loading="loading">
    <div v-if="error" class="error-state">
      <i class="pi pi-exclamation-triangle" />
      <span>{{ error }}</span>
    </div>

    <div v-else-if="!hasData" class="empty-state">
      <i class="pi pi-info-circle" />
      <span>Aucune donnée disponible</span>
    </div>

    <VChart v-else :option="chartOption" autoresize class="chart" />
  </WidgetWrapper>
</template>

<style scoped>
.error-state,
.empty-state {
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

.empty-state i {
  color: var(--p-blue-500);
}

.chart {
  width: 100%;
  height: 100%;
  min-height: 250px;
}
</style>
