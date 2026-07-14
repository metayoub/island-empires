import { ConfigService } from '@nestjs/config';
import { SUPPORTER_CONFIG, getInventoryItemDefinition } from '@island-empires/config';
import { SupporterService } from './supporter.service';

describe('SupporterService', () => {
  function service(db: Record<string, any>) {
    return new SupporterService(
      db as any,
      { get: (_key: string, fallback: string) => fallback } as ConfigService,
      {} as any,
      {} as any,
    );
  }

  it('returns exact small supporter packs with cosmetic-only contents', async () => {
    const payload = await service({}).getPacks();

    expect(payload.packs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ supporterPackId: 'supporter_coffee_1', priceCents: 100 }),
        expect.objectContaining({ supporterPackId: 'supporter_harbor_2', priceCents: 200 }),
      ]),
    );
    for (const pack of SUPPORTER_CONFIG.packs) {
      for (const grant of pack.grants) {
        const item = getInventoryItemDefinition(grant.itemId);
        expect(item?.category).not.toBe('resource_pack');
        expect(item?.category).not.toBe('unit_pack');
      }
    }
    expect(payload.fairnessPromise.join(' ')).toContain('free to play');
  });

  it('creates checkout from server-owned price and grants metadata', async () => {
    const supporterDonation = { create: jest.fn().mockResolvedValue({ id: 'donation_1' }) };
    const donationAuditLog = { create: jest.fn().mockResolvedValue({}) };
    const sensitiveActionAuditLog = { create: jest.fn().mockResolvedValue({}) };
    const db = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user_1', email: 'player@example.com', accountStatus: 'active' }) },
      supporterDonation,
      donationAuditLog,
      sensitiveActionAuditLog,
    };

    const result = await service(db).createCheckout(
      { userId: 'user_1', playerId: 'player_1', worldId: 'world_1' },
      'supporter_coffee_1',
    );

    expect(result.donationId).toBe('donation_1');
    expect(supporterDonation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supporterPackId: 'supporter_coffee_1',
          amountCents: 100,
          currency: 'USD',
        }),
      }),
    );
  });
});
