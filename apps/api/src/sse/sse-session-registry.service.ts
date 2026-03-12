import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  createSseSessionConnection,
  createSseSessionRuntime,
  getRuntimeConnectionCount,
  hasRuntimeConnections,
  type SseServerEvent,
  type SseSessionConnection,
  type SseSessionRuntime,
} from './sse.types';

export interface RegisterSseConnectionResult {
  runtime: SseSessionRuntime;
  connection: SseSessionConnection;
  createdRuntime: boolean;
}

export interface UnregisterSseConnectionResult {
  removedConnection: boolean;
  destroyedRuntime: boolean;
}

@Injectable()
export class SseSessionRegistryService implements OnApplicationShutdown {
  private readonly logger = new Logger(SseSessionRegistryService.name);
  private readonly runtimes = new Map<string, SseSessionRuntime>();

  has(sessionId: string): boolean {
    return this.runtimes.has(sessionId);
  }

  get(sessionId: string): SseSessionRuntime | undefined {
    return this.runtimes.get(sessionId);
  }

  getOrCreate(sessionId: string): SseSessionRuntime {
    const existing = this.runtimes.get(sessionId);
    if (existing) {
      return existing;
    }

    const runtime = createSseSessionRuntime(sessionId);
    this.runtimes.set(sessionId, runtime);

    this.logger.debug(`SSE runtime created. sessionId=${sessionId} runtimeCount=${this.size()}`);

    return runtime;
  }

  registerConnection(sessionId: string, ip: string): RegisterSseConnectionResult {
    const existing = this.runtimes.get(sessionId);
    const runtime = existing ?? this.getOrCreate(sessionId);
    const connection = createSseSessionConnection(ip);

    runtime.connections.set(connection.id, connection);

    this.logger.debug(
      `SSE connection registered. sessionId=${sessionId} connectionId=${connection.id} ` +
        `ip=${ip} sessionConnections=${getRuntimeConnectionCount(runtime)} runtimeCount=${this.size()}`,
    );

    return {
      runtime,
      connection,
      createdRuntime: !existing,
    };
  }

  unregisterConnection(sessionId: string, connectionId: string): UnregisterSseConnectionResult {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) {
      return {
        removedConnection: false,
        destroyedRuntime: false,
      };
    }

    const connection = runtime.connections.get(connectionId);
    const removedConnection = runtime.connections.delete(connectionId);

    if (!removedConnection) {
      return {
        removedConnection: false,
        destroyedRuntime: false,
      };
    }

    this.logger.debug(
      `SSE connection unregistered. sessionId=${sessionId} connectionId=${connectionId} ` +
        `ip=${connection?.ip ?? 'unknown'} sessionConnections=${getRuntimeConnectionCount(runtime)}`,
    );

    if (hasRuntimeConnections(runtime)) {
      return {
        removedConnection: true,
        destroyedRuntime: false,
      };
    }

    this.destroyRuntime(runtime);

    return {
      removedConnection: true,
      destroyedRuntime: true,
    };
  }

  emit(sessionId: string, event: SseServerEvent): boolean {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) {
      return false;
    }

    runtime.stream$.next(event);
    return true;
  }

  delete(sessionId: string): boolean {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) {
      return false;
    }

    this.destroyRuntime(runtime);
    return true;
  }

  destroyAll(): number {
    const sessionIds = Array.from(this.runtimes.keys());

    for (const sessionId of sessionIds) {
      this.delete(sessionId);
    }

    return sessionIds.length;
  }

  getConnectionCount(sessionId: string): number {
    const runtime = this.runtimes.get(sessionId);
    if (!runtime) {
      return 0;
    }

    return getRuntimeConnectionCount(runtime);
  }

  getActiveConnectionCountByIp(ip: string): number {
    let count = 0;

    for (const runtime of this.runtimes.values()) {
      for (const connection of runtime.connections.values()) {
        if (connection.ip === ip) {
          count += 1;
        }
      }
    }

    return count;
  }

  size(): number {
    return this.runtimes.size;
  }

  onApplicationShutdown(signal?: string): void {
    const runtimeCount = this.size();
    if (runtimeCount === 0) {
      return;
    }

    this.logger.log(
      `SSE shutdown cleanup started. signal=${signal ?? 'unknown'} runtimeCount=${runtimeCount}`,
    );

    const destroyedCount = this.destroyAll();

    this.logger.log(
      `SSE shutdown cleanup completed. signal=${signal ?? 'unknown'} destroyedRuntimeCount=${destroyedCount}`,
    );
  }

  private destroyRuntime(runtime: SseSessionRuntime): void {
    this.clearTimers(runtime);
    runtime.stream$.complete();
    runtime.connections.clear();
    this.runtimes.delete(runtime.sessionId);

    this.logger.debug(
      `SSE runtime destroyed. sessionId=${runtime.sessionId} runtimeCount=${this.size()}`,
    );
  }

  private clearTimers(runtime: SseSessionRuntime): void {
    const { orderCreated, analyticsUpdated, stockAlert, heartbeat } = runtime.timers;

    if (orderCreated) {
      clearTimeout(orderCreated);
      runtime.timers.orderCreated = null;
    }

    if (analyticsUpdated) {
      clearTimeout(analyticsUpdated);
      runtime.timers.analyticsUpdated = null;
    }

    if (stockAlert) {
      clearTimeout(stockAlert);
      runtime.timers.stockAlert = null;
    }

    if (heartbeat) {
      clearTimeout(heartbeat);
      runtime.timers.heartbeat = null;
    }
  }
}
