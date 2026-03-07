import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectThrottlerStorage, ThrottlerException, ThrottlerStorage } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { SESSION_COOKIE_NAME } from '../auth/auth.constants';

const TTL_MS = 60_000;
const LIMIT = 5;
const BLOCK_DURATION_MS = 60_000;
const THROTTLER_NAME = 'dashboard-layout-save';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNumberProp(obj: unknown, key: string): number | null {
  if (!isRecord(obj)) return null;
  const value = obj[key];
  return typeof value === 'number' ? value : null;
}

function getBooleanProp(obj: unknown, key: string): boolean | null {
  if (!isRecord(obj)) return null;
  const value = obj[key];
  return typeof value === 'boolean' ? value : null;
}

@Injectable()
export class LayoutSaveRateLimitGuard implements CanActivate {
  constructor(@InjectThrottlerStorage() private readonly storage: ThrottlerStorage) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      throw new UnauthorizedException();
    }

    const key = `${THROTTLER_NAME}:${sessionId}`;

    const record: unknown = await this.storage.increment(
      key,
      TTL_MS,
      LIMIT,
      BLOCK_DURATION_MS,
      THROTTLER_NAME,
    );

    const totalHits = getNumberProp(record, 'totalHits');
    const timeToExpireMs = getNumberProp(record, 'timeToExpire');
    const timeToBlockExpireMs = getNumberProp(record, 'timeToBlockExpire');
    const isBlocked = getBooleanProp(record, 'isBlocked');

    response.setHeader('X-RateLimit-Limit', LIMIT.toString());

    if (typeof totalHits === 'number') {
      response.setHeader('X-RateLimit-Remaining', Math.max(0, LIMIT - totalHits).toString());
    }

    if (typeof timeToExpireMs === 'number') {
      response.setHeader('X-RateLimit-Reset', Math.ceil(timeToExpireMs / 1000).toString());
    }

    if (isBlocked === true || (typeof totalHits === 'number' && totalHits > LIMIT)) {
      const retryAfterMs =
        typeof timeToBlockExpireMs === 'number' ? timeToBlockExpireMs : timeToExpireMs;

      if (typeof retryAfterMs === 'number') {
        response.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000).toString());
      }

      throw new ThrottlerException();
    }

    return true;
  }
}
