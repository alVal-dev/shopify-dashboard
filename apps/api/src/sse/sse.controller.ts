import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants';
import { SseSessionRegistryService } from './sse-session-registry.service';

const MAX_ACTIVE_SSE_CONNECTIONS_PER_IP = 10;

@ApiTags('SSE')
@ApiCookieAuth('sessionId')
@Controller('sse')
@UseGuards(AuthGuard)
export class SseController {
  constructor(private readonly registry: SseSessionRegistryService) {}

  @Get('events')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flux SSE temps réel authentifié' })
  @ApiUnauthorizedResponse({ description: 'Session invalide ou absente' })
  @ApiNoContentResponse({ description: 'Limite de connexions SSE actives par IP atteinte' })
  events(@Req() req: Request, @Res() res: Response): void {
    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    if (!sessionId) {
      throw new UnauthorizedException();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const activeConnectionsForIp = this.registry.getActiveConnectionCountByIp(ip);

    if (activeConnectionsForIp >= MAX_ACTIVE_SSE_CONNECTIONS_PER_IP) {
      res.status(HttpStatus.NO_CONTENT).send();
      return;
    }

    const { runtime, connection } = this.registry.registerConnection(sessionId, ip);

    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(': connected\n\n');

    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;

      req.removeListener('close', handleClose);
      req.removeListener('aborted', handleAborted);
      res.removeListener('close', handleClose);

      subscription.unsubscribe();
      this.registry.unregisterConnection(sessionId, connection.id);

      if (!res.writableEnded) {
        res.end();
      }
    };

    const handleClose = () => {
      cleanup();
    };

    const handleAborted = () => {
      cleanup();
    };

    req.on('close', handleClose);
    req.on('aborted', handleAborted);
    res.on('close', handleClose);

    const subscription = runtime.stream$.subscribe({
      next: (event) => {
        if (res.writableEnded) {
          cleanup();
          return;
        }

        res.write(`event: ${event.event}\n`);
        res.write(`data: ${JSON.stringify(event.data)}\n\n`);
      },
      error: () => {
        cleanup();
      },
      complete: () => {
        cleanup();
      },
    });
  }
}
