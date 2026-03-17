import { beforeEach, vi } from 'vitest';

type MockEventListener = (event: Event) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  url: string;
  withCredentials = false;
  readyState = 0;

  onopen: ((this: EventSource, ev: Event) => any) | null = null;
  onmessage: ((this: EventSource, ev: MessageEvent<any>) => any) | null = null;
  onerror: ((this: EventSource, ev: Event) => any) | null = null;

  private listeners = new Map<string, Set<MockEventListener>>();

  close = vi.fn(() => {
    this.readyState = this.CLOSED;
  });

  constructor(url: string | URL) {
    this.url = String(url);
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (!listener) return;

    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const wrapped: MockEventListener =
      typeof listener === 'function'
        ? (event) => listener(event)
        : (event) => listener.handleEvent(event);

    this.listeners.get(type)!.add(wrapped);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null): void {
    if (!listener) return;

    const current = this.listeners.get(type);
    if (!current) return;

    for (const registered of current) {
      current.delete(registered);
    }
  }

  dispatchEvent(_event: Event): boolean {
    return true;
  }

  emit(type: string, data: unknown): void {
    const event = {
      data: JSON.stringify(data),
    } as MessageEvent<string>;

    for (const listener of this.listeners.get(type) ?? []) {
      listener(event as unknown as Event);
    }
  }

  emitRaw(type: string, rawData: string): void {
    const event = {
      data: rawData,
    } as MessageEvent<string>;

    for (const listener of this.listeners.get(type) ?? []) {
      listener(event as unknown as Event);
    }
  }

  emitError(): void {
    const errorEvent = new Event('error');
    this.onerror?.call(this as unknown as EventSource, errorEvent);
  }

  static reset(): void {
    MockEventSource.instances = [];
  }
}

Object.defineProperty(window, 'EventSource', {
  writable: true,
  value: MockEventSource,
});

Object.defineProperty(globalThis, 'EventSource', {
  writable: true,
  value: MockEventSource,
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  MockEventSource.reset();
});
