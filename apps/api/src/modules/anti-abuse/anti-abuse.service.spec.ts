import { AntiAbuseService } from './anti-abuse.service';

describe('AntiAbuseService', () => {
  it('creates a rate-limit signal when action frequency exceeds the block threshold', async () => {
    const prisma = {
      gameAnalyticsEvent: {
        count: jest.fn().mockResolvedValue(19),
      },
      actionFrequencyCounter: {
        upsert: jest.fn().mockResolvedValue({ count: 20 }),
      },
      abuseSignal: {
        create: jest.fn().mockResolvedValue({ id: 'signal-1' }),
      },
    };
    const service = new AntiAbuseService(prisma as any);

    const result = await service.monitorAction({
      worldId: 'world-1',
      playerId: 'player-1',
      actionType: 'pvp_attack_started',
      targetType: 'city',
      targetId: 'city-2',
    });

    expect(result).toEqual({ allowed: false, count: 20 });
    expect(prisma.abuseSignal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signalType: 'rate_limit',
          severity: 'high',
          reason: 'rate_limit_exceeded',
          playerId: 'player-1',
        }),
      }),
    );
  });

  it('logs multi-account risk for shared IP or device sessions', async () => {
    const prisma = {
      session: {
        count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(0),
      },
      abuseSignal: {
        create: jest.fn().mockResolvedValue({ id: 'signal-1' }),
      },
      accountRiskSignal: {
        create: jest.fn().mockResolvedValue({ id: 'risk-1' }),
      },
      sensitiveActionAuditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };
    const service = new AntiAbuseService(prisma as any);

    await service.logIpDeviceRisk({
      userId: 'user-1',
      worldId: 'world-1',
      playerId: 'player-1',
      source: 'login',
      request: {
        headers: { 'user-agent': 'jest', 'x-forwarded-for': '203.0.113.10' },
        ip: '127.0.0.1',
        socket: {},
      } as any,
    });

    expect(prisma.abuseSignal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          signalType: 'multi_account',
          severity: 'medium',
          reason: 'shared_ip_or_device',
        }),
      }),
    );
  });
});
