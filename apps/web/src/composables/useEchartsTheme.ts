import { computed } from 'vue';
import type { EChartsOption } from 'echarts';
import { useTheme } from './useTheme';

export type EchartsTheme = {
  /**
   * Option ECharts “base” à merger dans chaque widget.
   * Exemple: option = { ...theme.value.option, ...widgetSpecificOption }
   */
  option: EChartsOption;

  /**
   * Palette finale utilisée par ECharts (utile si tu veux la réutiliser explicitement).
   */
  seriesColors: string[];

  /**
   * Tokens atomiques (utile pour formatter tooltip/labels, styles custom, etc.)
   */
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

// Palette cohérente “Aura-like” (bleu/vert/orange/violet…)
// Variante dark = couleurs légèrement plus claires pour garder du contraste sur fond sombre.
const LIGHT_PALETTE = [
  '#3B82F6', // blue-500
  '#22C55E', // green-500
  '#F97316', // orange-500
  '#A855F7', // purple-500
  '#06B6D4', // cyan-500
  '#EC4899', // pink-500
  '#EF4444', // red-500
  '#64748B', // slate-500
];

const DARK_PALETTE = [
  '#60A5FA', // blue-400
  '#4ADE80', // green-400
  '#FB923C', // orange-400
  '#C084FC', // purple-400
  '#22D3EE', // cyan-400
  '#F472B6', // pink-400
  '#F87171', // red-400
  '#94A3B8', // slate-400
];

export function useEchartsTheme() {
  const appTheme = useTheme();

  const theme = computed<EchartsTheme>(() => {
    const isDark = appTheme.isDark.value;

    // Tokens PrimeVue Aura (fallback si jamais indisponibles)
    const textColor = readCssVar('--p-text-color', isDark ? '#E5E7EB' : '#111827');
    const mutedTextColor = readCssVar('--p-text-muted-color', isDark ? '#9CA3AF' : '#6B7280');
    const borderColor = readCssVar('--p-surface-border', isDark ? '#374151' : '#E5E7EB');
    const surfaceCard = readCssVar('--p-surface-card', isDark ? '#111827' : '#FFFFFF');
    const primaryColor = readCssVar('--p-primary-color', isDark ? '#60A5FA' : '#3B82F6');

    // Palette finale :
    // - on part d’une palette fixe (light/dark)
    // - puis on remplace la 1ère couleur par la primary PrimeVue
    //   pour coller exactement au thème Aura choisi.
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

      // Grid “dashboard” (évite que labels/axes soient coupés)
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

      // Axes : style sobre (splitLine surtout sur Y)
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
