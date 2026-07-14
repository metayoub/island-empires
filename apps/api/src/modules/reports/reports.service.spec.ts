import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { ReportsService } from './reports.service';

const WORLD_ID = 'world-1';
const PLAYER_ID = 'player-1';

function buildReportsPrisma() {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const report = {
    id: 'report-1',
    worldId: WORLD_ID,
    playerId: PLAYER_ID,
    cityId: 'city-1',
    type: 'building_completed',
    title: 'Building completed',
    message: 'City Hall has finished upgrading.',
    payload: null,
    isRead: false,
    createdAt,
  };
  const prisma = {
    report: {
      findMany: jest.fn().mockResolvedValue([report]),
      findUnique: jest.fn().mockResolvedValue(report),
      update: jest.fn().mockResolvedValue({ ...report, isRead: true }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(2),
    },
    message: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    notificationPreference: {
      upsert: jest.fn().mockResolvedValue({
        playerId: PLAYER_ID,
        worldId: WORLD_ID,
        inGameEnabled: true,
        emailEnabled: false,
        browserPushEnabled: false,
        constructionCompleted: true,
        researchCompleted: true,
        tradeArrived: true,
        armyReturned: true,
        incomingAttack: true,
        allianceMessage: true,
        warehouseFull: true,
        eventEnding: true,
        quietHoursStart: null,
        quietHoursEnd: null,
      }),
    },
    notificationDelivery: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(1),
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'delivery-1',
          type: 'construction_completed',
          channel: 'in_game',
          status: 'delivered',
          title: 'Building completed',
          body: 'City Hall has finished upgrading.',
          reportId: 'report-1',
          messageId: null,
          createdAt,
          deliveredAt: createdAt,
          readAt: null,
          archivedAt: null,
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'delivery-1',
        worldId: WORLD_ID,
        playerId: PLAYER_ID,
        type: 'construction_completed',
        channel: 'in_game',
        status: 'delivered',
        title: 'Building completed',
        body: 'City Hall has finished upgrading.',
        reportId: 'report-1',
        messageId: null,
        createdAt,
        deliveredAt: createdAt,
        readAt: null,
        archivedAt: null,
      }),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'delivery-1',
          type: 'construction_completed',
          channel: 'in_game',
          status: data.status ?? 'delivered',
          title: 'Building completed',
          body: 'City Hall has finished upgrading.',
          reportId: 'report-1',
          messageId: null,
          createdAt,
          deliveredAt: createdAt,
          readAt: data.readAt ?? null,
          archivedAt: data.archivedAt ?? null,
        }),
      ),
    },
    browserPushSubscription: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'push-1',
          endpoint: 'https://push.example/subscription',
          enabled: true,
          createdAt,
          updatedAt: createdAt,
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'push-1',
        worldId: WORLD_ID,
        playerId: PLAYER_ID,
        endpoint: 'https://push.example/subscription',
        enabled: true,
        createdAt,
        updatedAt: createdAt,
      }),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'push-1',
          endpoint: 'https://push.example/subscription',
          enabled: data.enabled,
          createdAt,
          updatedAt: createdAt,
        }),
      ),
    },
  };

  return { prisma };
}

describe('ReportsService', () => {
  async function createService() {
    const { prisma } = buildReportsPrisma();
    const developmentStateService = {
      ensureDevelopmentState: jest.fn().mockResolvedValue({
        player: { id: PLAYER_ID, name: 'Founder', score: 0 },
        world: { id: WORLD_ID, name: 'First World', status: 'development' },
        selectedCityId: 'city-1',
        onboarding: { hasCompletedTutorial: false, currentQuestId: 'welcome_city' },
      }),
    };
    const messagesService = {
      getInbox: jest.fn().mockResolvedValue({
        messages: [
          {
            id: 'message-1',
            messageType: 'player',
            subject: 'Trade',
            bodyPreview: 'Hello',
            isRead: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            readAt: null,
            sender: { id: 'player-2', name: 'Scholar' },
            recipient: { id: PLAYER_ID, name: 'Founder' },
          },
        ],
      }),
      getUnreadMessageCount: jest.fn().mockResolvedValue(3),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: DevelopmentStateService, useValue: developmentStateService },
        { provide: MessagesService, useValue: messagesService },
      ],
    }).compile();

    return { service: moduleRef.get(ReportsService), prisma, messagesService };
  }

  it('returns categorized construction reports', async () => {
    const { service, prisma } = await createService();

    const reports = await service.getReports({ category: 'construction' });

    expect(prisma.report.findMany).toHaveBeenCalledWith({
      where: {
        playerId: PLAYER_ID,
        type: { in: ['building_completed', 'units_trained', 'city_founded'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    expect(reports[0]).toMatchObject({
      id: 'report-1',
      type: 'building_completed',
      category: 'construction',
      isRead: false,
    });
  });

  it('marks reports as read', async () => {
    const { service, prisma } = await createService();

    const report = await service.markRead('report-1');

    expect(prisma.report.update).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: { isRead: true },
    });
    expect(report.isRead).toBe(true);
  });

  it('returns notification center with combined unread counters', async () => {
    const { service } = await createService();

    const response = await service.getNotificationCenter();

    expect(response.unread).toEqual({ total: 5, messages: 3, reports: 2, notifications: 1 });
    expect(response.settings.inGameEnabled).toBe(true);
    expect(response.deliveries[0]).toMatchObject({ id: 'delivery-1', channel: 'in_game' });
    expect(response.messages).toHaveLength(1);
    expect(response.reports[0]).toMatchObject({ id: 'report-1' });
  });

  it('marks an owned notification as read', async () => {
    const { service, prisma } = await createService();

    const response = await service.markNotificationRead('delivery-1');

    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: expect.objectContaining({ readAt: expect.any(Date) }),
    });
    expect(prisma.report.updateMany).toHaveBeenCalledWith({
      where: { id: 'report-1', playerId: PLAYER_ID, worldId: WORLD_ID },
      data: { isRead: true },
    });
    expect(response.readAt).toBeTruthy();
  });

  it('archives an owned notification', async () => {
    const { service, prisma } = await createService();

    const response = await service.archiveNotification('delivery-1');

    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      data: expect.objectContaining({
        archivedAt: expect.any(Date),
        readAt: expect.any(Date),
      }),
    });
    expect(response.archivedAt).toBeTruthy();
  });

  it('lists and disables owned browser push subscriptions', async () => {
    const { service, prisma } = await createService();

    const list = await service.listBrowserPushSubscriptions();
    const disabled = await service.disableBrowserPushSubscription('push-1');

    expect(list.subscriptions).toHaveLength(1);
    expect(prisma.browserPushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'push-1' },
      data: { enabled: false },
    });
    expect(disabled.enabled).toBe(false);
  });
});
