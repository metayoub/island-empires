import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthContext } from './auth-context.service';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentAuth } from './current-auth.decorator';
import {
  ConfirmEmailVerificationDto,
  ConfirmPasswordResetDto,
  LoginDto,
  RegisterDto,
  RequestPasswordResetDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto, request);
    response.setHeader('Set-Cookie', this.authService.buildCookie(result.sessionToken));
    const payload = {
      user: result.user,
      player: result.player,
    };
    return payload;
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto, request);
    response.setHeader('Set-Cookie', this.authService.buildCookie(result.sessionToken));
    const payload = {
      user: result.user,
      player: result.player,
    };
    return payload;
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(this.authService.extractCookie(request));
    response.setHeader('Set-Cookie', this.authService.buildClearCookie());
    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentAuth() auth: AuthContext) {
    return this.authService.currentUser(auth);
  }

  @Post('email-verification/request')
  @UseGuards(AuthGuard)
  async requestEmailVerification(@CurrentAuth() auth: AuthContext) {
    await this.authService.requestEmailVerification(auth);
    return { success: true };
  }

  @Post('email-verification/confirm')
  async confirmEmailVerification(@Body() dto: ConfirmEmailVerificationDto) {
    await this.authService.confirmEmailVerification(dto);
    return { success: true, emailVerified: true };
  }

  @Post('password-reset/request')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto);
    return { success: true };
  }

  @Post('password-reset/confirm')
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    await this.authService.confirmPasswordReset(dto);
    return { success: true };
  }
}
