import { PvpService } from './pvp.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
  })),
}));

const WORLD_ID = 'world-1';
const ATTACKER_ID = 'attacker-1';
const DEFENDER_ID = 'defender-1';
const ORIGIN_CITY_ID = 'city-origin';
const TARGET_CITY_ID = 'city-target';

function buildService(overrides: { targetCreatedAt?: Date } = {}) {
  const now = new Date();
  const originCity = {
    id: ORIGIN_CITY_ID,
    worldId: WORLD_ID,
    playerId: ATTACKER_ID,
    islandId: 'island-1',
    slotIndex: 1,
    name: 'Origin',
    island: { id: 'island-1', x: 1, y: 1 },
    world: { speedTravel: 1 },
    player: { id: ATTACKER_ID, name: 'Attacker', createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000) },
  };
  const targetCity = {
    id: TARGET_CITY_ID,
    worldId: WORLD_ID,
    playerId: DEFENDER_ID,
    islandId: 'island-2',
    slotIndex: 2,
    name: 'Target',
    island: { id: 'island-2', x: 3, y: 3 },
    player: {
      id: DEFENDER_ID,
      name: 'Defender',
      createdAt: overrides.targetCreatedAt ?? now,
    },
  };
  const analyticsEvents: Array<Record<string, unknown>> = [];
  const tx = {
    city: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === ORIGIN_CITY_ID ? originCity : targetCity),
      ),
    },
    cityUnit: {
      findMany: jest.fn().mockResolvedValue([{ unitType: 'spearman', quantity: 10 }]),
    },
    allianceMember: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    movement: {
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    },
    gameAnalyticsEvent: {
      create: jest.fn().mockImplementation(({ data }) => {
        analyticsEvents.push(data);
        return Promise.resolve(data);
      }),
    },
    abuseSignal: {
      create: jest.fn().mockResolvedValue({ id: 'signal-1' }),
    },
  };
  const prisma = {
    $transaction: jest.fn().mockImplementation((callback: (transaction: unknown) => unknown) => callback(tx)),
    movement: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const developmentStateService = {
    ensureDevelopmentState: jest.fn().mockResolvedValue({
      player: { id: ATTACKER_ID, name: 'Attacker', score: 0 },
      world: { id: WORLD_ID, name: 'World', status: 'development' },
      selectedCityId: ORIGIN_CITY_ID,
      onboarding: { hasCompletedTutorial: true, currentQuestId: null },
    }),
  };
  const resourcesService = {
    recalculateResources: jest.fn().mockResolvedValue(undefined),
  };
  const antiAbuseService = {
    monitorAction: jest.fn().mockResolvedValue({ allowed: true, count: 1 }),
  };
  const configService = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  };
  const service = new PvpService(
    prisma as never,
    undefined,
    developmentStateService as never,
    resourcesService as never,
    antiAbuseService as never,
    configService as never,
  );

  return { service, analyticsEvents };
}

describe('PvpService', () => {
  it('blocks attacks against beginner-protected target players and logs the attempt', async () => {
    const { service, analyticsEvents } = buildService();

    await expect(
      service.attackCity(TARGET_CITY_ID, {
        originCityId: ORIGIN_CITY_ID,
        units: { spearman: 5 },
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'TARGET_BEGINNER_PROTECTED',
      }),
    });

    expect(analyticsEvents).toContainEqual(
      expect.objectContaining({
        eventType: 'pvp_attack_blocked',
        payload: expect.objectContaining({
          reason: 'TARGET_BEGINNER_PROTECTED',
          targetCityId: TARGET_CITY_ID,
        }),
      }),
    );
  });
});
