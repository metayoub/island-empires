/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

const request = {
  headers: { 'user-agent': 'jest' },
  ip: '127.0.0.1',
  socket: {},
} as any;

function createService() {
  const users: any[] = [];
  const sessions: any[] = [];
  const passwordResetTokens: any[] = [];
  const prisma = {
    user: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(users.find((user) => user.email === where.email || user.id === where.id) ?? null),
      ),
      create: jest.fn(({ data }) => {
        const user = {
          id: `user-${users.length + 1}`,
          emailVerifiedAt: null,
          accountStatus: 'active',
          ...data,
        };
        users.push(user);
        return Promise.resolve(user);
      }),
      update: jest.fn(({ where, data }) => {
        const user = users.find((candidate) => candidate.id === where.id);
        Object.assign(user, data);
        return Promise.resolve(user);
      }),
    },
    session: {
      create: jest.fn(({ data }) => {
        sessions.push({ id: `session-${sessions.length + 1}`, ...data });
        return Promise.resolve(sessions[sessions.length - 1]);
      }),
      updateMany: jest.fn(({ where, data }) => {
        for (const session of sessions) {
          if (!where.tokenHash || session.tokenHash === where.tokenHash) {
            Object.assign(session, data);
          }
        }
        return Promise.resolve({ count: sessions.length });
      }),
    },
    emailVerificationToken: {
      create: jest.fn(() => Promise.resolve({ id: 'verification-token' })),
    },
    passwordResetToken: {
      create: jest.fn(({ data }) => {
        passwordResetTokens.push(data);
        return Promise.resolve({ id: 'reset-token', ...data });
      }),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
  const configService = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        'auth.sessionDays': 30,
        'auth.sessionCookieName': 'island_empires_session',
        'auth.cookieSecure': false,
      };
      return values[key] ?? fallback;
    }),
  } as unknown as ConfigService;
  const mailService = {
    sendEmailVerification: jest.fn(),
    sendPasswordReset: jest.fn(),
  };
  const developmentStateService = {
    ensureStateForUser: jest.fn((input: { userId: string; playerName: string }) =>
      Promise.resolve({
        player: { id: `player-${input.userId}`, name: input.playerName, score: 0 },
        world: { id: 'world-1', name: 'First World', status: 'development' },
        selectedCityId: 'city-1',
        onboarding: { hasCompletedTutorial: false, currentQuestId: 'first_steps' },
      }),
    ),
  };
  const antiAbuseService = {
    logIpDeviceRisk: jest.fn().mockResolvedValue(undefined),
    monitorAction: jest.fn().mockResolvedValue({ allowed: true, count: 1 }),
    trackAction: jest.fn().mockResolvedValue(undefined),
    flagSensitiveAction: jest.fn().mockResolvedValue(undefined),
  };
  const betaService = {
    assertCanRegister: jest.fn().mockResolvedValue({ accessMode: 'open', code: null, cohort: null }),
    recordAccessUsage: jest.fn().mockResolvedValue(undefined),
  };

  return {
    service: new AuthService(
      prisma as any,
      configService,
      mailService as any,
      developmentStateService as any,
      antiAbuseService as any,
      betaService as any,
    ),
    prisma,
    users,
    sessions,
    passwordResetTokens,
    mailService,
    antiAbuseService,
    betaService,
  };
}

describe('AuthService', () => {
  it('requires terms and privacy acceptance to register', async () => {
    const { service } = createService();

    await expect(
      service.register(
        {
          email: 'player@example.com',
          password: 'password123',
          displayName: 'Founder',
          acceptTerms: false,
          acceptPrivacy: true,
        },
        request,
      ),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'TERMS_REQUIRED' }) });
  });

  it('registers a user with a password hash, player, session, and verification email', async () => {
    const { service, users, sessions, mailService } = createService();

    const result = await service.register(
      {
        email: 'PLAYER@EXAMPLE.COM',
        password: 'password123',
        displayName: 'Founder',
        acceptTerms: true,
        acceptPrivacy: true,
      },
      request,
    );

    expect(result.user.email).toBe('player@example.com');
    expect(users[0].passwordHash).toMatch(/^scrypt:/);
    expect(users[0].passwordHash).not.toContain('password123');
    expect(result.player.id).toBe('player-user-1');
    expect(sessions).toHaveLength(1);
    expect(mailService.sendEmailVerification).toHaveBeenCalledWith('player@example.com', expect.any(String));
  });

  it('uses a generic login error for invalid passwords', async () => {
    const { service } = createService();
    await service.register(
      {
        email: 'player@example.com',
        password: 'password123',
        displayName: 'Founder',
        acceptTerms: true,
        acceptPrivacy: true,
      },
      request,
    );

    await expect(
      service.login({ email: 'player@example.com', password: 'wrong-password' }, request),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_CREDENTIALS' }),
    });
  });

  it('revokes the current session on logout', async () => {
    const { service, sessions } = createService();
    const result = await service.register(
      {
        email: 'player@example.com',
        password: 'password123',
        displayName: 'Founder',
        acceptTerms: true,
        acceptPrivacy: true,
      },
      request,
    );

    await service.logout(result.sessionToken);

    expect(sessions[0].revokedAt).toBeInstanceOf(Date);
  });

  it('returns generic password reset success when the email does not exist', async () => {
    const { service, passwordResetTokens, mailService } = createService();

    await expect(service.requestPasswordReset({ email: 'missing@example.com' })).resolves.toBeUndefined();
    expect(passwordResetTokens).toHaveLength(0);
    expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
  });
});
