import { Injectable, Logger } from '@nestjs/common';
import type {
  AnalyticsSnapshot,
  HeartbeatEventPayload,
  Order,
  Product,
  ProductVariant,
  StockAlertEventPayload,
} from '@shared/types';
import { randomUUID } from 'node:crypto';

import { AnalyticsGenerator } from '../mock-shopify/generators/analytics.generator';
import { OrdersGenerator } from '../mock-shopify/generators/orders.generator';
import { MockShopifyDataService } from '../mock-shopify/mock-shopify-data.service';
import { SseSessionRegistryService } from './sse-session-registry.service';

const ORDER_CREATED_MIN_DELAY_MS = 5_000;
const ORDER_CREATED_MAX_DELAY_MS = 15_000;
const ANALYTICS_UPDATED_DELAY_MS = 30_000;
const STOCK_ALERT_MIN_DELAY_MS = 45_000;
const STOCK_ALERT_MAX_DELAY_MS = 90_000;
const STOCK_ALERT_THRESHOLD = 5;
const STOCK_ALERT_PROBABILITY = 0.3;
const HEARTBEAT_DELAY_MS = 30_000;

@Injectable()
export class SseRealtimeSimulationService {
  private readonly logger = new Logger(SseRealtimeSimulationService.name);
  private readonly activeSessionIds = new Set<string>();

  constructor(
    private readonly registry: SseSessionRegistryService,
    private readonly mockShopifyDataService: MockShopifyDataService,
    private readonly ordersGenerator: OrdersGenerator,
    private readonly analyticsGenerator: AnalyticsGenerator,
  ) {}

  startForSession(sessionId: string): boolean {
    if (this.activeSessionIds.has(sessionId)) {
      this.logger.debug(`SSE simulation already active. sessionId=${sessionId}`);
      return false;
    }

    const runtime = this.registry.get(sessionId);
    if (!runtime) {
      this.logger.warn(
        `SSE simulation start skipped: runtime not found for sessionId=${sessionId}`,
      );
      return false;
    }

    this.mockShopifyDataService.getOrInitForSession(sessionId);
    this.activeSessionIds.add(sessionId);

    this.scheduleNextOrderCreated(sessionId);
    this.scheduleNextAnalyticsUpdated(sessionId);
    this.scheduleNextStockAlert(sessionId);
    this.scheduleNextHeartbeat(sessionId);

    this.logger.log(
      `SSE simulation started. sessionId=${sessionId} activeSimulations=${this.size()}`,
    );

    return true;
  }

  stopForSession(sessionId: string): boolean {
    if (!this.activeSessionIds.has(sessionId)) {
      this.logger.debug(`SSE simulation already inactive. sessionId=${sessionId}`);
      return false;
    }

    this.activeSessionIds.delete(sessionId);

    this.logger.log(
      `SSE simulation stopped. sessionId=${sessionId} activeSimulations=${this.size()}`,
    );

    return true;
  }

  isActive(sessionId: string): boolean {
    return this.activeSessionIds.has(sessionId);
  }

  size(): number {
    return this.activeSessionIds.size;
  }

  private scheduleNextOrderCreated(sessionId: string): void {
    if (!this.isActive(sessionId)) {
      return;
    }

    const runtime = this.registry.get(sessionId);
    if (!runtime) {
      this.activeSessionIds.delete(sessionId);
      this.logger.warn(
        `SSE order.created scheduling stopped: runtime not found for sessionId=${sessionId}`,
      );
      return;
    }

    if (runtime.timers.orderCreated) {
      clearTimeout(runtime.timers.orderCreated);
      runtime.timers.orderCreated = null;
    }

    const delayMs = this.randomDelayMs(ORDER_CREATED_MIN_DELAY_MS, ORDER_CREATED_MAX_DELAY_MS);

    runtime.timers.orderCreated = setTimeout(() => {
      const currentRuntime = this.registry.get(sessionId);
      if (currentRuntime) {
        currentRuntime.timers.orderCreated = null;
      }

      this.handleOrderCreatedTick(sessionId);
    }, delayMs);

    this.logger.debug(`SSE order.created scheduled. sessionId=${sessionId} delayMs=${delayMs}`);
  }

