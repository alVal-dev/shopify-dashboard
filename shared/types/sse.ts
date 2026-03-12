import type { AnalyticsSnapshot } from './analytics';
import type { Order } from './shop';

export type SseEventName = 'order.created' | 'analytics.updated' | 'stock.alert' | 'heartbeat';

export interface StockAlertEventPayload {
  id: string;
  productId: string;
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  inventoryQuantity: number;
  threshold: number;
  occurredAt: string; // ISO 8601 UTC
}

export interface HeartbeatEventPayload {
  sentAt: string; // ISO 8601 UTC
}

export interface SseEventPayloadMap {
  'order.created': Order;
  'analytics.updated': AnalyticsSnapshot;
  'stock.alert': StockAlertEventPayload;
  heartbeat: HeartbeatEventPayload;
}

export type SseEventPayload<TEventName extends SseEventName> = SseEventPayloadMap[TEventName];

export type ParsedSseEvent = {
  [TEventName in SseEventName]: {
    type: TEventName;
    payload: SseEventPayloadMap[TEventName];
  };
}[SseEventName];
