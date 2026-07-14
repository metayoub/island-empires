import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { LiveEventsService } from '../live-events/live-events.service';
import { ResourcesService } from './resources.service';

const CITY_ID = 'city-1';
const HOUR_MS = 1000 * 60 * 60;

function buildFakePrisma(overrides?: {
  wood?: number;
  gold?: number;
  lastCalculatedAt?: Date;
  woodWorkers?: number;
  goldWorkers?: number;
  luxuryWorkers?: number;
  warehouseLevel?: number;
  luxuryExtractorLevel?: number | null;
  forestersLevel?: number | null;
  luxuryProductionBuildingLevel?: number | null;
  luxuryResource?: string;
  cityUnits?: Array<{ unitType: string; quantity: number }>;
}) {
  const state = {
    city: {
      id: CITY_ID,
      worldId: 'world-1',
      playerId: 'player-1',
      population: 50,
      island: { luxuryResource: overrides?.luxuryResource ?? 'marble' },
    },
    resource: {
      cityId: CITY_ID,
      wood: overrides?.wood ?? 500,
      gold: overrides?.gold ?? 300,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
      lastCalculatedAt: overrides?.lastCalculatedAt ?? new Date(),
    },
    workerAssignment: {
      cityId: CITY_ID,
      woodWorkers: overrides?.woodWorkers ?? 5,
      goldWorkers: overrides?.goldWorkers ?? 5,
      luxuryWorkers: overrides?.luxuryWorkers ?? 0,
      idleCitizens: 40,
    },
    warehouse:
      overrides?.warehouseLevel === undefined
        ? { level: 1 }
        : overrides.warehouseLevel === null
          ? null
          : { level: overrides.warehouseLevel },
    luxuryExtractor:
      overrides?.luxuryExtractorLevel === undefined
        ? { level: 0 }
        : overrides.luxuryExtractorLevel === null
          ? null
          : { level: overrides.luxuryExtractorLevel },
    productionBoostBuildings: [
      ...(overrides?.forestersLevel === null
        ? []
        : [{ buildingType: 'foresters_house', level: overrides?.forestersLevel ?? 0 }]),
      ...(overrides?.luxuryProductionBuildingLevel === null
        ? []
        : [
            {
              buildingType:
                overrides?.luxuryResource === 'wine'
                  ? 'vineyard_estate'
                  : overrides?.luxuryResource === 'crystal'
                    ? 'crystal_lensworks'
                    : overrides?.luxuryResource === 'sulfur'
                      ? 'sulfur_refinery'
                      : 'marble_mason',
              level: overrides?.luxuryProductionBuildingLevel ?? 0,
            },
          ]),
    ],
    cityUnits: overrides?.cityUnits ?? [],
  };

  const transactions: Array<{
    worldId: string;
    cityId: string;
    playerId: string;
    transactionType: string;
    resourceType: string;
    amount: number;
    balanceAfter: number;
  }> = [];

  const tx = {
    city: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.city)),
    },
    cityResource: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.resource)),
      update: jest.fn().mockImplementation(({ data }) => {
        state.resource = { ...state.resource, ...data };
        return Promise.resolve(state.resource);
      }),
    },
    cityWorkerAssignment: {
      findUniqueOrThrow: jest
        .fn()
        .mockImplementation(() => Promise.resolve(state.workerAssignment)),
    },
    cityBuilding: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const buildingType = where.cityId_buildingType.buildingType;

        if (buildingType === 'warehouse') return Promise.resolve(state.warehouse);
        if (buildingType === 'luxury_extractor') return Promise.resolve(state.luxuryExtractor);
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockResolvedValue(state.productionBoostBuildings),
    },
    cityUnit: {
      findMany: jest.fn().mockResolvedValue(state.cityUnits),
    },
    resourceTransaction: {
      create: jest.fn().mockImplementation(({ data }) => {
        transactions.push(data);
        return Promise.resolve(data);
      }),
    },
    report: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
  };

  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => unknown) => callback(tx)),
  };

  return { prisma, state, transactions, tx };
}

