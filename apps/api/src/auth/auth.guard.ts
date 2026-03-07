import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '@shared/types';

import { SESSION_COOKIE_NAME } from './auth.constants';
import { SessionsService } from './sessions.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessionsService: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
    const validated = await this.sessionsService.validateSession(sessionId ?? '');

    if (!validated) {
      throw new UnauthorizedException();
    }

    const authUser: AuthUser = {
      id: validated.user.id,
      email: validated.user.email,
      role: validated.user.role === 'DEMO' ? 'demo' : 'user',
    };

    request.authUser = authUser;

    return true;
  }
}
