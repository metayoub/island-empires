import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BETA_CONFIG } from '@island-empires/config';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request } from 'express';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AntiAbuseService } from '../anti-abuse/anti-abuse.service';
import { BetaService } from '../beta/beta.service';
import { MailService } from '../mail/mail.service';
import { DevelopmentStateService } from '../players/development-state.service';
import type { AuthContext } from './auth-context.service';
import type {
  ConfirmEmailVerificationDto,
  ConfirmPasswordResetDto,
  LoginDto,
  RegisterDto,
  RequestPasswordResetDto,
} from './dto/auth.dto';

const scrypt = promisify(scryptCallback);
const SESSION_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

type AuthPayload = {
  user: {
    id: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
    accountStatus?: string;
  };
  player: {
    id: string;
    name: string;
    selectedCityId?: string | null;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly antiAbuseService: AntiAbuseService,
    private readonly betaService: BetaService,
  ) {}

  get cookieName(): string {
    return this.configService.get<string>('auth.sessionCookieName', 'island_empires_session');
  }

  async register(dto: RegisterDto, request: Request): Promise<AuthPayload & { sessionToken: string }> {
    if (!dto.acceptTerms || !dto.acceptPrivacy) {
      throw new ApiErrorException(
        'You must accept the terms and privacy policy to create an account.',
        'TERMS_REQUIRED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const email = this.normalizeEmail(dto.email);
    const betaAccess = await this.betaService.assertCanRegister({ email, inviteCode: dto.inviteCode });
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiErrorException(
        'An account with this email already exists.',
        'EMAIL_ALREADY_EXISTS',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await this.hashPassword(dto.password);
    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName.trim(),
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      },
    });
    const bootstrap = await this.developmentStateService.ensureStateForUser({
      userId: user.id,
      playerName: user.displayName,
      ...this.getRegistrationWorldInput(),
    });
    await this.betaService.recordAccessUsage({
      accessMode: betaAccess.accessMode,
      code: betaAccess.code,
      allowlistId: betaAccess.allowlistId,
      userId: user.id,
      playerId: bootstrap.player.id,
    });
    const verificationToken = await this.createEmailVerificationToken(user.id);
    await this.mailService.sendEmailVerification(user.email, verificationToken);
    const sessionToken = await this.createSession(user.id, request);
    await this.antiAbuseService.logIpDeviceRisk({
      userId: user.id,
      worldId: bootstrap.world.id,
      playerId: bootstrap.player.id,
      request,
      source: 'register',
    });
    await this.antiAbuseService.trackAction({
      worldId: bootstrap.world.id,
      playerId: bootstrap.player.id,
      eventType: 'registration_completed',
      payload: { userId: user.id, inviteCohort: betaAccess.cohort },
    });

    return {
      ...this.toPayload(user, {
        id: bootstrap.player.id,
        name: bootstrap.player.name,
        selectedCityId: bootstrap.selectedCityId,
      }),
      sessionToken,
    };
  }

  async login(dto: LoginDto, request: Request): Promise<AuthPayload & { sessionToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
    });

    if (!user || !(await this.verifyPassword(dto.password, user.passwordHash))) {
      throw new ApiErrorException(
        'Invalid email or password.',
        'INVALID_CREDENTIALS',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (user.accountStatus !== 'active') {
      throw new ApiErrorException(
        'This account is not active.',
        'ACCOUNT_NOT_ACTIVE',
        HttpStatus.FORBIDDEN,
      );
    }

    const bootstrap = await this.developmentStateService.ensureStateForUser({
      userId: user.id,
      playerName: user.displayName,
      ...this.getRegistrationWorldInput(),
    });
    const sessionToken = await this.createSession(user.id, request);
    await this.antiAbuseService.monitorAction({
      worldId: bootstrap.world.id,
      playerId: bootstrap.player.id,
      actionType: 'login',
      targetType: 'user',
      targetId: user.id,
    });
    await this.antiAbuseService.trackAction({
      worldId: bootstrap.world.id,
      playerId: bootstrap.player.id,
      eventType: 'login',
      payload: { userId: user.id },
    });
    await this.antiAbuseService.logIpDeviceRisk({
      userId: user.id,
      worldId: bootstrap.world.id,
      playerId: bootstrap.player.id,
      request,
      source: 'login',
    });

    return {
      ...this.toPayload(user, {
        id: bootstrap.player.id,
        name: bootstrap.player.name,
        selectedCityId: bootstrap.selectedCityId,
      }),
      sessionToken,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;

    await this.prisma.session.updateMany({
      where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async currentUser(auth: AuthContext): Promise<AuthPayload> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    const player = await this.prisma.player.findUniqueOrThrow({ where: { id: auth.playerId } });

    return this.toPayload(user, {
      id: player.id,
      name: player.name,
      selectedCityId: player.selectedCityId,
    });
  }

  async requestEmailVerification(auth: AuthContext): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    if (user.emailVerifiedAt) return;

    const token = await this.createEmailVerificationToken(user.id);
    await this.mailService.sendEmailVerification(user.email, token);
  }

  async confirmEmailVerification(dto: ConfirmEmailVerificationDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);
    const row = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!row || row.usedAt || row.expiresAt <= new Date()) {
      throw new ApiErrorException(
        'This email verification link is invalid or expired.',
        'INVALID_OR_EXPIRED_TOKEN',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
    });
    if (!user) return;

    const token = await this.createPasswordResetToken(user.id);
    await this.mailService.sendPasswordReset(user.email, token);
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.usedAt || row.expiresAt <= new Date()) {
      throw new ApiErrorException(
        'This password reset link is invalid or expired.',
        'INVALID_OR_EXPIRED_TOKEN',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash: await this.hashPassword(dto.newPassword) },
      }),
      this.prisma.session.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    const player = await this.prisma.player.findFirst({ where: { userId: row.userId } });
    if (player) {
      await this.antiAbuseService.flagSensitiveAction({
        worldId: player.worldId,
        playerId: player.id,
        reason: 'password_reset_confirmed',
        targetType: 'user',
        targetId: row.userId,
      });
    }
  }

  async resolveAuthContextFromToken(rawToken: string | undefined): Promise<AuthContext | null> {
    if (!rawToken) return null;

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: {
        user: {
          include: {
            players: { orderBy: { createdAt: 'asc' }, take: 1 },
            adminRoles: { where: { revokedAt: null }, orderBy: { grantedAt: 'desc' } },
          },
        },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.accountStatus !== 'active'
    ) {
      return null;
    }

    const player = session.user.players[0];
    if (!player) {
      const bootstrap = await this.developmentStateService.ensureStateForUser({
        userId: session.userId,
        playerName: session.user.displayName,
      });
      return { userId: session.userId, playerId: bootstrap.player.id, worldId: bootstrap.world.id };
    }
    const moderation = await (this.prisma as any).playerModeration.findUnique({
      where: { playerId: player.id },
    });
    const now = new Date();
    const moderationFlags = {
      isMuted: Boolean(moderation?.mutedUntil && moderation.mutedUntil > now),
      isSuspended: Boolean(moderation?.suspendedUntil && moderation.suspendedUntil > now),
      isBanned: Boolean(moderation?.bannedAt),
    };
    if (moderationFlags.isBanned || moderationFlags.isSuspended) {
      return null;
    }

    return {
      userId: session.userId,
      playerId: player.id,
      worldId: player.worldId,
      adminRoles: session.user.isAdmin
        ? session.user.adminRoles.map((role) => role.role).concat(session.user.adminRole ?? 'viewer')
        : [],
      moderation: moderationFlags,
    };
  }

  async resolveDevelopmentAuthContext(): Promise<AuthContext> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const player = await this.prisma.player.findUniqueOrThrow({
      where: { id: bootstrap.player.id },
      select: {
        id: true,
        userId: true,
        worldId: true,
        user: { select: { isAdmin: true, adminRole: true } },
      },
    });

    return {
      userId: player.userId,
      playerId: player.id,
      worldId: player.worldId,
      adminRoles: player.user.isAdmin ? [player.user.adminRole] : [],
    };
  }

  buildCookie(token: string): string {
    const days = this.configService.get<number>('auth.sessionDays', 30);
    const secure = this.configService.get<boolean>('auth.cookieSecure', false);
    const maxAge = days * 24 * 60 * 60;
    return [
      `${this.cookieName}=${encodeURIComponent(token)}`,
      'Path=/',
      `Max-Age=${maxAge}`,
      'HttpOnly',
      'SameSite=Lax',
      secure ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');
  }

  buildClearCookie(): string {
    return `${this.cookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
  }

  extractCookie(request: Request): string | undefined {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) return undefined;

    return cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${this.cookieName}=`))
      ?.slice(this.cookieName.length + 1);
  }

  private async createSession(userId: string, request: Request): Promise<string> {
    const rawToken = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
    const days = this.configService.get<number>('auth.sessionDays', 30);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const ip = request.ip || request.socket.remoteAddress || '';

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawToken),
        userAgent: request.headers['user-agent'],
        ipHash: ip ? this.hashToken(ip) : null,
        expiresAt,
      },
    });

    return rawToken;
  }

  private async createEmailVerificationToken(userId: string): Promise<string> {
    const rawToken = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    });
    return rawToken;
  }

  private async createPasswordResetToken(userId: string): Promise<string> {
    const rawToken = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    return rawToken;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getRegistrationWorldInput(): { worldName?: string; worldStatus?: string } {
    if (!BETA_CONFIG.betaModeEnabled) return {};
    return {
      worldName: BETA_CONFIG.betaWorld.name,
      worldStatus: BETA_CONFIG.betaWorld.status,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url');
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt:${salt}:${key.toString('base64url')}`;
  }

  private async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    const [scheme, salt, encoded] = passwordHash.split(':');
    if (scheme !== 'scrypt' || !salt || !encoded) return false;

    const expected = Buffer.from(encoded, 'base64url');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private toPayload(
    user: {
      id: string;
      email: string;
      displayName: string;
      emailVerifiedAt: Date | null;
      accountStatus: string;
    },
    player: { id: string; name: string; selectedCityId?: string | null },
  ): AuthPayload {
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: Boolean(user.emailVerifiedAt),
        accountStatus: user.accountStatus,
      },
      player,
    };
  }
}
