import type { DashboardLayout } from '@shared/types';

export const DEFAULT_LAYOUT = {
  widgets: [
    {
      id: 'kpi-1',
      type: 'kpi-cards',
      title: 'Indicateurs clés',
      position: { x: 0, y: 0, w: 6, h: 3 },
    },
    {
      id: 'trend-1',
      type: 'revenue-trend',
      title: "Tendance du chiffre d'affaires",
      position: { x: 6, y: 0, w: 6, h: 3 },
    },
    {
      id: 'orders-1',
      type: 'orders-table',
      title: 'Commandes récentes',
      position: { x: 0, y: 2, w: 6, h: 3 },
    },
    {
      id: 'products-1',
      type: 'top-products',
      title: 'Top produits',
      position: { x: 6, y: 2, w: 6, h: 3 },
    },
  ],
} satisfies DashboardLayout;
