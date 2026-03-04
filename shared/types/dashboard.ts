export type WidgetType =
  | 'kpi-cards'
  | 'revenue-trend'
  | 'orders-table'
  | 'top-products'
  | 'realtime-feed';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
}

export interface DashboardLayout {
  widgets: WidgetConfig[];
}
