import type { WidgetType } from '@shared/types';

export interface DashboardWidgetDefinition {
  title: string;
  size: {
    w: number;
    h: number;
  };
  minSize: {
    minW: number;
    minH: number;
  };
}

export const ALL_WIDGET_TYPES: WidgetType[] = [
  'kpi-cards',
  'revenue-trend',
  'orders-table',
  'top-products',
  'realtime-feed',
];

export const DASHBOARD_WIDGET_DEFINITIONS: Record<WidgetType, DashboardWidgetDefinition> = {
  'kpi-cards': {
    title: 'Indicateurs clés',
    size: { w: 12, h: 2 },
    minSize: { minW: 6, minH: 2 },
  },
  'revenue-trend': {
    title: "Tendance du chiffre d'affaires",
    size: { w: 8, h: 3 },
    minSize: { minW: 4, minH: 2 },
  },
  'orders-table': {
    title: 'Commandes',
    size: { w: 8, h: 4 },
    minSize: { minW: 6, minH: 3 },
  },
  'top-products': {
    title: 'Top produits',
    size: { w: 4, h: 3 },
    minSize: { minW: 3, minH: 2 },
  },
  'realtime-feed': {
    title: 'Flux temps réel',
    size: { w: 4, h: 3 },
    minSize: { minW: 3, minH: 2 },
  },
};

export function getDashboardWidgetDefinition(type: WidgetType): DashboardWidgetDefinition {
  return DASHBOARD_WIDGET_DEFINITIONS[type];
}
