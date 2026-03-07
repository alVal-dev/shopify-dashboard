import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import { useTheme } from './useTheme';

export type EchartsTheme = {
  option: EChartsOption;
  seriesColors: string[];

  tokens: {
    isDark: boolean;
    textColor: string;
    mutedTextColor: string;
    borderColor: string;
    surfaceCard: string;
    primaryColor: string;
  };
};

function readCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const value = raw.trim();
  return value || fallback;
}

const LIGHT_PALETTE = [
  '#3B82F6',
  '#22C55E',
  '#F97316',
  '#A855F7',
  '#06B6D4',
  '#EC4899',
  '#EF4444',
  '#64748B',
];

const DARK_PALETTE = [
  '#60A5FA',
  '#4ADE80',
  '#FB923C',
  '#C084FC',
  '#22D3EE',
  '#F472B6',
  '#F87171',
  '#94A3B8',
];

export function useEchartsTheme() {
  const appTheme = useTheme();

  const theme = computed<EchartsTheme>(() => {
    const isDark = appTheme.isDark.value;

    const textColor = readCssVar('--p-text-color', isDark ? '#E5E7EB' : '#111827');
    const mutedTextColor = readCssVar('--p-text-muted-color', isDark ? '#9CA3AF' : '#6B7280');
    const borderColor = readCssVar('--p-surface-border', isDark ? '#374151' : '#E5E7EB');
    const surfaceCard = readCssVar('--p-surface-card', isDark ? '#111827' : '#FFFFFF');
    const primaryColor = readCssVar('--p-primary-color', isDark ? '#60A5FA' : '#3B82F6');

    const basePalette = (isDark ? DARK_PALETTE : LIGHT_PALETTE).slice();
    basePalette[0] = primaryColor;
    const seriesColors = basePalette;

    const option: EChartsOption = {
      color: seriesColors,
      backgroundColor: 'transparent',

      textStyle: {
        color: textColor,
        fontFamily:
          'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      },

      grid: {
        left: 12,
        right: 12,
        top: 24,
        bottom: 12,
        containLabel: true,
      },

      legend: {
        textStyle: { color: mutedTextColor },
      },

      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: surfaceCard,
        borderColor,
        borderWidth: 1,
        textStyle: { color: textColor },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: borderColor,
            width: 1,
            type: 'dashed',
          },
        },
      },

      xAxis: {
        type: 'category',
        axisTick: { show: false },
        axisLine: { lineStyle: { color: borderColor } },
        axisLabel: { color: mutedTextColor },
        splitLine: { show: false },
      },

      yAxis: {
        type: 'value',
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: mutedTextColor },
        splitLine: { show: true, lineStyle: { color: borderColor } },
      },
    };

    return {
      option,
      seriesColors,
      tokens: {
        isDark,
        textColor,
        mutedTextColor,
        borderColor,
        surfaceCard,
        primaryColor,
      },
    };
  });

  return { theme };
}
