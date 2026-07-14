import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BuildingsService } from './buildings.service';
import { PrismaService } from '../../database/prisma.service';
import { ResourcesService } from '../resources/resources.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
  })),
}));

const BUILDING_ID = 'building-1';
const CITY_ID = 'city-1';

function buildFakePrisma() {
  const state = {
    building: {
      id: BUILDING_ID,
      cityId: 'city-1',
      buildingType: 'warehouse',
      level: 1,
      slotIndex: 1,
      status: 'upgrading',
      upgradeStartedAt: new Date('2026-01-01T00:00:00.000Z'),
      upgradeFinishesAt: new Date('2026-01-01T00:00:01.000Z'),
      city: {
        worldId: 'world-1',
        playerId: 'player-1',
      },
    },
  };
  const reports: unknown[] = [];

  const tx = {
    cityBuilding: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(state.building)),
      updateMany: jest.fn().mockImplementation(({ data }) => {
        if (state.building.status !== 'upgrading') {
          return Promise.resolve({ count: 0 });
        }

        state.building = {
          ...state.building,
          level: state.building.level + data.level.increment,
          status: data.status,
          upgradeStartedAt: data.upgradeStartedAt,
          upgradeFinishesAt: data.upgradeFinishesAt,
        };

        return Promise.resolve({ count: 1 });
      }),
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.building)),
    },
    report: {
      create: jest.fn().mockImplementation(({ data }) => {
        reports.push(data);
        return Promise.resolve(data);
      }),
    },
  };

  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => unknown) => callback(tx)),
  };

  return { prisma, state, reports };
}

function buildUpgradePrisma(input: { completedTechnologies?: string[] } = {}) {
  const state = {
    city: {
      id: CITY_ID,
      worldId: 'world-1',
      playerId: 'player-1',
      population: 500,
      happiness: 100,
      island: { luxuryResource: 'marble' },
      world: { speedBuilding: 1 },
    },
    building: {
      id: BUILDING_ID,
      cityId: CITY_ID,
      buildingType: 'city_hall',
      level: 9,
      slotIndex: 0,
      status: 'idle',
      upgradeStartedAt: null as Date | null,
      upgradeFinishesAt: null as Date | null,
    },
    resources: {
      cityId: CITY_ID,
      wood: 1_000_000,
      gold: 1_000_000,
      marble: 1_000_000,
      wine: 1_000_000,
      crystal: 1_000_000,
      sulfur: 1_000_000,
      lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  };

  const tx = {
    city: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(state.city),
    },
    cityBuilding: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        if (where?.status === 'upgrading') return Promise.resolve([]);

        return Promise.resolve([
          state.building,
          { buildingType: 'warehouse', level: 10 },
          { buildingType: 'builders_guild', level: 0 },
        ]);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const buildingType = where.cityId_buildingType.buildingType;
        if (buildingType === 'builders_guild') {
          return Promise.resolve({ buildingType, level: 0 });
        }
        if (buildingType === state.building.buildingType) {
          return Promise.resolve(state.building);
        }

        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(({ data }) => {
        state.building = { ...state.building, ...data };
        return Promise.resolve(state.building);
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    playerTechnology: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          (input.completedTechnologies ?? []).map((technologyId) => ({ technologyId })),
        ),
    },
    cityResource: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(state.resources),
      update: jest.fn().mockImplementation(({ data }) => {
        state.resources = { ...state.resources, ...data };
        return Promise.resolve(state.resources);
      }),
    },
    resourceTransaction: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const prisma = {
    cityBuilding: {
      findMany: tx.cityBuilding.findMany,
      findUnique: tx.cityBuilding.findUnique,
      findFirst: tx.cityBuilding.findFirst,
    },
    city: tx.city,
    playerTechnology: tx.playerTechnology,
    cityResource: tx.cityResource,
    resourceTransaction: tx.resourceTransaction,
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => unknown) => callback(tx)),
  };

  return { prisma, state, tx };
}

describe('BuildingsService', () => {
  async function createService(prisma: unknown): Promise<BuildingsService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BuildingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ResourcesService, useValue: { recalculateResources: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('redis://localhost:6379') },
        },
      ],
    }).compile();

    return moduleRef.get(BuildingsService);
  }

  it('completes an due upgrade, increments level, clears timer, and creates a report once', async () => {
    const { prisma, state, reports } = buildFakePrisma();
    const service = await createService(prisma);

    await expect(service.completeUpgrade(BUILDING_ID)).resolves.toBe(true);
    await expect(service.completeUpgrade(BUILDING_ID)).resolves.toBe(false);

    expect(state.building.level).toBe(2);
    expect(state.building.status).toBe('idle');
    expect(state.building.upgradeStartedAt).toBeNull();
    expect(state.building.upgradeFinishesAt).toBeNull();
    expect(reports).toHaveLength(1);
  });

  it('blocks an upgrade when the target milestone research is missing', async () => {
    const { prisma } = buildUpgradePrisma();
    const service = await createService(prisma);

    await expect(
      service.startUpgrade({ cityId: CITY_ID, buildingType: 'city_hall' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'BUILDING_MILESTONE_CONDITION_UNMET',
        message: 'Requires research: Basic Architecture.',
      }),
    });
  });

  it('allows an upgrade when the target milestone research is completed', async () => {
    const { prisma, state } = buildUpgradePrisma({
      completedTechnologies: ['basic_architecture'],
    });
    const service = await createService(prisma);

    const result = await service.startUpgrade({ cityId: CITY_ID, buildingType: 'city_hall' });

    expect(state.building.status).toBe('upgrading');
    expect(result.activeConstruction).toMatchObject({
      buildingId: BUILDING_ID,
      buildingType: 'city_hall',
      fromLevel: 9,
      toLevel: 10,
    });
  });
});
