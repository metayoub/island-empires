import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { ResearchService } from './research.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
  })),
}));

const PLAYER_ID = 'player-1';
const WORLD_ID = 'world-1';
const CITY_ID = 'city-1';
const HOUR_MS = 1000 * 60 * 60;

function buildFakePrisma(options?: {
  researchPoints?: number;
  researchLastCalculatedAt?: Date;
  scientists?: number;
  academyLevel?: number | null;
  completedTechnologyIds?: string[];
}) {
  const state = {
    player: { id: PLAYER_ID, worldId: WORLD_ID },
    researchState: {
      playerId: PLAYER_ID,
      worldId: WORLD_ID,
      researchPoints: options?.researchPoints ?? 0,
      researchLastCalculatedAt: options?.researchLastCalculatedAt ?? new Date(Date.now() - HOUR_MS),
    },
    city: { id: CITY_ID, playerId: PLAYER_ID, createdAt: new Date('2026-01-01T00:00:00.000Z') },
    assignment: { cityId: CITY_ID, scientists: options?.scientists ?? 5 },
    academyBuilding:
      options?.academyLevel == null ? null : { cityId: CITY_ID, buildingType: 'academy', level: options.academyLevel },
    completedTechnologies: (options?.completedTechnologyIds ?? []).map((technologyId) => ({
      technologyId,
    })),
    activeJob: null as null | {
      id: string;
      worldId: string;
      playerId: string;
      technologyId: string;
      status: string;
      startedAt: Date;
      finishesAt: Date;
      completedAt: Date | null;
    },
    pointTransactions: [] as unknown[],
    reports: [] as unknown[],
    jobCounter: 0,
  };

  const shared = {
    player: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.player)),
    },
    playerResearchState: {
      upsert: jest.fn().mockImplementation(({ update, create }) => {
        state.researchState = state.researchState
          ? { ...state.researchState, ...update }
          : { ...create };
        return Promise.resolve(state.researchState);
      }),
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.researchState)),
      update: jest.fn().mockImplementation(({ data }) => {
        state.researchState = { ...state.researchState, ...data };
        return Promise.resolve(state.researchState);
      }),
    },
    city: {
      findFirstOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.city)),
    },
    cityWorkerAssignment: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.assignment)),
    },
    cityBuilding: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(state.academyBuilding)),
    },
    playerTechnology: {
      findMany: jest.fn().mockImplementation(() => Promise.resolve(state.completedTechnologies)),
      upsert: jest.fn().mockImplementation(({ where, create }) => {
        const exists = state.completedTechnologies.some(
          (tech) => tech.technologyId === where.playerId_technologyId.technologyId,
        );
        if (!exists) {
          state.completedTechnologies.push({ technologyId: create.technologyId });
        }
        return Promise.resolve(create);
      }),
    },
    researchJob: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (state.activeJob && state.activeJob.status === where.status) {
          return Promise.resolve(state.activeJob);
        }
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (state.activeJob && state.activeJob.id === where.id) {
          return Promise.resolve(state.activeJob);
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(() => {
        if (state.activeJob && state.activeJob.status === 'active' && state.activeJob.finishesAt <= new Date()) {
          return Promise.resolve([{ id: state.activeJob.id }]);
        }
        return Promise.resolve([]);
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        if (state.activeJob && state.activeJob.id === where.id && state.activeJob.status === 'active') {
          state.activeJob = { ...state.activeJob, ...data };
          return Promise.resolve({ count: 1 });
        }
        return Promise.resolve({ count: 0 });
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        state.jobCounter += 1;
        state.activeJob = { id: `job-${state.jobCounter}`, completedAt: null, ...data };
        return Promise.resolve(state.activeJob);
      }),
    },
    researchPointTransaction: {
      create: jest.fn().mockImplementation(({ data }) => {
        state.pointTransactions.push(data);
        return Promise.resolve(data);
      }),
    },
    report: {
      create: jest.fn().mockImplementation(({ data }) => {
        state.reports.push(data);
        return Promise.resolve(data);
      }),
    },
  };

  const prisma = {
    ...shared,
    $transaction: jest.fn().mockImplementation((callback: (tx: unknown) => unknown) => callback(shared)),
  };

  return { prisma, state };
}

