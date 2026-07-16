import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { PveService } from './pve.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    close: jest.fn(),
  })),
}));

const WORLD_ID = 'world-1';
const PLAYER_ID = 'player-1';
const CITY_ID = 'city-1';
const CAMP_ID = 'camp-1';
const MOVEMENT_ID = 'movement-1';
const EMPTY_LAND_UNITS = {
  militia: 0,
  spearman: 0,
  archer: 0,
  swordsman: 0,
  cavalry: 0,
  catapult: 0,
};

const BOOTSTRAP = {
  player: { id: PLAYER_ID, name: 'Founder', score: 0 },
  world: { id: WORLD_ID, name: 'First World', status: 'development' },
  selectedCityId: CITY_ID,
  onboarding: { hasCompletedTutorial: false, currentQuestId: null },
};

const ORIGIN_CITY = {
  id: CITY_ID,
  worldId: WORLD_ID,
  playerId: PLAYER_ID,
  name: 'New Haven',
  island: { id: 'island-1', x: 500, y: 340 },
  world: { id: WORLD_ID, speedTravel: 1 },
};

function buildAttackPrisma(options?: { spearmen?: number }) {
  const camp = {
    id: CAMP_ID,
    worldId: WORLD_ID,
    islandId: 'island-camp',
    name: 'Fisher Crown Barbarian Camp',
    level: 1,
    enemyStrength: 40,
    slotIndex: 11,
    island: { id: 'island-camp', name: 'Fisher Crown', x: 388, y: 438 },
  };
  const unitUpdates: Array<Record<string, unknown>> = [];
  const createdMovements: Array<Record<string, unknown>> = [];

  const tx = {
    pveCamp: {
      findUnique: jest.fn().mockResolvedValue(camp),
    },
    city: {
      findUnique: jest.fn().mockResolvedValue(ORIGIN_CITY),
    },
    cityUnit: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ unitType: 'spearman', quantity: options?.spearmen ?? 10 }]),
      update: jest.fn().mockImplementation((args) => {
        unitUpdates.push(args);
        return Promise.resolve({});
      }),
    },
    playerPveCampProgress: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    movement: {
      create: jest.fn().mockImplementation(({ data }) => {
        const movement = {
          id: MOVEMENT_ID,
          ...data,
          originCity: { id: CITY_ID, name: 'New Haven' },
          destinationCamp: camp,
        };
        createdMovements.push(movement);
        return Promise.resolve(movement);
      }),
    },
  };

  const prisma = {
    $transaction: jest.fn().mockImplementation((callback: (tx: unknown) => unknown) => callback(tx)),
    movement: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  return { prisma, unitUpdates, createdMovements };
}

