import { computed, onBeforeUnmount, readonly, ref } from 'vue';
import type { ParsedSseEvent, SseEventName, SseEventPayloadMap } from '@shared/types';

export type SseConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

export interface UseSseOptions {
  url?: string;
  expectedHeartbeatMs?: number;
  watchdogGraceMs?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
}

type SseEventListener = (event: ParsedSseEvent) => void;

const DEFAULT_SSE_URL = '/api/sse/events';
const DEFAULT_EXPECTED_HEARTBEAT_MS = 30_000;
const DEFAULT_WATCHDOG_GRACE_MS = 10_000;
const DEFAULT_RECONNECT_BASE_DELAY_MS = 1_000;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 30_000;

const SSE_EVENT_NAMES: readonly SseEventName[] = [
  'order.created',
  'analytics.updated',
  'stock.alert',
  'heartbeat',
] as const;

export function useSSE(options: UseSseOptions = {}) {
  const {
    url = DEFAULT_SSE_URL,
    expectedHeartbeatMs = DEFAULT_EXPECTED_HEARTBEAT_MS,
    watchdogGraceMs = DEFAULT_WATCHDOG_GRACE_MS,
    reconnectBaseDelayMs = DEFAULT_RECONNECT_BASE_DELAY_MS,
    reconnectMaxDelayMs = DEFAULT_RECONNECT_MAX_DELAY_MS,
  } = options;

  const status = ref<SseConnectionStatus>('disconnected');
  const isRunning = ref(false);
  const lastEventAt = ref<number | null>(null);

  const listeners = new Set<SseEventListener>();

  let eventSource: EventSource | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: number | null = null;
  let watchdogTimer: number | null = null;
  let hasReceivedFirstValidEvent = false;

  const watchdogTimeoutMs = expectedHeartbeatMs + watchdogGraceMs;

  const isConnected = computed(() => status.value === 'connected');
  const isReconnecting = computed(() => status.value === 'reconnecting');
  const isDisconnected = computed(() => status.value === 'disconnected');

  function start(): void {
    if (isRunning.value) {
      return;
    }

    isRunning.value = true;
    reconnectAttempt = 0;
    hasReceivedFirstValidEvent = false;
    status.value = 'reconnecting';

    connect();
  }

  function stop(): void {
    isRunning.value = false;
    hasReceivedFirstValidEvent = false;
    clearReconnectTimer();
    stopWatchdog();
    closeEventSource();
    status.value = 'disconnected';
  }

  function onEvent(listener: SseEventListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  function connect(): void {
    if (!isRunning.value) {
      return;
    }

    clearReconnectTimer();
    closeEventSource();

    const source = new EventSource(url);
    eventSource = source;

    attachTypedListeners(source);

    source.onerror = () => {
      if (!isRunning.value) {
        return;
      }

      transitionToReconnecting();
      scheduleReconnect();
    };
  }

  function attachTypedListeners(source: EventSource): void {
    for (const eventName of SSE_EVENT_NAMES) {
      source.addEventListener(eventName, (event) => {
        handleTypedEvent(eventName, event);
      });
    }
  }

  function handleTypedEvent<TEventName extends SseEventName>(
    eventName: TEventName,
    event: Event,
  ): void {
    const messageEvent = event as MessageEvent<string>;

    try {
      const parsedPayload = JSON.parse(messageEvent.data) as SseEventPayloadMap[TEventName];

      const parsedEvent = {
        type: eventName,
        payload: parsedPayload,
      } as ParsedSseEvent;

      lastEventAt.value = Date.now();

      if (!hasReceivedFirstValidEvent) {
        hasReceivedFirstValidEvent = true;
        reconnectAttempt = 0;
        status.value = 'connected';
        startWatchdog();
      }

      notifyListeners(parsedEvent);
    } catch (error) {
      console.error(`[useSSE] Failed to parse event "${eventName}"`, error);
    }
  }

  function notifyListeners(event: ParsedSseEvent): void {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function startWatchdog(): void {
    stopWatchdog();

    watchdogTimer = window.setInterval(() => {
      if (!isRunning.value) {
        return;
      }

      const last = lastEventAt.value;
      if (last === null) {
        return;
      }

      const elapsedMs = Date.now() - last;
      if (elapsedMs <= watchdogTimeoutMs) {
        return;
      }

      console.warn('[useSSE] Watchdog detected a silent SSE connection. Reconnecting...');
      transitionToReconnecting();
      scheduleReconnect();
    }, 1_000);
  }

  function stopWatchdog(): void {
    if (watchdogTimer !== null) {
      window.clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }

  function transitionToReconnecting(): void {
    if (!isRunning.value) {
      status.value = 'disconnected';
      return;
    }

    status.value = 'reconnecting';
    hasReceivedFirstValidEvent = false;
    stopWatchdog();
    closeEventSource();
  }

  function scheduleReconnect(): void {
    if (!isRunning.value) {
      return;
    }

    if (reconnectTimer !== null) {
      return;
    }

    const delayMs = getReconnectDelayMs(reconnectAttempt);
    reconnectAttempt += 1;

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delayMs);
  }

  function getReconnectDelayMs(attempt: number): number {
    const rawDelay = reconnectBaseDelayMs * 2 ** attempt;
    return Math.min(rawDelay, reconnectMaxDelayMs);
  }

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function closeEventSource(): void {
    if (!eventSource) {
      return;
    }

    eventSource.close();
    eventSource = null;
  }

  onBeforeUnmount(() => {
    stop();
  });

  return {
    status: readonly(status),
    isRunning: readonly(isRunning),
    lastEventAt: readonly(lastEventAt),
    isConnected,
    isReconnecting,
    isDisconnected,
    start,
    stop,
    onEvent,
  };
}
