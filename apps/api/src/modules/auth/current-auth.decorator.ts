import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthContext } from './auth-context.service';

export type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      throw new Error('Authenticated request context is missing.');
    }
    return request.auth;
  },
);
