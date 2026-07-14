import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export type AuthContext = {
  userId: string;
  playerId: string;
  worldId: string;
  adminRoles?: string[];
  moderation?: {
    isMuted: boolean;
    isSuspended: boolean;
    isBanned: boolean;
  };
};

@Injectable()
export class AuthContextService {
  private readonly storage = new AsyncLocalStorage<AuthContext>();

  run<T>(context: AuthContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  enter(context: AuthContext): void {
    this.storage.enterWith(context);
  }

  get(): AuthContext | undefined {
    return this.storage.getStore();
  }
}
