import { forwardRef, Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AntiAbuseModule } from '../anti-abuse/anti-abuse.module';
import { BetaModule } from '../beta/beta.module';
import { MailModule } from '../mail/mail.module';
import { PlayersModule } from '../players/players.module';
import { AuthContextInterceptor } from './auth-context.interceptor';
import { AuthContextService } from './auth-context.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [AntiAbuseModule, BetaModule, MailModule, forwardRef(() => PlayersModule)],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    AuthContextService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthContextInterceptor,
    },
  ],
  exports: [AuthService, AuthGuard, AuthContextService],
})
export class AuthModule {}
