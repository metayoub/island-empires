import { Test } from '@nestjs/testing';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { MessagesService } from './messages.service';

const WORLD_ID = 'world-1';
const PLAYER_ID = 'player-1';
const RECIPIENT_ID = 'player-2';

function buildMessagePrisma() {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const sender = { id: PLAYER_ID, name: 'Founder', worldId: WORLD_ID };
  const recipient = { id: RECIPIENT_ID, name: 'Scholar', worldId: WORLD_ID };
  const message = {
    id: 'message-1',
    worldId: WORLD_ID,
    senderPlayerId: PLAYER_ID,
    recipientPlayerId: RECIPIENT_ID,
    messageType: 'player',
    subject: 'Trade',
    body: 'Can you send marble?',
    isReadByRecipient: false,
    deletedBySender: false,
    deletedByRecipient: false,
    createdAt,
    readAt: null,
    sender,
    recipient,
  };
  const reports: unknown[] = [];
  const blocks: unknown[] = [];
  const prisma = {
    message: {
      findMany: jest.fn().mockResolvedValue([message]),
      findUnique: jest.fn().mockResolvedValue(message),
      create: jest.fn().mockResolvedValue(message),
      update: jest.fn().mockResolvedValue({
        ...message,
        isReadByRecipient: true,
        readAt: createdAt,
      }),
      count: jest.fn().mockResolvedValue(1),
    },
    player: {
      findUnique: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(
            where.id === RECIPIENT_ID ? recipient : where.id === PLAYER_ID ? sender : null,
          ),
        ),
    },
    playerBlock: {
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(({ create }) => {
        blocks.push(create);
        return Promise.resolve({ ...create, id: 'block-1', createdAt });
      }),
    },
    messageReport: {
      upsert: jest.fn().mockImplementation(({ create }) => {
        reports.push(create);
        return Promise.resolve({ ...create, id: 'message-report-1', createdAt });
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'message-report-1',
          worldId: WORLD_ID,
          messageId: 'message-1',
          reporterPlayerId: PLAYER_ID,
          reason: 'spam',
          status: 'pending',
          createdAt,
          reviewedAt: null,
          reporter: sender,
        },
      ]),
    },
  };

  return { prisma, reports, blocks };
}

describe('MessagesService', () => {
  async function createService() {
    const { prisma, reports, blocks } = buildMessagePrisma();
    const developmentStateService = {
      ensureDevelopmentState: jest.fn().mockResolvedValue({
        player: { id: PLAYER_ID, name: 'Founder', score: 0 },
        world: { id: WORLD_ID, name: 'First World', status: 'development' },
        selectedCityId: 'city-1',
        onboarding: { hasCompletedTutorial: false, currentQuestId: 'welcome_city' },
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: DevelopmentStateService, useValue: developmentStateService },
      ],
    }).compile();

    return { service: moduleRef.get(MessagesService), prisma, reports, blocks };
  }

  it('sends player messages inside the current world', async () => {
    const { service, prisma } = await createService();

    const response = await service.sendMessage({
      recipientPlayerId: RECIPIENT_ID,
      subject: ' Trade ',
      body: ' Can you send marble? ',
    });

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        worldId: WORLD_ID,
        senderPlayerId: PLAYER_ID,
        recipientPlayerId: RECIPIENT_ID,
        subject: 'Trade',
        body: 'Can you send marble?',
      }),
      include: { sender: true, recipient: true },
    });
    expect(response.message).toMatchObject({
      id: 'message-1',
      sender: { id: PLAYER_ID, name: 'Founder' },
      recipient: { id: RECIPIENT_ID, name: 'Scholar' },
    });
  });

  it('marks recipient inbox messages as read', async () => {
    const { service, prisma } = await createService();
    prisma.message.findUnique.mockResolvedValueOnce({
      ...(await prisma.message.findUnique({ where: { id: 'message-1' } })),
      recipientPlayerId: PLAYER_ID,
      recipient: { id: PLAYER_ID, name: 'Founder' },
    });

    const response = await service.markRead('message-1');

    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'message-1' },
      data: expect.objectContaining({ isReadByRecipient: true }),
      include: { sender: true, recipient: true },
    });
    expect(response.isRead).toBe(true);
  });

  it('blocks players', async () => {
    const { service, blocks } = await createService();

    const response = await service.blockPlayer(RECIPIENT_ID, { reason: 'spam' });

    expect(blocks[0]).toMatchObject({
      worldId: WORLD_ID,
      blockerPlayerId: PLAYER_ID,
      blockedPlayerId: RECIPIENT_ID,
      reason: 'spam',
    });
    expect(response.blockedPlayerName).toBe('Scholar');
  });

  it('reports messages into the moderation queue', async () => {
    const { service, reports } = await createService();

    const response = await service.reportMessage('message-1', { reason: 'spam' });

    expect(reports[0]).toMatchObject({
      worldId: WORLD_ID,
      messageId: 'message-1',
      reporterPlayerId: PLAYER_ID,
      reason: 'spam',
      status: 'pending',
    });
    expect(response).toEqual({ reportId: 'message-report-1', status: 'pending' });
  });

  it('rejects messaging when a block exists', async () => {
    const { service, prisma } = await createService();
    prisma.playerBlock.findFirst.mockResolvedValueOnce({ id: 'block-1' });

    await expect(
      service.sendMessage({
        recipientPlayerId: RECIPIENT_ID,
        subject: 'Trade',
        body: 'Hello',
      }),
    ).rejects.toThrow(ApiErrorException);
  });
});
