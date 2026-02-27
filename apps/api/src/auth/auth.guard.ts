import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '@shared/types';
import { SessionsService } from './sessions.service';
import { SESSION_COOKIE_NAME } from './auth.constants';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessionsService: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    const validated = await this.sessionsService.validateSession(sessionId ?? '');
    if (!validated) {
      // 401 (pas 403) => on throw
      throw new UnauthorizedException();
    }

    const authUser: AuthUser = {
      id: validated.user.id,
      email: validated.user.email,
      role: validated.user.role === 'DEMO' ? 'demo' : 'user',
    };

    (req as any).authUser = authUser;

    return true;
  }
}
