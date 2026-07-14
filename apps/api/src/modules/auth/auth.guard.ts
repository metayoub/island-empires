import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthContextService } from './auth-context.service';
import { authRequiredError } from './auth.errors';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './current-auth.decorator';

export const IS_PUBLIC_ROUTE = 'isPublicRoute';
export const Public = () => SetMetadata(IS_PUBLIC_ROUTE, true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly authContextService: AuthContextService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const rawToken = this.authService.extractCookie(request);
    const auth = await this.authService.resolveAuthContextFromToken(rawToken);
    if (!auth) {
      if (this.configService.get<boolean>('auth.devMode', false)) {
        const devAuth = await this.authService.resolveDevelopmentAuthContext();
        request.auth = devAuth;
        this.authContextService.enter(devAuth);
        return true;
      }
      throw authRequiredError();
    }

    request.auth = auth;
    this.authContextService.enter(auth);
    return true;
  }
}