describe('ResearchService', () => {
  async function createService(prisma: unknown): Promise<ResearchService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ResearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('redis://localhost:6379') } },
      ],
    }).compile();

    return moduleRef.get(ResearchService);
  }

  it('generates research points based on scientists and Academy level', async () => {
    const { prisma } = buildFakePrisma({ scientists: 5, academyLevel: 1 });
    const service = await createService(prisma);

    const result = await service.recalculateResearchPoints(PLAYER_ID);

    expect(result.researchPointsPerHour).toBe(25);
    expect(result.researchPoints).toBe(25);
  });

  it('disables research production without an Academy', async () => {
    const { prisma } = buildFakePrisma({ scientists: 5, academyLevel: null });
    const service = await createService(prisma);

    const result = await service.recalculateResearchPoints(PLAYER_ID);

    expect(result.researchPointsPerHour).toBe(0);
    expect(result.researchPoints).toBe(0);
  });

  it('starts research and deducts the technology cost', async () => {
    const { prisma, state } = buildFakePrisma({ researchPoints: 1000, scientists: 0 });
    const service = await createService(prisma);

    const result = await service.startResearch(PLAYER_ID, 'improved_woodcutting');

    expect(result.researchPoints).toBe(100);
    expect(result.activeResearch.technologyId).toBe('improved_woodcutting');
    expect(state.activeJob?.status).toBe('active');
  });

  it('rejects starting research without enough points', async () => {
    const { prisma } = buildFakePrisma({ researchPoints: 10, scientists: 0 });
    const service = await createService(prisma);

    await expect(service.startResearch(PLAYER_ID, 'improved_woodcutting')).rejects.toThrow(
      ApiErrorException,
    );
  });

  it('rejects starting a locked technology', async () => {
    const { prisma } = buildFakePrisma({ researchPoints: 1000, scientists: 0 });
    const service = await createService(prisma);

    await expect(service.startResearch(PLAYER_ID, 'basic_architecture')).rejects.toThrow(
      'Technology requirements are not completed.',
    );
  });

  it('rejects starting a second research while one is active', async () => {
    const { prisma } = buildFakePrisma({ researchPoints: 1000, scientists: 0 });
    const service = await createService(prisma);

    await service.startResearch(PLAYER_ID, 'improved_woodcutting');

    await expect(service.startResearch(PLAYER_ID, 'basic_navigation')).rejects.toThrow(
      'Another technology is already being researched.',
    );
  });

  it('rejects starting an already completed technology', async () => {
    const { prisma } = buildFakePrisma({
      researchPoints: 1000,
      scientists: 0,
      completedTechnologyIds: ['improved_woodcutting'],
    });
    const service = await createService(prisma);

    await expect(service.startResearch(PLAYER_ID, 'improved_woodcutting')).rejects.toThrow(
      'This technology has already been researched.',
    );
  });

  it('completes a due research job idempotently, unlocking the technology once', async () => {
    const { prisma, state } = buildFakePrisma({ researchPoints: 1000, scientists: 0 });
    const service = await createService(prisma);

    await service.startResearch(PLAYER_ID, 'improved_woodcutting');
    const jobId = state.activeJob!.id;
    state.activeJob!.finishesAt = new Date(Date.now() - 1000);

    await expect(service.completeResearchJob(jobId)).resolves.toBe(true);
    await expect(service.completeResearchJob(jobId)).resolves.toBe(false);

    expect(state.completedTechnologies).toEqual([{ technologyId: 'improved_woodcutting' }]);
    expect(state.reports).toHaveLength(1);
  });
});