function buildArrivalPrisma(options: {
  units: Record<string, number>;
  campLevel: number;
  enemyStrength: number;
}) {
  const movement = {
    id: MOVEMENT_ID,
    worldId: WORLD_ID,
    playerId: PLAYER_ID,
    originCityId: CITY_ID,
    movementType: 'pve_attack',
    status: 'in_transit',
    departureTime: new Date('2026-01-01T00:00:00.000Z'),
    arrivalTime: new Date('2026-01-01T00:01:00.000Z'),
    returnArrivalTime: new Date('2100-01-01T00:02:00.000Z'),
    payload: {
      campId: CAMP_ID,
      campName: 'Fisher Crown Barbarian Camp',
      campLevel: options.campLevel,
      units: options.units,
    },
    originCity: { id: CITY_ID, name: 'New Haven' },
    destinationCamp: {
      id: CAMP_ID,
      islandId: 'island-camp',
      name: 'Fisher Crown Barbarian Camp',
      level: options.campLevel,
      enemyStrength: options.enemyStrength,
      slotIndex: 11,
    },
  };
  const movementUpdates: Array<Record<string, unknown>> = [];
  const reports: Array<Record<string, unknown>> = [];
  const progressUpdates: Array<Record<string, unknown>> = [];

  const tx = {
    movement: {
      findUnique: jest.fn().mockResolvedValue(movement),
      updateMany: jest.fn().mockImplementation(({ data }) => {
        if (movement.status !== 'in_transit') {
          return Promise.resolve({ count: 0 });
        }
        movementUpdates.push(data);
        movement.status = data.status as string;
        return Promise.resolve({ count: 1 });
      }),
    },
    playerPveCampProgress: {
      upsert: jest.fn().mockImplementation((args) => {
        progressUpdates.push(args);
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

  return { prisma, movementUpdates, reports, progressUpdates };
}

function buildReturnPrisma() {
  const movement = {
    id: MOVEMENT_ID,
    worldId: WORLD_ID,
    playerId: PLAYER_ID,
    originCityId: CITY_ID,
    movementType: 'pve_return',
    status: 'returning',
    departureTime: new Date('2026-01-01T00:00:00.000Z'),
    arrivalTime: new Date('2026-01-01T00:01:00.000Z'),
    returnArrivalTime: new Date('2026-01-01T00:02:00.000Z'),
    payload: {
      campId: CAMP_ID,
      campName: 'Fisher Crown Barbarian Camp',
      campLevel: 1,
      units: { ...EMPTY_LAND_UNITS, spearman: 9 },
      battle: {
        victory: true,
        playerPower: 50,
        campPower: 40,
        unitsSent: { ...EMPTY_LAND_UNITS, spearman: 10 },
        unitsLost: { ...EMPTY_LAND_UNITS, spearman: 1 },
        unitsSurvived: { ...EMPTY_LAND_UNITS, spearman: 9 },
        rewards: { wood: 500, gold: 250, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
      },
    },
    originCity: { id: CITY_ID, name: 'New Haven', player: { userId: 'user-1' } },
    destinationCamp: null,
  };
  const resources = {
    cityId: CITY_ID,
    wood: 900,
    gold: 100,
    marble: 0,
    wine: 0,
    crystal: 0,
    sulfur: 0,
    lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const unitUpserts: Array<Record<string, unknown>> = [];
  const resourceUpdates: Array<Record<string, unknown>> = [];
  const transactions: Array<Record<string, unknown>> = [];
  const inventoryTransactions: Array<Record<string, unknown>> = [];
  const inventoryItems: Array<Record<string, unknown>> = [];
  const reports: Array<Record<string, unknown>> = [];

  const tx = {
    movement: {
      findUnique: jest.fn().mockResolvedValue(movement),
      updateMany: jest.fn().mockImplementation(({ data }) => {
        if (movement.status !== 'returning') {
          return Promise.resolve({ count: 0 });
        }
        movement.status = data.status as string;
        return Promise.resolve({ count: 1 });
      }),
    },
    cityUnit: {
      upsert: jest.fn().mockImplementation((args) => {
        unitUpserts.push(args);
        return Promise.resolve({});
      }),
    },
    cityResource: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(resources),
      update: jest.fn().mockImplementation(({ data }) => {
        resourceUpdates.push(data);
        return Promise.resolve({ ...resources, ...data });
      }),
    },
    cityBuilding: {
      findUnique: jest.fn().mockResolvedValue({ level: 1 }),
    },
    resourceTransaction: {
      create: jest.fn().mockImplementation(({ data }) => {
        transactions.push(data);
        return Promise.resolve(data);
      }),
    },
    userInventoryItem: {
      upsert: jest.fn().mockImplementation(({ where, update, create }) => {
        const quantity = update?.quantity?.increment ?? create.quantity;
        const item = {
          id: `inventory-${create?.itemId ?? where.userId_itemId_sourceId.itemId}`,
          itemId: create?.itemId ?? where.userId_itemId_sourceId.itemId,
          quantity,
        };
        inventoryItems.push(item);
        return Promise.resolve(item);
      }),
    },
    inventoryTransaction: {
      create: jest.fn().mockImplementation(({ data }) => {
        inventoryTransactions.push(data);
        return Promise.resolve(data);
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

  return { prisma, unitUpserts, resourceUpdates, transactions, inventoryItems, inventoryTransactions, reports };
}

describe('PveService', () => {
  async function createService(prisma: unknown): Promise<PveService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PveService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: DevelopmentStateService,
          useValue: { ensureDevelopmentState: jest.fn().mockResolvedValue(BOOTSTRAP) },
        },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('redis://localhost:6379') } },
      ],
    }).compile();

    return moduleRef.get(PveService);
  }

  it('starts an attack, deducts units, and creates a pve_attack movement', async () => {
    const { prisma, unitUpdates, createdMovements } = buildAttackPrisma({ spearmen: 10 });
    const service = await createService(prisma);

    const result = await service.attackCamp(CAMP_ID, {
      originCityId: CITY_ID,
      units: { ...EMPTY_LAND_UNITS, spearman: 8 },
    });

    expect(unitUpdates).toHaveLength(1);
    expect(unitUpdates[0]).toMatchObject({
      where: { cityId_unitType: { cityId: CITY_ID, unitType: 'spearman' } },
      data: { quantity: 2 },
    });
    expect(createdMovements[0]).toMatchObject({
      movementType: 'pve_attack',
      status: 'in_transit',
      destinationCampId: CAMP_ID,
      destinationIslandId: 'island-camp',
    });
    expect(result.movement.units).toEqual({ ...EMPTY_LAND_UNITS, spearman: 8 });
    expect(result.movement.camp).toMatchObject({ id: CAMP_ID, level: 1 });
    expect(result.movement.status).toBe('in_transit');
  });

  it('rejects an attack with more units than available', async () => {
    const { prisma } = buildAttackPrisma({ spearmen: 3 });
    const service = await createService(prisma);

    await expect(
      service.attackCamp(CAMP_ID, {
        originCityId: CITY_ID,
        units: { ...EMPTY_LAND_UNITS, spearman: 8 },
      }),
    ).rejects.toThrow(ApiErrorException);
  });

  it('rejects an attack with no units selected', async () => {
    const { prisma } = buildAttackPrisma();
    const service = await createService(prisma);

    await expect(
      service.attackCamp(CAMP_ID, {
        originCityId: CITY_ID,
        units: EMPTY_LAND_UNITS,
      }),
    ).rejects.toThrow(ApiErrorException);
  });

  it('resolves a victory on arrival and sends survivors home', async () => {
    const { prisma, movementUpdates, reports } = buildArrivalPrisma({
      units: { ...EMPTY_LAND_UNITS, spearman: 10 },
      campLevel: 1,
      enemyStrength: 40,
    });
    const service = await createService(prisma);

    await expect(service.completePveArrival(MOVEMENT_ID)).resolves.toBe(true);

    expect(movementUpdates[0]).toMatchObject({
      movementType: 'pve_return',
      status: 'returning',
    });
    const payload = movementUpdates[0].payload as {
      units: Record<string, number>;
      battle: { victory: boolean; playerPower: number; unitsLost: Record<string, number> };
    };
    expect(payload.units).toEqual({ ...EMPTY_LAND_UNITS, spearman: 9 });
    expect(payload.battle.victory).toBe(true);
    expect(payload.battle.playerPower).toBe(50);
    expect(payload.battle.unitsLost).toEqual({ ...EMPTY_LAND_UNITS, spearman: 1 });
    expect(reports[0]).toMatchObject({
      type: 'pve_battle_victory',
      title: 'Victory!',
      message: 'Your army defeated Fisher Crown Barbarian Camp (Level 1). Lost 1 Spearman. Reward: 500 wood, 250 gold.',
    });

    await expect(service.completePveArrival(MOVEMENT_ID)).resolves.toBe(false);
    expect(reports).toHaveLength(1);
  });

  it('completes the movement immediately when the whole army is destroyed', async () => {
    const { prisma, movementUpdates, reports } = buildArrivalPrisma({
      units: { ...EMPTY_LAND_UNITS, spearman: 1 },
      campLevel: 2,
      enemyStrength: 120,
    });
    const service = await createService(prisma);

    await expect(service.completePveArrival(MOVEMENT_ID)).resolves.toBe(true);

    expect(movementUpdates[0]).toMatchObject({
      movementType: 'pve_attack',
      status: 'completed',
    });
    const payload = movementUpdates[0].payload as {
      units: Record<string, number>;
      battle: {
        victory: boolean;
        rewards: { wood: number; gold: number; marble: number; wine: number; crystal: number; sulfur: number };
      };
    };
    expect(payload.units).toEqual(EMPTY_LAND_UNITS);
    expect(payload.battle.victory).toBe(false);
    expect(payload.battle.rewards).toEqual({ wood: 0, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 });
    expect(reports[0]).toMatchObject({
      type: 'pve_battle_defeat',
      title: 'Defeat',
      message: 'Your army was destroyed by Fisher Crown Barbarian Camp (Level 2). Lost 1 Spearman.',
    });
  });

  it('returns survivors and adds rewards to inventory', async () => {
    const { prisma, unitUpserts, resourceUpdates, transactions, inventoryItems, inventoryTransactions, reports } =
      buildReturnPrisma();
    const service = await createService(prisma);

    await expect(service.completePveReturn(MOVEMENT_ID)).resolves.toBe(true);

    expect(unitUpserts).toHaveLength(1);
    expect(unitUpserts[0]).toMatchObject({
      where: { cityId_unitType: { cityId: CITY_ID, unitType: 'spearman' } },
      update: { quantity: { increment: 9 } },
    });
    expect(resourceUpdates).toHaveLength(0);
    expect(transactions).toHaveLength(0);
    expect(inventoryItems.map((item) => item.itemId)).toEqual(['resource_loot_wood', 'resource_loot_gold']);
    expect(inventoryTransactions.map((transaction) => transaction.quantity)).toEqual([500, 250]);
    expect(reports[0]).toMatchObject({
      type: 'army_returned',
      message: 'Your army returned to New Haven. It added 500 wood, 250 gold to your inventory.',
    });

    await expect(service.completePveReturn(MOVEMENT_ID)).resolves.toBe(false);
    expect(reports).toHaveLength(1);
  });
});