describe('ResourcesService', () => {
  async function createService(prisma: unknown): Promise<ResourcesService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: LiveEventsService,
          useValue: {
            getActiveBonusPercent: jest.fn().mockResolvedValue(0),
            recordParticipationForActiveEvents: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    return moduleRef.get(ResourcesService);
  }

  it('recalculates resources based on elapsed time and updates lastCalculatedAt', async () => {
    const lastCalculatedAt = new Date(Date.now() - HOUR_MS);
    const { prisma } = buildFakePrisma({ lastCalculatedAt });
    const service = await createService(prisma);

    const result = await service.recalculateResources(CITY_ID);

    expect(result.resources.wood).toBeGreaterThanOrEqual(555);
    expect(result.resources.gold).toBeGreaterThanOrEqual(335);
    expect(new Date(result.resources.lastCalculatedAt).getTime()).toBeGreaterThan(
      lastCalculatedAt.getTime(),
    );
  });

  it('does not exceed storage capacity and reports full resources', async () => {
    const lastCalculatedAt = new Date(Date.now() - HOUR_MS);
    const { prisma, tx } = buildFakePrisma({ wood: 2980, lastCalculatedAt });
    const service = await createService(prisma);

    const result = await service.recalculateResources(CITY_ID);

    expect(result.resources.wood).toBe(3000);
    expect(result.storage.capacityPerResource).toBe(3000);
    expect(result.storage.fullResources).toContain('wood');
    expect(tx.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'warehouse_full',
        title: 'Warehouse full',
        cityId: CITY_ID,
      }),
    });
  });

  it('logs a production transaction only when an amount was actually produced', async () => {
    const lastCalculatedAt = new Date(Date.now() - HOUR_MS);
    const { prisma, transactions } = buildFakePrisma({ lastCalculatedAt });
    const service = await createService(prisma);

    await service.recalculateResources(CITY_ID);

    expect(transactions.length).toBe(2);
    expect(transactions.every((t) => t.transactionType === 'production')).toBe(true);
    expect(transactions.every((t) => t.amount > 0)).toBe(true);
  });

  it('subtracts stationed unit upkeep from resource production', async () => {
    const lastCalculatedAt = new Date(Date.now() - HOUR_MS);
    const { prisma, transactions } = buildFakePrisma({
      gold: 300,
      goldWorkers: 0,
      lastCalculatedAt,
      cityUnits: [{ unitType: 'spearman', quantity: 25 }],
    });
    const service = await createService(prisma);

    const result = await service.recalculateResources(CITY_ID);

    expect(result.production.goldPerHour).toBe(-5);
    expect(result.resources.gold).toBeLessThanOrEqual(295);
    expect(transactions).toContainEqual(
      expect.objectContaining({
        transactionType: 'unit_upkeep',
        resourceType: 'gold',
        amount: expect.any(Number),
      }),
    );
  });

  it('does not log a transaction when storage is already full (0 produced)', async () => {
    const lastCalculatedAt = new Date(Date.now() - HOUR_MS);
    const { prisma, transactions } = buildFakePrisma({ wood: 3000, gold: 3000, lastCalculatedAt });
    const service = await createService(prisma);

    await service.recalculateResources(CITY_ID);

    expect(transactions.length).toBe(0);
  });

  it('does not duplicate production when called again immediately after', async () => {
    const lastCalculatedAt = new Date(Date.now() - HOUR_MS);
    const { prisma } = buildFakePrisma({ lastCalculatedAt });
    const service = await createService(prisma);

    const first = await service.recalculateResources(CITY_ID);
    const second = await service.recalculateResources(CITY_ID);

    expect(second.resources.wood).toBe(first.resources.wood);
    expect(second.resources.gold).toBe(first.resources.gold);
  });

  it('produces the island luxury resource when workers and extractor are available', async () => {
    const lastCalculatedAt = new Date(Date.now() - HOUR_MS);
    const { prisma, transactions } = buildFakePrisma({
      lastCalculatedAt,
      luxuryWorkers: 10,
      luxuryExtractorLevel: 1,
      luxuryResource: 'crystal',
    });
    const service = await createService(prisma);

    const result = await service.recalculateResources(CITY_ID);

    expect(result.resources.crystal).toBeGreaterThanOrEqual(40);
    expect(result.production.crystalPerHour).toBe(40);
    expect(transactions.some((transaction) => transaction.resourceType === 'crystal')).toBe(true);
  });

  it('applies city-local production boost buildings', async () => {
    const lastCalculatedAt = new Date(Date.now() - HOUR_MS);
    const { prisma } = buildFakePrisma({
      lastCalculatedAt,
      woodWorkers: 10,
      luxuryWorkers: 10,
      luxuryExtractorLevel: 1,
      luxuryResource: 'sulfur',
      forestersLevel: 5,
      luxuryProductionBuildingLevel: 10,
    });
    const service = await createService(prisma);

    const result = await service.recalculateResources(CITY_ID);

    expect(result.production.woodPerHour).toBe(88);
    expect(result.production.sulfurPerHour).toBe(48);
  });
});
