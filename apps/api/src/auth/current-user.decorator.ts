import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '@shared/types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.authUser) {
      throw new InternalServerErrorException(
        'CurrentUser decorator requires AuthGuard: no authUser found on request',
      );
    }

    return request.authUser;
  },
);
