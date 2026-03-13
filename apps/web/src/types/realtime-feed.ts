import type { Order, StockAlertEventPayload } from '@shared/types';

export type RealtimeFeedItem =
  | {
      id: string;
      kind: 'order.created';
      occurredAt: string;
      order: Order;
    }
  | {
      id: string;
      kind: 'stock.alert';
      occurredAt: string;
      alert: StockAlertEventPayload;
    };
