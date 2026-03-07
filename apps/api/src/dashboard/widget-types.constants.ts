import type { WidgetType } from '@shared/types';

export const WIDGET_TYPES = [
  'kpi-cards',
  'revenue-trend',
  'orders-table',
  'top-products',
  'realtime-feed',
] as const satisfies readonly WidgetType[];
