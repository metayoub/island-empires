import { ConfigService } from '@nestjs/config';
import { ScoutingService } from './scouting.service';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesService } from '../resources/resources.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
  })),
}));

const WORLD_ID = 'world-1';
const PLAYER_ID = 'player-1';
const CITY_ID = 'city-1';

function createService(prisma: unknown): ScoutingService {
  return new ScoutingService(
    prisma as PrismaService,
    { track: jest.fn() } as unknown as AnalyticsService,
    {
      ensureDevelopmentState: jest.fn().mockResolvedValue({
        player: { id: PLAYER_ID, name: 'Founder' },
        world: { id: WORLD_ID, name: 'World', status: 'development' },
        selectedCityId: CITY_ID,
        onboarding: { hasCompletedTutorial: false, currentQuestId: null },
      }),
    } as unknown as DevelopmentStateService,
    { recalculateResources: jest.fn() } as unknown as ResourcesService,
    { get: jest.fn().mockReturnValue('redis://localhost:6379') } as unknown as ConfigService,
  );
}

describe('ScoutingService', () => {
  it('blocks spy training until the Spy Agency is built', async () => {
    const tx = {
      city: {
        findUnique: jest.fn().mockResolvedValue({
          id: CITY_ID,
          worldId: WORLD_ID,
          playerId: PLAYER_ID,
          world: { speedBuilding: 1 },
        }),
      },
      cityBuilding: {
        findUnique: jest.fn().mockResolvedValue({ buildingType: 'spy_agency', level: 0 }),
      },
      spyTrainingJob: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const prisma = {
      spyTrainingJob: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation((callback: (tx: unknown) => unknown) => callback(tx)),
    };
    const service = createService(prisma);

    await expect(service.trainSpies(CITY_ID, { quantity: 1 })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SPY_AGENCY_REQUIRED' }),
    });
  });

  it('completes spy training once and increments city spy state idempotently', async () => {
    const state = {
      job: {
        id: 'spy-job-1',
        worldId: WORLD_ID,
        playerId: PLAYER_ID,
        cityId: CITY_ID,
        quantity: 3,
        status: 'training',
        finishesAt: new Date('2026-01-01T00:00:00.000Z'),
        city: { name: 'New Haven' },
      },
      spies: 0,
      reports: [] as unknown[],
    };
    const tx = {
      spyTrainingJob: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(state.job)),
        updateMany: jest.fn().mockImplementation(() => {
          if (state.job.status !== 'training') return Promise.resolve({ count: 0 });
          state.job = { ...state.job, status: 'completed' };
          return Promise.resolve({ count: 1 });
        }),
      },
      citySpyState: {
        upsert: jest.fn().mockImplementation(({ update }) => {
          state.spies += update.spies.increment;
          return Promise.resolve({ spies: state.spies });
        }),
      },
      report: {
        create: jest.fn().mockImplementation(({ data }) => {
          state.reports.push(data);
          return Promise.resolve(data);
        }),
      },
      gameAnalyticsEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((callback: (tx: unknown) => unknown) => callback(tx)),
    };
    const service = createService(prisma);

    await expect(service.completeSpyTrainingJob(state.job.id)).resolves.toBe(true);
    await expect(service.completeSpyTrainingJob(state.job.id)).resolves.toBe(false);

    expect(state.spies).toBe(3);
    expect(state.reports).toHaveLength(1);
  });
});