  private handleOrderCreatedTick(sessionId: string): void {
    if (!this.isActive(sessionId)) {
      return;
    }

    const runtime = this.registry.get(sessionId);
    if (!runtime) {
      this.activeSessionIds.delete(sessionId);
      this.logger.warn(
        `SSE order.created tick skipped: runtime not found for sessionId=${sessionId}`,
      );
      return;
    }

    const result: { order: Order | null } = { order: null };

    try {
      this.mockShopifyDataService.update(sessionId, (snapshot) => {
        const nextOrderNumber = this.getNextOrderNumber(snapshot.orders);
        const currency = snapshot.orders[0]?.currency ?? 'EUR';

        const order = this.ordersGenerator.generateOne({
          products: snapshot.products,
          customers: snapshot.customers,
          currency,
          orderNumber: nextOrderNumber,
        });

        if (!order) {
          return;
        }

        snapshot.orders.unshift(order);
        snapshot.analytics = this.analyticsGenerator.compute(snapshot.orders, snapshot.products);
        result.order = order;
      });

      const createdOrder = result.order;

      if (createdOrder) {
        this.registry.emit(sessionId, {
          event: 'order.created',
          data: createdOrder,
        });

        this.logger.debug(
          `SSE order.created emitted. sessionId=${sessionId} orderId=${createdOrder.id} orderNumber=${createdOrder.orderNumber}`,
        );
      } else {
        this.logger.debug(
          `SSE order.created skipped: generator returned null. sessionId=${sessionId}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `SSE order.created tick failed. sessionId=${sessionId} message=${message}`,
        stack,
      );
    }

    this.scheduleNextOrderCreated(sessionId);
  }

  private scheduleNextAnalyticsUpdated(sessionId: string): void {
    if (!this.isActive(sessionId)) {
      return;
    }

    const runtime = this.registry.get(sessionId);
    if (!runtime) {
      this.activeSessionIds.delete(sessionId);
      this.logger.warn(
        `SSE analytics.updated scheduling stopped: runtime not found for sessionId=${sessionId}`,
      );
      return;
    }

    if (runtime.timers.analyticsUpdated) {
      clearTimeout(runtime.timers.analyticsUpdated);
      runtime.timers.analyticsUpdated = null;
    }

    runtime.timers.analyticsUpdated = setTimeout(() => {
      const currentRuntime = this.registry.get(sessionId);
      if (currentRuntime) {
        currentRuntime.timers.analyticsUpdated = null;
      }

      this.handleAnalyticsUpdatedTick(sessionId);
    }, ANALYTICS_UPDATED_DELAY_MS);

    this.logger.debug(
      `SSE analytics.updated scheduled. sessionId=${sessionId} delayMs=${ANALYTICS_UPDATED_DELAY_MS}`,
    );
  }

  private handleAnalyticsUpdatedTick(sessionId: string): void {
    if (!this.isActive(sessionId)) {
      return;
    }

    const runtime = this.registry.get(sessionId);
    if (!runtime) {
      this.activeSessionIds.delete(sessionId);
      this.logger.warn(
        `SSE analytics.updated tick skipped: runtime not found for sessionId=${sessionId}`,
      );
      return;
    }

    const result: { analytics: AnalyticsSnapshot | null } = { analytics: null };

    try {
      this.mockShopifyDataService.update(sessionId, (snapshot) => {
        snapshot.analytics = this.analyticsGenerator.compute(snapshot.orders, snapshot.products);
        result.analytics = snapshot.analytics;
      });

      const analyticsSnapshot = result.analytics;

      if (analyticsSnapshot) {
        this.registry.emit(sessionId, {
          event: 'analytics.updated',
          data: analyticsSnapshot,
        });

        this.logger.debug(`SSE analytics.updated emitted. sessionId=${sessionId}`);
      } else {
        this.logger.warn(
          `SSE analytics.updated skipped: no analytics snapshot produced. sessionId=${sessionId}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `SSE analytics.updated tick failed. sessionId=${sessionId} message=${message}`,
        stack,
      );
    }

    this.scheduleNextAnalyticsUpdated(sessionId);
  }

  private scheduleNextStockAlert(sessionId: string): void {
    if (!this.isActive(sessionId)) {
      return;
    }

    const runtime = this.registry.get(sessionId);
    if (!runtime) {
      this.activeSessionIds.delete(sessionId);
      this.logger.warn(
        `SSE stock.alert scheduling stopped: runtime not found for sessionId=${sessionId}`,
      );
      return;
    }

    if (runtime.timers.stockAlert) {
      clearTimeout(runtime.timers.stockAlert);
      runtime.timers.stockAlert = null;
    }

    const delayMs = this.randomDelayMs(STOCK_ALERT_MIN_DELAY_MS, STOCK_ALERT_MAX_DELAY_MS);

    runtime.timers.stockAlert = setTimeout(() => {
      const currentRuntime = this.registry.get(sessionId);
      if (currentRuntime) {
        currentRuntime.timers.stockAlert = null;
      }

      this.handleStockAlertTick(sessionId);
    }, delayMs);

    this.logger.debug(`SSE stock.alert scheduled. sessionId=${sessionId} delayMs=${delayMs}`);
  }

  private handleStockAlertTick(sessionId: string): void {
    if (!this.isActive(sessionId)) {
      return;
    }

    const runtime = this.registry.get(sessionId);
    if (!runtime) {
      this.activeSessionIds.delete(sessionId);
      this.logger.warn(
        `SSE stock.alert tick skipped: runtime not found for sessionId=${sessionId}`,
      );
      return;
    }

    try {
      if (!this.shouldEmitStockAlert()) {
        this.logger.debug(
          `SSE stock.alert skipped: probability gate closed. sessionId=${sessionId}`,
        );
        return;
      }

      const snapshot = this.mockShopifyDataService.getOrInitForSession(sessionId);
      const candidate = this.pickLowStockCandidate(snapshot.products, STOCK_ALERT_THRESHOLD);

      if (!candidate) {
        this.logger.debug(
          `SSE stock.alert skipped: no low-stock candidate found. sessionId=${sessionId}`,
        );
        return;
      }

      const payload: StockAlertEventPayload = {
        id: randomUUID(),
        productId: candidate.product.id,
        variantId: candidate.variant.id,
        productTitle: candidate.product.title,
        variantTitle: candidate.variant.title,
        sku: candidate.variant.sku,
        inventoryQuantity: candidate.variant.inventoryQuantity,
        threshold: STOCK_ALERT_THRESHOLD,
        occurredAt: new Date().toISOString(),
      };

      this.registry.emit(sessionId, {
        event: 'stock.alert',
        data: payload,
      });

      this.logger.debug(
        `SSE stock.alert emitted. sessionId=${sessionId} productId=${payload.productId} variantId=${payload.variantId} inventoryQuantity=${payload.inventoryQuantity}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `SSE stock.alert tick failed. sessionId=${sessionId} message=${message}`,
        stack,
      );
    } finally {
      this.scheduleNextStockAlert(sessionId);
    }
  }

  private scheduleNextHeartbeat(sessionId: string): void {
    if (!this.isActive(sessionId)) {
      return;
    }

    const runtime = this.registry.get(sessionId);
    if (!runtime) {
      this.activeSessionIds.delete(sessionId);
      this.logger.warn(
        `SSE heartbeat scheduling stopped: runtime not found for sessionId=${sessionId}`,
      );
      return;
    }

    if (runtime.timers.heartbeat) {
      clearTimeout(runtime.timers.heartbeat);
      runtime.timers.heartbeat = null;
    }

    runtime.timers.heartbeat = setTimeout(() => {
      const currentRuntime = this.registry.get(sessionId);
      if (currentRuntime) {
        currentRuntime.timers.heartbeat = null;
      }

      this.handleHeartbeatTick(sessionId);
    }, HEARTBEAT_DELAY_MS);

    this.logger.debug(
      `SSE heartbeat scheduled. sessionId=${sessionId} delayMs=${HEARTBEAT_DELAY_MS}`,
    );
  }

  private handleHeartbeatTick(sessionId: string): void {
    if (!this.isActive(sessionId)) {
      return;
    }

    const runtime = this.registry.get(sessionId);
    if (!runtime) {
      this.activeSessionIds.delete(sessionId);
      this.logger.warn(`SSE heartbeat tick skipped: runtime not found for sessionId=${sessionId}`);
      return;
    }

    try {
      const payload: HeartbeatEventPayload = {
        sentAt: new Date().toISOString(),
      };

      this.registry.emit(sessionId, {
        event: 'heartbeat',
        data: payload,
      });

      this.logger.debug(`SSE heartbeat emitted. sessionId=${sessionId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `SSE heartbeat tick failed. sessionId=${sessionId} message=${message}`,
        stack,
      );
    } finally {
      this.scheduleNextHeartbeat(sessionId);
    }
  }

  private pickLowStockCandidate(
    products: Product[],
    threshold: number,
  ): { product: Product; variant: ProductVariant } | null {
    const candidates: Array<{ product: Product; variant: ProductVariant }> = [];

    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.inventoryQuantity <= threshold) {
          candidates.push({ product, variant });
        }
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index] ?? null;
  }

  private shouldEmitStockAlert(): boolean {
    return Math.random() < STOCK_ALERT_PROBABILITY;
  }

  private getNextOrderNumber(orders: Order[]): number {
    if (orders.length === 0) {
      return 1001;
    }

    const maxOrderNumber = orders.reduce((max, order) => {
      return Math.max(max, order.orderNumber);
    }, 0);

    return maxOrderNumber + 1;
  }

  private randomDelayMs(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
