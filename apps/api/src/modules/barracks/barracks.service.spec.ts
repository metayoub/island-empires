import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesService } from '../resources/resources.service';
import { BarracksService } from './barracks.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
  })),
}));

const WORLD_ID = 'world-1';
const PLAYER_ID = 'player-1';
const CITY_ID = 'city-1';

const BOOTSTRAP = {
  player: { id: PLAYER_ID, name: 'Founder', score: 0 },
  world: { id: WORLD_ID, name: 'First World', status: 'development' },
  selectedCityId: CITY_ID,
  onboarding: { hasCompletedTutorial: false, currentQuestId: null },
};

function buildFakePrisma(options?: {
  barracksLevel?: number;
  workshopLevel?: number;
  wood?: number;
  gold?: number;
  activeOrder?: unknown;
}) {
  const city = {
    id: CITY_ID,
    worldId: WORLD_ID,
    playerId: PLAYER_ID,
    name: 'New Haven',
    world: { id: WORLD_ID, speedBuilding: 1 },
  };
  const resources = {
    cityId: CITY_ID,
    wood: options?.wood ?? 500,
    gold: options?.gold ?? 300,
    marble: 0,
    wine: 0,
    crystal: 0,
    sulfur: 0,
    lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const createdOrders: Array<Record<string, unknown>> = [];
  const transactions: Array<Record<string, unknown>> = [];
  const resourceUpdates: Array<Record<string, unknown>> = [];

  const tx = {
    city: {
      findUnique: jest.fn().mockResolvedValue(city),
    },
    cityBuilding: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'barracks-1',
        cityId: CITY_ID,
        buildingType: 'barracks',
        level: options?.barracksLevel ?? 1,
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'barracks-1',
          cityId: CITY_ID,
          buildingType: 'barracks',
          level: options?.barracksLevel ?? 1,
        },
        {
          id: 'workshop-1',
          cityId: CITY_ID,
          buildingType: 'workshop',
          level: options?.workshopLevel ?? 0,
        },
      ]),
    },
    cityResource: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(resources),
      update: jest.fn().mockImplementation(({ data }) => {
        resourceUpdates.push(data);
        return Promise.resolve({ ...resources, ...data });
      }),
    },
    unitTrainingOrder: {
      findFirst: jest.fn().mockResolvedValue(options?.activeOrder ?? null),
      findMany: jest.fn().mockResolvedValue(options?.activeOrder ? [options.activeOrder] : []),
      create: jest.fn().mockImplementation(({ data }) => {
        const order = { id: 'order-1', ...data };
        createdOrders.push(order);
        return Promise.resolve(order);
      }),
    },
    playerTechnology: {
      findMany: jest.fn().mockResolvedValue([
        { technologyId: 'basic_training' },
        { technologyId: 'formation_tactics' },
        { technologyId: 'iron_weapons' },
        { technologyId: 'siege_engineering' },
        { technologyId: 'basic_navigation' },
        { technologyId: 'shipbuilding' },
        { technologyId: 'crystal_optics' },
        { technologyId: 'reinforced_hulls' },
        { technologyId: 'naval_tactics' },
      ]),
    },
    resourceTransaction: {
      create: jest.fn().mockImplementation(({ data }) => {
        transactions.push(data);
        return Promise.resolve(data);
      }),
    },
  };

  const prisma = {
    $transaction: jest.fn().mockImplementation((callback: (tx: unknown) => unknown) => callback(tx)),
    unitTrainingOrder: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    playerTechnology: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  return { prisma, tx, createdOrders, transactions, resourceUpdates };
}

function buildCompletionPrisma() {
  const order = {
    id: 'order-1',
    worldId: WORLD_ID,
    playerId: PLAYER_ID,
    cityId: CITY_ID,
    unitType: 'spearman',
    quantity: 5,
    status: 'active',
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    finishesAt: new Date('2026-01-01T00:02:30.000Z'),
    city: { id: CITY_ID, name: 'New Haven' },
  };
  const upserts: Array<Record<string, unknown>> = [];
  const reports: Array<Record<string, unknown>> = [];

  const tx = {
    unitTrainingOrder: {
      findUnique: jest.fn().mockResolvedValue(order),
      updateMany: jest.fn().mockImplementation(() => {
        if (order.status !== 'active') {
          return Promise.resolve({ count: 0 });
        }
        order.status = 'completed';
        return Promise.resolve({ count: 1 });
      }),
    },
    cityUnit: {
      upsert: jest.fn().mockImplementation((args) => {
        upserts.push(args);
        return Promise.resolve({});
      }),
    },
    report: {
      create: jest.fn().mockImplementation(({ data }) => {
        reports.push(data);
        return Promise.resolve(data);
      }),
    },
  };

  const prisma = {
    $transaction: jest.fn().mockImplementation((callback: (tx: unknown) => unknown) => callback(tx)),
  };

  return { prisma, upserts, reports };
}

