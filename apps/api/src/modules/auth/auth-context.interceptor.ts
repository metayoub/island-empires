import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthContextService } from './auth-context.service';
import type { AuthenticatedRequest } from './current-auth.decorator';

@Injectable()
export class AuthContextInterceptor implements NestInterceptor {
  constructor(private readonly authContextService: AuthContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      return next.handle();
    }

    return new Observable((subscriber) =>
      this.authContextService.run(request.auth!, () => {
        const subscription = next.handle().subscribe(subscriber);
        return () => subscription.unsubscribe();
      }),
    );
  }
}
