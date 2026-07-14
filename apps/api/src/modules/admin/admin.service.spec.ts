import { HttpException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const auth = { userId: 'admin-user', playerId: 'admin-player', worldId: 'world-1' };
  const activeAdmin = {
    id: 'admin-user',
    email: 'admin@example.com',
    displayName: 'Admin',
    isAdmin: true,
    adminRole: 'super_admin',
    adminRoles: [{ role: 'super_admin' }],
    emailVerifiedAt: new Date(),
    accountStatus: 'active',
  };
  const targetPlayer = { id: 'player-1', userId: 'user-1' };

  function createPrisma(overrides: Record<string, unknown> = {}) {
    return {
      user: { findUnique: jest.fn().mockResolvedValue(activeAdmin) },
      player: { findFirst: jest.fn().mockResolvedValue(targetPlayer) },
      playerModeration: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({
          playerId: targetPlayer.id,
          worldId: auth.worldId,
          status: 'warned',
          warningCount: 1,
          reason: 'Spam',
        }),
      },
      adminPlayerWarning: {
        create: jest.fn().mockResolvedValue({ id: 'warning-1', reason: 'Spam' }),
      },
      playerModerationAction: {
        create: jest.fn().mockResolvedValue({ id: 'action-1', actionType: 'warning' }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      message: {
        create: jest.fn().mockResolvedValue({ id: 'message-1', createdAt: new Date() }),
      },
      notificationDelivery: {
        upsert: jest.fn().mockResolvedValue({ id: 'notification-1' }),
      },
      adminActionLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
      ...overrides,
    };
  }

  it('rejects non-admin users', async () => {
    const prisma = createPrisma({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          ...activeAdmin,
          isAdmin: false,
          adminRoles: [],
          adminRole: 'viewer',
        }),
      },
    });
    const service = new AdminService(prisma as any);

    await expect(service.me(auth)).rejects.toBeInstanceOf(HttpException);
  });

  it('creates warning history, system message, and admin action log', async () => {
    const prisma = createPrisma();
    const service = new AdminService(prisma as any);

    await service.warnPlayer(auth, targetPlayer.id, {
      reason: 'Spam',
      publicMessage: 'Please avoid repeated messages.',
    });

    expect(prisma.adminPlayerWarning.create).toHaveBeenCalled();
    expect(prisma.playerModerationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'warning', playerId: targetPlayer.id }),
      }),
    );
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ messageType: 'system', recipientPlayerId: targetPlayer.id }),
      }),
    );
    expect(prisma.adminActionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'player_warned', playerId: targetPlayer.id }),
      }),
    );
  });

  it('allows super admin to ban and records a ban moderation action', async () => {
    const prisma = createPrisma({
      playerModeration: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({
          playerId: targetPlayer.id,
          worldId: auth.worldId,
          status: 'banned',
          bannedAt: new Date(),
          reason: 'Severe abuse',
        }),
      },
      playerModerationAction: {
        create: jest.fn().mockResolvedValue({ id: 'ban-action-1', actionType: 'ban' }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const service = new AdminService(prisma as any);

    await service.banPlayer(auth, targetPlayer.id, { reason: 'Severe abuse' });

    expect(prisma.playerModerationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'ban', playerId: targetPlayer.id }),
      }),
    );
    expect(prisma.adminActionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'player_banned', playerId: targetPlayer.id }),
      }),
    );
  });
});
