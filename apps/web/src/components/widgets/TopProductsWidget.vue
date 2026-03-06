<script setup lang="ts">
import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import type { TopProduct } from '@shared/types';
import { VChart } from '../../plugins/echarts';
import { useEchartsTheme } from '../../composables/useEchartsTheme';
import { formatCurrency, formatNumber } from '../../utils/format';
import WidgetWrapper from '../WidgetWrapper.vue';

interface Props {
  topProducts: TopProduct[];
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
});

const { theme } = useEchartsTheme();

const chartOption = computed<EChartsOption>(() => {
  // Inverser l'ordre pour que le #1 soit en haut
  const products = [...props.topProducts].reverse();

  const titles = products.map((p) => p.title);
  const revenues = products.map((p) => p.revenueCents / 100);

  const primaryColor = theme.value.seriesColors[0];

  return {
    ...theme.value.option,
    grid: {
      ...theme.value.option.grid,
      left: 12,
      right: 24,
      top: 12,
      bottom: 12,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        ...(theme.value.option.xAxis as any)?.axisLabel,
        formatter: (value: number) => {
          return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
            notation: 'compact',
          }).format(value);
        },
      },
      splitLine: {
        lineStyle: {
          color: theme.value.tokens.borderColor,
        },
      },
    },
    yAxis: {
      type: 'category',
      data: titles,
      axisTick: {
        show: false,
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: theme.value.tokens.mutedTextColor,
        width: 120,
        overflow: 'truncate',
        ellipsis: '...',
      },
    },
    tooltip: {
      ...theme.value.option.tooltip,
      trigger: 'item',
      formatter: (params: any) => {
        const index = products.length - 1 - params.dataIndex;
        const product = props.topProducts[index];
        if (!product) return '';

        const revenueFormatted = formatCurrency(product.revenueCents);
        const unitsSoldFormatted = formatNumber(product.unitsSold);

        return `<strong>${product.title}</strong><br/>${revenueFormatted} (${unitsSoldFormatted} vendus)`;
      },
    },
    series: [
      {
        type: 'bar',
        data: revenues,
        barWidth: '60%',
        itemStyle: {
          color: primaryColor,
          borderRadius: [0, 4, 4, 0],
        },
      },
    ],
  };
});

const hasData = computed(() => props.topProducts.length > 0);
</script>

<template>
  <WidgetWrapper title="Top produits" icon="pi pi-star" :loading="loading">
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