describe('BarracksService', () => {
  async function createService(prisma: unknown): Promise<BarracksService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        BarracksService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: DevelopmentStateService,
          useValue: { ensureDevelopmentState: jest.fn().mockResolvedValue(BOOTSTRAP) },
        },
        { provide: ResourcesService, useValue: { recalculateResources: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('redis://localhost:6379') } },
      ],
    }).compile();

    return moduleRef.get(BarracksService);
  }

  it('starts a training order and deducts resources', async () => {
    const { prisma, createdOrders, resourceUpdates, transactions } = buildFakePrisma();
    const service = await createService(prisma);

    const result = await service.trainUnits(CITY_ID, { unitType: 'spearman', quantity: 5 });

    expect(resourceUpdates[0]).toEqual({
      wood: 500 - 200,
      gold: 300 - 100,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    });
    expect(createdOrders).toHaveLength(1);
    expect(createdOrders[0]).toMatchObject({ unitType: 'spearman', quantity: 5, status: 'active' });
    expect(transactions.map((transaction) => transaction.transactionType)).toEqual([
      'unit_training_cost',
      'unit_training_cost',
    ]);
    expect(result.activeTraining.unitName).toBe('Spearman');
    expect(result.activeTraining.quantity).toBe(5);
    expect(result.resources.wood).toBe(300);
    expect(result.resources.gold).toBe(200);
  });

  it('applies Workshop discounts to training cost and duration', async () => {
    const { prisma, createdOrders, resourceUpdates } = buildFakePrisma({ workshopLevel: 10 });
    const service = await createService(prisma);

    await service.trainUnits(CITY_ID, { unitType: 'spearman', quantity: 5 });

    expect(resourceUpdates[0]).toEqual({
      wood: 500 - 180,
      gold: 300 - 90,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    });
    expect(
      (createdOrders[0].finishesAt as Date).getTime() - (createdOrders[0].startedAt as Date).getTime(),
    ).toBe(135_000);
  });

  it('allows larger training orders after upgrading the barracks', async () => {
    const { prisma, createdOrders } = buildFakePrisma({ barracksLevel: 2, wood: 2_000, gold: 1_000 });
    const service = await createService(prisma);

    await service.trainUnits(CITY_ID, { unitType: 'spearman', quantity: 30 });

    expect(createdOrders[0]).toMatchObject({ unitType: 'spearman', quantity: 30, status: 'active' });
  });

  it('rejects training when the barracks is not built', async () => {
    const { prisma } = buildFakePrisma({ barracksLevel: 0 });
    const service = await createService(prisma);

    await expect(service.trainUnits(CITY_ID, { unitType: 'spearman', quantity: 1 })).rejects.toThrow(
      ApiErrorException,
    );
  });

  it('rejects training when another order is already active', async () => {
    const { prisma } = buildFakePrisma({ activeOrder: { id: 'other-order', status: 'active' } });
    const service = await createService(prisma);

    await expect(service.trainUnits(CITY_ID, { unitType: 'archer', quantity: 1 })).rejects.toThrow(
      ApiErrorException,
    );
  });

  it('rejects training when resources are insufficient', async () => {
    const { prisma } = buildFakePrisma({ wood: 39, gold: 500 });
    const service = await createService(prisma);

    await expect(service.trainUnits(CITY_ID, { unitType: 'spearman', quantity: 1 })).rejects.toThrow(
      ApiErrorException,
    );
  });

  it('completes a due training order, adds units, and creates a report once', async () => {
    const { prisma, upserts, reports } = buildCompletionPrisma();
    const service = await createService(prisma);

    await expect(service.completeTrainingOrder('order-1')).resolves.toBe(true);
    expect(upserts).toHaveLength(1);
    expect(upserts[0]).toMatchObject({
      where: { cityId_unitType: { cityId: CITY_ID, unitType: 'spearman' } },
      update: { quantity: { increment: 5 } },
      create: { cityId: CITY_ID, unitType: 'spearman', quantity: 5 },
    });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      type: 'units_trained',
      message: '5 Spearmen finished training in New Haven.',
    });

    await expect(service.completeTrainingOrder('order-1')).resolves.toBe(false);
    expect(reports).toHaveLength(1);
  });
});
