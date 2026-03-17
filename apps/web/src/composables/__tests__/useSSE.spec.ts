import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSSE } from '../useSSE';

function getLastEventSourceInstance(): any {
  const EventSourceCtor = window.EventSource as any;
  return EventSourceCtor.instances[EventSourceCtor.instances.length - 1];
}

describe('useSSE', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('start() creates EventSource and transitions to reconnecting initially', () => {
    const sse = useSSE();

    sse.start();

    const instance = getLastEventSourceInstance();

    expect(instance).toBeTruthy();
    expect(instance.url).toBe('/api/sse/events');
    expect(sse.isRunning.value).toBe(true);
    expect(sse.status.value).toBe('reconnecting');
  });

  it('stop() closes EventSource and resets state', () => {
    const sse = useSSE();
    sse.start();

    const instance = getLastEventSourceInstance();
    sse.stop();

    expect(instance.close).toHaveBeenCalledTimes(1);
    expect(sse.isRunning.value).toBe(false);
    expect(sse.status.value).toBe('disconnected');
  });

  it('parses valid events and notifies listeners', () => {
    const sse = useSSE();
    const listener = vi.fn();

    sse.onEvent(listener);
    sse.start();

    const instance = getLastEventSourceInstance();
    instance.emit('heartbeat', { sentAt: '2026-01-01T00:00:00.000Z' });

    expect(listener).toHaveBeenCalledWith({
      type: 'heartbeat',
      payload: { sentAt: '2026-01-01T00:00:00.000Z' },
    });
    expect(sse.status.value).toBe('connected');
    expect(sse.lastEventAt.value).not.toBeNull();
  });

  it('logs error for invalid JSON event payload', () => {
    const sse = useSSE();
    const listener = vi.fn();

    sse.onEvent(listener);
    sse.start();

    const instance = getLastEventSourceInstance();
    instance.emitRaw('heartbeat', '{invalid-json');

    expect(console.error).toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('sets connected state on first valid event', () => {
    const sse = useSSE();
    sse.start();

    const instance = getLastEventSourceInstance();
    instance.emit('heartbeat', { sentAt: '2026-01-01T00:00:00.000Z' });

    expect(sse.isConnected.value).toBe(true);
    expect(sse.isReconnecting.value).toBe(false);
  });

  it('transitions to reconnecting on error', () => {
    const sse = useSSE();
    sse.start();

    const instance = getLastEventSourceInstance();
    instance.emitError();

    expect(sse.status.value).toBe('reconnecting');
  });

  it('reconnects with exponential backoff', () => {
    const sse = useSSE({
      reconnectBaseDelayMs: 1000,
      reconnectMaxDelayMs: 5000,
    });

    sse.start();
    const first = getLastEventSourceInstance();
    first.emitError();

    vi.advanceTimersByTime(999);
    expect((window.EventSource as any).instances).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect((window.EventSource as any).instances).toHaveLength(2);

    const second = getLastEventSourceInstance();
    second.emitError();

    vi.advanceTimersByTime(2000);
    expect((window.EventSource as any).instances).toHaveLength(3);
  });

  it('watchdog triggers reconnect after silence', () => {
    const sse = useSSE({
      expectedHeartbeatMs: 1000,
      watchdogGraceMs: 500,
      reconnectBaseDelayMs: 100,
      reconnectMaxDelayMs: 1000,
    });

    sse.start();

    let instance = getLastEventSourceInstance();
    instance.emit('heartbeat', { sentAt: '2026-01-01T00:00:00.000Z' });

    expect(sse.status.value).toBe('connected');

    vi.advanceTimersByTime(3000);

    expect(sse.status.value).toBe('reconnecting');

    vi.advanceTimersByTime(100);
    instance = getLastEventSourceInstance();

    expect(instance).toBeTruthy();
  });

  it('onEvent() unsubscribe stops notifications', () => {
    const sse = useSSE();
    const listener = vi.fn();

    const unsubscribe = sse.onEvent(listener);
    sse.start();

    const instance = getLastEventSourceInstance();

    unsubscribe();
    instance.emit('heartbeat', { sentAt: '2026-01-01T00:00:00.000Z' });

    expect(listener).not.toHaveBeenCalled();
  });
});
