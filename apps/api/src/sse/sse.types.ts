import { randomUUID } from 'node:crypto';
import { Subject } from 'rxjs';
import type { SseEventName, SseEventPayloadMap } from '@shared/types';

export type SseServerEvent = {
  [TEventName in SseEventName]: {
    event: TEventName;
    data: SseEventPayloadMap[TEventName];
  };
}[SseEventName];

export interface SseSessionConnection {
  id: string;
  ip: string;
  connectedAt: string; // ISO 8601 UTC
}

export interface SseSessionTimers {
  orderCreated: NodeJS.Timeout | null;
  analyticsUpdated: NodeJS.Timeout | null;
  stockAlert: NodeJS.Timeout | null;
  heartbeat: NodeJS.Timeout | null;
}

export interface SseSessionRuntime {
  sessionId: string;
  stream$: Subject<SseServerEvent>;
  connections: Map<string, SseSessionConnection>;
  timers: SseSessionTimers;
}

export function createSseSessionConnection(
  ip: string,
  now: Date = new Date(),
): SseSessionConnection {
  return {
    id: randomUUID(),
    ip,
    connectedAt: now.toISOString(),
  };
}

export function createSseSessionTimers(): SseSessionTimers {
  return {
    orderCreated: null,
    analyticsUpdated: null,
    stockAlert: null,
    heartbeat: null,
  };
}

export function createSseSessionRuntime(sessionId: string): SseSessionRuntime {
  return {
    sessionId,
    stream$: new Subject<SseServerEvent>(),
    connections: new Map<string, SseSessionConnection>(),
    timers: createSseSessionTimers(),
  };
}

export function getRuntimeConnectionCount(runtime: SseSessionRuntime): number {
  return runtime.connections.size;
}

export function hasRuntimeConnections(runtime: SseSessionRuntime): boolean {
  return getRuntimeConnectionCount(runtime) > 0;
}
