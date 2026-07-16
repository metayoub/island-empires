import { Worker } from 'bullmq';
import { PrismaClient, type Prisma } from '@prisma/client';
import { getRedisConnectionOptions } from '../config/env';
import {
  BUILDING_UPGRADE_COMPLETE_JOB,
  PVE_ATTACK_ARRIVE_JOB,
  PVE_RETURN_JOB,
  PVP_ATTACK_ARRIVE_JOB,
  PVP_RETURN_JOB,
  RESOURCE_TRANSPORT_ARRIVE_JOB,
  RESOURCE_TRANSPORT_RETURN_JOB,
  RESEARCH_COMPLETE_JOB,
  SPY_MISSION_ARRIVE_JOB,
  SPY_RETURN_JOB,
  SPY_TRAINING_COMPLETE_JOB,
  UNIT_TRAINING_COMPLETE_JOB,
  type BuildingUpgradeCompleteJobPayload,
  type MovementJobPayload,
  type ResearchCompleteJobPayload,
  type SpyTrainingCompleteJobPayload,
  type UnitTrainingCompleteJobPayload,
} from '../jobs';

const BUILDING_NAMES: Record<string, string> = {
  city_hall: 'City Hall',
  warehouse: 'Warehouse',
  academy: 'Academy',
  barracks: 'Barracks',
  port: 'Port',
};

const TECHNOLOGY_NAMES: Record<string, string> = {
  improved_woodcutting: 'Improved Woodcutting',
  basic_storage: 'Basic Storage',
  basic_architecture: 'Basic Architecture',
  basic_navigation: 'Basic Navigation',
  basic_training: 'Basic Training',
  basic_trade: 'Basic Trade',
};

const RESOURCE_KEYS = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;
const BASE_STORAGE = 1000;
const STORAGE_PER_WAREHOUSE_LEVEL = 2000;
type ResourceKey = (typeof RESOURCE_KEYS)[number];
type TransportPayload = Record<ResourceKey, number>;
type PrismaTransactionClient = Prisma.TransactionClient;

const UNIT_TYPE_KEYS = ['militia', 'spearman', 'archer', 'swordsman', 'cavalry', 'catapult'] as const;
type UnitTypeKey = (typeof UNIT_TYPE_KEYS)[number];
type ArmyUnits = Record<UnitTypeKey, number>;

const UNIT_NAMES: Record<string, string> = {
  militia: 'Militia',
  spearman: 'Spearman',
  archer: 'Archer',
  swordsman: 'Swordsman',
  cavalry: 'Cavalry',
  catapult: 'Catapult',
};

const UNIT_PLURAL_NAMES: Record<string, string> = {
  militia: 'Militia',
  spearman: 'Spearmen',
  archer: 'Archers',
  swordsman: 'Swordsmen',
  cavalry: 'Cavalry',
  catapult: 'Catapults',
};

const UNIT_ATTACK: Record<UnitTypeKey, number> = {
  militia: 3,
  spearman: 5,
  archer: 9,
  swordsman: 12,
  cavalry: 18,
  catapult: 32,
};
const UNIT_DEFENSE: Record<UnitTypeKey, number> = {
  militia: 4,
  spearman: 8,
  archer: 4,
  swordsman: 8,
  cavalry: 10,
  catapult: 6,
};
const UNIT_CARRY: Record<UnitTypeKey, number> = {
  militia: 6,
  spearman: 10,
  archer: 8,
  swordsman: 12,
  cavalry: 20,
  catapult: 5,
};

const PVE_ATTACK_MOVEMENT_TYPE = 'pve_attack';
const PVE_RETURN_MOVEMENT_TYPE = 'pve_return';
const PVP_ATTACK_MOVEMENT_TYPE = 'pvp_attack';
const PVP_RETURN_MOVEMENT_TYPE = 'pvp_return';
const SPY_MISSION_MOVEMENT_TYPE = 'spy_mission';
const SPY_RETURN_MOVEMENT_TYPE = 'spy_return';
type ResourceBalancePayload = Record<ResourceKey, number>;
const EMPTY_RESOURCE_BALANCE: ResourceBalancePayload = {
  wood: 0,
  gold: 0,
  marble: 0,
  wine: 0,
  crystal: 0,
  sulfur: 0,
};
const PVP_WALL_DEFENSE_PER_LEVEL = 50;
const PVP_WAREHOUSE_PROTECTED_AMOUNT_PER_LEVEL = 200;
const PVP_LOOT_PERCENT_PER_RESOURCE = 0.2;
const PVP_MAX_LOOT_PER_RESOURCE = 500;
const MAX_PVE_VILLAGE_LEVEL = 50;
const RESOURCE_LOOT_ITEM_IDS: Record<ResourceKey, string> = {
  wood: 'resource_loot_wood',
  gold: 'resource_loot_gold',
  marble: 'resource_loot_marble',
  wine: 'resource_loot_wine',
  crystal: 'resource_loot_crystal',
  sulfur: 'resource_loot_sulfur',
};

const PVE_CAMP_LEVELS: Record<
  number,
  {
    enemyStrength: number;
    victoryLossPercent: number;
    defeatLossPercent: number;
    rewards: ResourceBalancePayload;
  }
> = {
  1: {
    enemyStrength: 40,
    victoryLossPercent: 0.1,
    defeatLossPercent: 0.5,
    rewards: { wood: 500, gold: 250, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
  },
  2: {
    enemyStrength: 120,
    victoryLossPercent: 0.2,
    defeatLossPercent: 0.6,
    rewards: { wood: 900, gold: 500, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
  },
  3: {
    enemyStrength: 260,
    victoryLossPercent: 0.3,
    defeatLossPercent: 0.7,
    rewards: { wood: 1500, gold: 900, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
  },
};

function getPveCampLevelConfig(level: number): {
  enemyStrength: number;
  victoryLossPercent: number;
  defeatLossPercent: number;
  rewards: ResourceBalancePayload;
} {
  const normalizedLevel = Math.max(1, Math.min(MAX_PVE_VILLAGE_LEVEL, Math.floor(level)));
  const configured = PVE_CAMP_LEVELS[normalizedLevel];
  if (configured) return configured;

  return {
    enemyStrength: 260 + (normalizedLevel - 3) * 115,
    victoryLossPercent: Math.min(0.45, 0.3 + (normalizedLevel - 3) * 0.003),
    defeatLossPercent: Math.min(0.85, 0.7 + (normalizedLevel - 3) * 0.002),
    rewards: {
      wood: Math.floor(1500 + (normalizedLevel - 3) * 1071.5),
      gold: Math.floor(900 + (normalizedLevel - 3) * 514.3),
      marble: Math.max(0, Math.floor((normalizedLevel - 3) * 357.2)),
      sulfur: Math.max(0, Math.floor((normalizedLevel - 7) * 166.7)),
      crystal: Math.max(0, Math.floor((normalizedLevel - 14) * 220)),
      wine: Math.max(0, Math.floor((normalizedLevel - 19) * 260)),
    },
  };
}

function normalizeArmyUnits(units: unknown): ArmyUnits {
  const parsed = (units ?? {}) as Partial<Record<UnitTypeKey, number>>;

  return Object.fromEntries(
    UNIT_TYPE_KEYS.map((unitType) => [
      unitType,
      Math.max(0, Math.floor(Number(parsed[unitType] ?? 0))),
    ]),
  ) as ArmyUnits;
}

function getPveMovementPayload(payload: unknown): {
  campId?: string;
  campName?: string;
  campLevel?: number;
  units: ArmyUnits;
  battle?: {
    victory: boolean;
    rewards: ResourceBalancePayload;
  } & Record<string, unknown>;
} & Record<string, unknown> {
  const parsed = (payload ?? {}) as Record<string, unknown>;

  return {
    ...parsed,
    units: normalizeArmyUnits(parsed.units),
  } as ReturnType<typeof getPveMovementPayload>;
}

function normalizeResources(resources: unknown): ResourceBalancePayload {
  const parsed = (resources ?? {}) as Partial<Record<ResourceKey, number>>;

  return Object.fromEntries(
    RESOURCE_KEYS.map((resourceType) => [
      resourceType,
      Math.max(0, Math.floor(Number(parsed[resourceType] ?? 0))),
    ]),
  ) as ResourceBalancePayload;
}

function formatUnitCounts(units: Partial<ArmyUnits>): string {
  const text = UNIT_TYPE_KEYS.filter((unitType) => (units[unitType] ?? 0) > 0)
    .map((unitType) => `${units[unitType]} ${UNIT_NAMES[unitType]}`)
    .join(', ');
  return text || 'none';
}

function formatResourceCounts(resources: Partial<Record<ResourceKey, number>>): string {
  const text = RESOURCE_KEYS.filter((resourceType) => (resources[resourceType] ?? 0) > 0)
    .map((resourceType) => `${Math.floor(resources[resourceType] ?? 0)} ${resourceType}`)
    .join(', ');
  return text || 'no resources';
}

async function grantResourceLoot(
  tx: PrismaTransactionClient,
  input: {
    userId: string;
    playerId: string;
    cityId: string;
    sourceType: 'pve' | 'pvp';
    sourceId: string;
    transactionSourceId: string;
    rewards: Partial<Record<ResourceKey, number>>;
  },
): Promise<void> {
  for (const resourceType of RESOURCE_KEYS) {
    const quantity = Math.max(0, Math.floor(input.rewards[resourceType] ?? 0));
    if (quantity <= 0) continue;
    const itemId = RESOURCE_LOOT_ITEM_IDS[resourceType];
    const item = await (tx as any).userInventoryItem.upsert({
      where: { userId_itemId_sourceId: { userId: input.userId, itemId, sourceId: input.sourceId } },
      update: {
        quantity: { increment: quantity },
        status: 'available',
        metadata: { lastMovementId: input.transactionSourceId, resourceType },
      },
      create: {
        userId: input.userId,
        playerId: input.playerId,
        itemId,
        quantity,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        metadata: { movementId: input.transactionSourceId, resourceType },
      },
    });
    await (tx as any).inventoryTransaction.create({
      data: {
        userId: input.userId,
        playerId: input.playerId,
        itemId,
        transactionType: 'grant',
        quantity,
        balanceAfter: item.quantity,
        sourceType: input.sourceType,
        sourceId: input.transactionSourceId,
        targetType: 'city',
        targetId: input.cityId,
        metadata: { resourceType, movementId: input.transactionSourceId },
      },
    });
  }
}

function getPvpMovementPayload(payload: unknown): {
  targetPlayerId?: string;
  targetPlayerName?: string;
  targetCityId?: string;
  targetCityName?: string;
  units: ArmyUnits;
  loot: ResourceBalancePayload;
  battle?: Record<string, unknown>;
} & Record<string, unknown> {
  const parsed = (payload ?? {}) as Record<string, unknown>;

  return {
    ...parsed,
    units: normalizeArmyUnits(parsed.units),
    loot: normalizeResources(parsed.loot),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function calculatePvpLosses(units: ArmyUnits, lossRate: number): ArmyUnits {
  const losses = Object.fromEntries(
    UNIT_TYPE_KEYS.map((unitType) => [
      unitType,
      Math.min(units[unitType], Math.floor(units[unitType] * clamp(lossRate, 0, 1))),
    ]),
  ) as ArmyUnits;
  const totalUnits = UNIT_TYPE_KEYS.reduce((sum, unitType) => sum + units[unitType], 0);
  const totalLosses = UNIT_TYPE_KEYS.reduce((sum, unitType) => sum + losses[unitType], 0);

  if (totalUnits > 0 && lossRate > 0 && totalLosses === 0) {
    const largestUnitType = UNIT_TYPE_KEYS.reduce((largest, unitType) =>
      units[unitType] > units[largest] ? unitType : largest,
    );
    losses[largestUnitType] = 1;
  }

  return losses;
}

function normalizeTransportPayload(payload: unknown): TransportPayload {
  const parsed = payload as { resources?: Partial<TransportPayload> } | null;

  return Object.fromEntries(
    RESOURCE_KEYS.map((resourceType) => [
      resourceType,
      Math.max(0, Math.floor(Number(parsed?.resources?.[resourceType] ?? 0))),
    ]),
  ) as TransportPayload;
}

export async function completeBuildingUpgrade(
  prisma: PrismaClient,
  buildingId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const building = await tx.cityBuilding.findUnique({
      where: { id: buildingId },
      include: { city: true },
    });

    if (!building || building.status !== 'upgrading') {
      return false;
    }

    if (!building.upgradeFinishesAt || building.upgradeFinishesAt > new Date()) {
      return false;
    }

    const updateResult = await tx.cityBuilding.updateMany({
      where: { id: building.id, status: 'upgrading' },
      data: {
        level: { increment: 1 },
        status: 'idle',
        upgradeStartedAt: null,
        upgradeFinishesAt: null,
      },
    });

    if (updateResult.count === 0) {
      return false;
    }

    const updatedBuilding = await tx.cityBuilding.findUniqueOrThrow({
      where: { id: building.id },
    });
    const buildingName = BUILDING_NAMES[building.buildingType] ?? building.buildingType;

    await tx.report.create({
      data: {
        worldId: building.city.worldId,
        playerId: building.city.playerId,
        cityId: building.cityId,
        type: 'building_completed',
        title: 'Construction completed',
        message: `${buildingName} has reached level ${updatedBuilding.level}.`,
        payload: {
          buildingId: building.id,
          buildingType: building.buildingType,
          level: updatedBuilding.level,
        },
      },
    });
    await tx.gameAnalyticsEvent.create({
      data: {
        worldId: building.city.worldId,
        playerId: building.city.playerId,
        eventType: 'building_upgrade_completed',
        payload: {
          buildingId: building.id,
          buildingType: building.buildingType,
          cityId: building.cityId,
          level: updatedBuilding.level,
        },
      },
    });

    return true;
  });
}

export async function scanDueBuildingUpgrades(prisma: PrismaClient): Promise<number> {
  const dueBuildings = await prisma.cityBuilding.findMany({
    where: {
      status: 'upgrading',
      upgradeFinishesAt: { lte: new Date() },
    },
    select: { id: true },
  });

  let completed = 0;
  for (const building of dueBuildings) {
    if (await completeBuildingUpgrade(prisma, building.id)) {
      completed += 1;
    }
  }

  return completed;
}

export async function completeResearchJob(
  prisma: PrismaClient,
  researchJobId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const job = await tx.researchJob.findUnique({ where: { id: researchJobId } });

    if (!job || job.status !== 'active') {
      return false;
    }

    if (job.finishesAt > new Date()) {
      return false;
    }

    const updateResult = await tx.researchJob.updateMany({
      where: { id: job.id, status: 'active' },
      data: { status: 'completed', completedAt: new Date() },
    });

    if (updateResult.count === 0) {
      return false;
    }

    await tx.playerTechnology.upsert({
      where: {
        playerId_technologyId: { playerId: job.playerId, technologyId: job.technologyId },
      },
      update: {},
      create: {
        playerId: job.playerId,
        worldId: job.worldId,
        technologyId: job.technologyId,
        status: 'completed',
      },
    });

    const technologyName = TECHNOLOGY_NAMES[job.technologyId] ?? job.technologyId;

    await tx.report.create({
      data: {
        worldId: job.worldId,
        playerId: job.playerId,
        type: 'research_completed',
        title: 'Research completed',
        message: `${technologyName} has been researched.`,
        payload: {
          technologyId: job.technologyId,
          researchJobId: job.id,
        },
      },
    });
    await tx.gameAnalyticsEvent.create({
      data: {
        worldId: job.worldId,
        playerId: job.playerId,
        eventType: 'research_completed',
        payload: {
          technologyId: job.technologyId,
          researchJobId: job.id,
        },
      },
    });

    return true;
  });
}

export async function scanDueResearchJobs(prisma: PrismaClient): Promise<number> {
  const dueJobs = await prisma.researchJob.findMany({
    where: {
      status: 'active',
      finishesAt: { lte: new Date() },
    },
    select: { id: true },
  });

  let completed = 0;
  for (const job of dueJobs) {
    if (await completeResearchJob(prisma, job.id)) {
      completed += 1;
    }
  }

  return completed;
}

export async function completeResourceTransportArrival(
  prisma: PrismaClient,
  movementId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const movement = await tx.movement.findUnique({
      where: { id: movementId },
      include: { originCity: true, destinationCity: true },
    });

    if (
      !movement ||
      movement.movementType !== 'resource_transport' ||
      movement.status !== 'in_transit' ||
      movement.arrivalTime > new Date() ||
      !movement.destinationCityId ||
      !movement.destinationCity
    ) {
      return false;
    }

    const resources = normalizeTransportPayload(movement.payload);
    const destinationResources = await tx.cityResource.findUniqueOrThrow({
      where: { cityId: movement.destinationCityId },
    });
    const warehouse = await tx.cityBuilding.findUnique({
      where: {
        cityId_buildingType: {
          cityId: movement.destinationCityId,
          buildingType: 'warehouse',
        },
      },
    });
    const storageCapacity = BASE_STORAGE + (warehouse?.level ?? 0) * STORAGE_PER_WAREHOUSE_LEVEL;
    const delivered = {} as TransportPayload;
    const lost = {} as TransportPayload;

    for (const resourceType of RESOURCE_KEYS) {
      const availableSpace = Math.max(0, storageCapacity - destinationResources[resourceType]);
      delivered[resourceType] = Math.min(resources[resourceType], availableSpace);
      lost[resourceType] = resources[resourceType] - delivered[resourceType];
    }

    const updateResult = await tx.movement.updateMany({
      where: { id: movement.id, status: 'in_transit' },
      data: { status: 'returning' },
    });

    if (updateResult.count === 0) {
      return false;
    }

    const updatedDestination = await tx.cityResource.update({
      where: { cityId: movement.destinationCityId },
      data: Object.fromEntries(
        RESOURCE_KEYS.map((resourceType) => [
          resourceType,
          destinationResources[resourceType] + delivered[resourceType],
        ]),
      ),
    });

    await Promise.all(
      RESOURCE_KEYS.filter((resourceType) => delivered[resourceType] > 0).map((resourceType) =>
        tx.resourceTransaction.create({
          data: {
            worldId: movement.worldId,
            cityId: movement.destinationCityId as string,
            playerId: movement.playerId,
            transactionType: 'transport_received',
            resourceType,
            amount: delivered[resourceType],
            balanceAfter: updatedDestination[resourceType],
            referenceType: 'movement',
            referenceId: movement.id,
          },
        }),
      ),
    );

    await tx.report.create({
      data: {
        worldId: movement.worldId,
        playerId: movement.playerId,
        cityId: movement.destinationCityId,
        type: 'transport_arrived',
        title: 'Transport arrived',
        message: `Resources from ${movement.originCity.name} arrived in ${movement.destinationCity.name}.`,
        payload: {
          movementId: movement.id,
          resourcesDelivered: delivered,
          resourcesLost: lost,
        },
      },
    });

    return true;
  });
}

export async function completeResourceTransportReturn(
  prisma: PrismaClient,
  movementId: string,
): Promise<boolean> {
  const updateResult = await prisma.movement.updateMany({
    where: {
      id: movementId,
      movementType: 'resource_transport',
      status: 'returning',
      returnArrivalTime: { lte: new Date() },
    },
    data: { status: 'completed', completedAt: new Date() },
  });

  return updateResult.count > 0;
}

export async function scanDueResourceTransports(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const dueArrivals = await prisma.movement.findMany({
    where: {
      movementType: 'resource_transport',
      status: 'in_transit',
      arrivalTime: { lte: now },
    },
    select: { id: true },
  });
  const dueReturns = await prisma.movement.findMany({
    where: {
      movementType: 'resource_transport',
      status: 'returning',
      returnArrivalTime: { lte: now },
    },
    select: { id: true },
  });

  let completed = 0;
  for (const movement of dueArrivals) {
    if (await completeResourceTransportArrival(prisma, movement.id)) {
      completed += 1;
    }
  }
  for (const movement of dueReturns) {
    if (await completeResourceTransportReturn(prisma, movement.id)) {
      completed += 1;
    }
  }

  return completed;
}

export async function completeUnitTrainingOrder(
  prisma: PrismaClient,
  trainingOrderId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const order = await tx.unitTrainingOrder.findUnique({
      where: { id: trainingOrderId },
      include: { city: true },
    });

    if (!order || order.status !== 'active' || order.finishesAt > new Date()) {
      return false;
    }

    const updateResult = await tx.unitTrainingOrder.updateMany({
      where: { id: order.id, status: 'active' },
      data: { status: 'completed', completedAt: new Date() },
    });

    if (updateResult.count === 0) {
      return false;
    }

    await tx.cityUnit.upsert({
      where: { cityId_unitType: { cityId: order.cityId, unitType: order.unitType } },
      update: { quantity: { increment: order.quantity } },
      create: { cityId: order.cityId, unitType: order.unitType, quantity: order.quantity },
    });

    const unitLabel =
      order.quantity === 1
        ? UNIT_NAMES[order.unitType] ?? order.unitType
        : UNIT_PLURAL_NAMES[order.unitType] ?? order.unitType;

    await tx.report.create({
      data: {
        worldId: order.worldId,
        playerId: order.playerId,
        cityId: order.cityId,
        type: 'units_trained',
        title: 'Training completed',
        message: `${order.quantity} ${unitLabel} finished training in ${order.city.name}.`,
        payload: {
          trainingOrderId: order.id,
          unitType: order.unitType,
          quantity: order.quantity,
        },
      },
    });
    await tx.gameAnalyticsEvent.create({
      data: {
        worldId: order.worldId,
        playerId: order.playerId,
        eventType: 'unit_training_completed',
        payload: {
          cityId: order.cityId,
          trainingOrderId: order.id,
          unitType: order.unitType,
          quantity: order.quantity,
        },
      },
    });

    return true;
  });
}

export async function scanDueUnitTrainingOrders(prisma: PrismaClient): Promise<number> {
  const dueOrders = await prisma.unitTrainingOrder.findMany({
    where: {
      status: 'active',
      finishesAt: { lte: new Date() },
    },
    select: { id: true },
  });

  let completed = 0;
  for (const order of dueOrders) {
    if (await completeUnitTrainingOrder(prisma, order.id)) {
      completed += 1;
    }
  }

  return completed;
}

export async function completePveAttackArrival(
  prisma: PrismaClient,
  movementId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const movement = await tx.movement.findUnique({
      where: { id: movementId },
      include: { originCity: true, destinationCamp: true },
    });

    if (
      !movement ||
      movement.movementType !== PVE_ATTACK_MOVEMENT_TYPE ||
      movement.status !== 'in_transit' ||
      movement.arrivalTime > new Date() ||
      !movement.destinationCamp
    ) {
      return false;
    }

    const camp = movement.destinationCamp;
    const payload = getPveMovementPayload(movement.payload);
    const campLevel = Math.max(1, Math.floor(Number(payload.campLevel ?? camp.level)));
    const levelConfig = getPveCampLevelConfig(campLevel);
    const unitsSent = payload.units;
    const playerPower = UNIT_TYPE_KEYS.reduce(
      (sum, unitType) => sum + unitsSent[unitType] * UNIT_ATTACK[unitType],
      0,
    );
    const campPower = Math.max(1, Math.floor(Number((payload as any).campPower ?? levelConfig.enemyStrength)));
    const victory = playerPower >= campPower;
    const lossPercent = victory ? levelConfig.victoryLossPercent : levelConfig.defeatLossPercent;
    const unitsLost = Object.fromEntries(
      UNIT_TYPE_KEYS.map((unitType) => [
        unitType,
        Math.min(unitsSent[unitType], Math.round(unitsSent[unitType] * lossPercent)),
      ]),
    ) as ArmyUnits;
    const unitsSurvived = Object.fromEntries(
      UNIT_TYPE_KEYS.map((unitType) => [unitType, unitsSent[unitType] - unitsLost[unitType]]),
    ) as ArmyUnits;
    const hasSurvivors = UNIT_TYPE_KEYS.some((unitType) => unitsSurvived[unitType] > 0);
    const battle = {
      victory,
      playerPower,
      campPower,
      unitsSent,
      unitsLost,
      unitsSurvived,
      rewards: victory ? levelConfig.rewards : EMPTY_RESOURCE_BALANCE,
    };

    const updateResult = await tx.movement.updateMany({
      where: { id: movement.id, status: 'in_transit' },
      data: {
        movementType: hasSurvivors ? PVE_RETURN_MOVEMENT_TYPE : movement.movementType,
        status: hasSurvivors ? 'returning' : 'completed',
        completedAt: hasSurvivors ? null : new Date(),
        payload: {
          ...payload,
          units: unitsSurvived,
          battle,
        },
      },
    });

    if (updateResult.count === 0) {
      return false;
    }

    if (victory) {
      await tx.playerPveCampProgress.upsert({
        where: { playerId_pveCampId: { playerId: movement.playerId, pveCampId: camp.id } },
        update: {
          victoryCount: { increment: 1 },
          lastVictoryAt: new Date(),
        },
        create: {
          worldId: movement.worldId,
          playerId: movement.playerId,
          pveCampId: camp.id,
          victoryCount: 1,
          lastVictoryAt: new Date(),
        },
      });
    }

    await tx.report.create({
      data: {
        worldId: movement.worldId,
        playerId: movement.playerId,
        cityId: movement.originCityId,
        type: victory ? 'pve_battle_victory' : 'pve_battle_defeat',
        title: victory ? 'Victory!' : 'Defeat',
        message: victory
          ? `Your army defeated ${camp.name} (Level ${campLevel}). Lost ${formatUnitCounts(unitsLost)}. Reward: ${formatResourceCounts(battle.rewards)}.`
          : hasSurvivors
            ? `Your army was defeated by ${camp.name} (Level ${campLevel}). Lost ${formatUnitCounts(unitsLost)}. The survivors are returning home.`
            : `Your army was destroyed by ${camp.name} (Level ${campLevel}). Lost ${formatUnitCounts(unitsLost)}.`,
        payload: {
          movementId: movement.id,
          campId: camp.id,
          campName: camp.name,
          campLevel,
          battle,
        },
      },
    });
    await tx.gameAnalyticsEvent.create({
      data: {
        worldId: movement.worldId,
        playerId: movement.playerId,
        eventType: 'pve_attack_completed',
        payload: {
          movementId: movement.id,
          campId: camp.id,
          campLevel,
          victory,
          battle,
        },
      },
    });

    return true;
  });
}

export async function completePveReturn(
  prisma: PrismaClient,
  movementId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const movement = await tx.movement.findUnique({
      where: { id: movementId },
      include: { originCity: { include: { player: true } } },
    });

    if (
      !movement ||
      movement.movementType !== PVE_RETURN_MOVEMENT_TYPE ||
      movement.status !== 'returning' ||
      !movement.returnArrivalTime ||
      movement.returnArrivalTime > new Date()
    ) {
      return false;
    }

    const updateResult = await tx.movement.updateMany({
      where: { id: movement.id, status: 'returning' },
      data: { status: 'completed', completedAt: new Date() },
    });

    if (updateResult.count === 0) {
      return false;
    }

    const payload = getPveMovementPayload(movement.payload);
    const survivors = payload.units;

    await Promise.all(
      UNIT_TYPE_KEYS.filter((unitType) => survivors[unitType] > 0).map((unitType) =>
        tx.cityUnit.upsert({
          where: { cityId_unitType: { cityId: movement.originCityId, unitType } },
          update: { quantity: { increment: survivors[unitType] } },
          create: { cityId: movement.originCityId, unitType, quantity: survivors[unitType] },
        }),
      ),
    );

    const rewards = {
      wood: Math.max(0, Math.floor(Number(payload.battle?.rewards?.wood ?? 0))),
      gold: Math.max(0, Math.floor(Number(payload.battle?.rewards?.gold ?? 0))),
      marble: Math.max(0, Math.floor(Number(payload.battle?.rewards?.marble ?? 0))),
      wine: Math.max(0, Math.floor(Number(payload.battle?.rewards?.wine ?? 0))),
      crystal: Math.max(0, Math.floor(Number(payload.battle?.rewards?.crystal ?? 0))),
      sulfur: Math.max(0, Math.floor(Number(payload.battle?.rewards?.sulfur ?? 0))),
    };
    await grantResourceLoot(tx, {
      userId: movement.originCity.player.userId,
      playerId: movement.playerId,
      cityId: movement.originCityId,
      sourceType: 'pve',
      sourceId: 'pve_loot',
      transactionSourceId: movement.id,
      rewards,
    });

    const rewardText =
      Object.values(rewards).some((amount) => amount > 0)
        ? ` It added ${formatResourceCounts(rewards)} to your inventory.`
        : '';

    await tx.report.create({
      data: {
        worldId: movement.worldId,
        playerId: movement.playerId,
        cityId: movement.originCityId,
        type: 'army_returned',
        title: 'Army returned',
        message: `Your army returned to ${movement.originCity.name}.${rewardText}`,
        payload: {
          movementId: movement.id,
          unitsReturned: survivors,
          resourcesDelivered: rewards,
          resourcesAddedToInventory: rewards,
          resourcesLost: EMPTY_RESOURCE_BALANCE,
        },
      },
    });

    return true;
  });
}

export async function completePvpAttackArrival(
  prisma: PrismaClient,
  movementId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const movement = await tx.movement.findUnique({
      where: { id: movementId },
      include: { originCity: true, destinationCity: { include: { player: true } } },
    });

    if (
      !movement ||
      movement.movementType !== PVP_ATTACK_MOVEMENT_TYPE ||
      movement.status !== 'in_transit' ||
      movement.arrivalTime > new Date() ||
      !movement.destinationCity
    ) {
      return false;
    }

    const targetCityId = movement.destinationCity.id;
    const payload = getPvpMovementPayload(movement.payload);
    const [defenderUnitRows, defenderResources, wall, warehouse] = await Promise.all([
      tx.cityUnit.findMany({ where: { cityId: targetCityId } }),
      tx.cityResource.findUniqueOrThrow({ where: { cityId: targetCityId } }),
      tx.cityBuilding.findUnique({
        where: { cityId_buildingType: { cityId: targetCityId, buildingType: 'wall' } },
      }),
      tx.cityBuilding.findUnique({
        where: { cityId_buildingType: { cityId: targetCityId, buildingType: 'warehouse' } },
      }),
    ]);
    const attackerUnits = payload.units;
    const defenderUnits = normalizeArmyUnits(
      Object.fromEntries(defenderUnitRows.map((unit) => [unit.unitType, unit.quantity])),
    );
    const attackerPower = UNIT_TYPE_KEYS.reduce(
      (sum, unitType) => sum + attackerUnits[unitType] * UNIT_ATTACK[unitType],
      0,
    );
    const wallDefenseBonus = (wall?.level ?? 0) * PVP_WALL_DEFENSE_PER_LEVEL;
    const defenderPower =
      UNIT_TYPE_KEYS.reduce((sum, unitType) => sum + defenderUnits[unitType] * UNIT_DEFENSE[unitType], 0) +
      wallDefenseBonus;
    const attackerVictory = attackerPower > defenderPower;
    const safeAttackerPower = Math.max(1, attackerPower);
    const safeDefenderPower = Math.max(1, defenderPower);
    const attackerLossRate = attackerVictory
      ? clamp((defenderPower / safeAttackerPower) * 0.35, 0.05, 0.4)
      : clamp((defenderPower / safeAttackerPower) * 0.6, 0.3, 0.85);
    const defenderLossRate = attackerVictory
      ? clamp((attackerPower / safeDefenderPower) * 0.5, 0.2, 0.75)
      : clamp((attackerPower / safeDefenderPower) * 0.25, 0.03, 0.35);
    const attackerUnitsLost = calculatePvpLosses(attackerUnits, attackerLossRate);
    const defenderUnitsLost = calculatePvpLosses(defenderUnits, defenderLossRate);
    const attackerUnitsSurvived = Object.fromEntries(
      UNIT_TYPE_KEYS.map((unitType) => [
        unitType,
        Math.max(0, attackerUnits[unitType] - attackerUnitsLost[unitType]),
      ]),
    ) as ArmyUnits;
    const defenderUnitsSurvived = Object.fromEntries(
      UNIT_TYPE_KEYS.map((unitType) => [
        unitType,
        Math.max(0, defenderUnits[unitType] - defenderUnitsLost[unitType]),
      ]),
    ) as ArmyUnits;
    const hasSurvivors = UNIT_TYPE_KEYS.some((unitType) => attackerUnitsSurvived[unitType] > 0);
    const protectedAmount = (warehouse?.level ?? 0) * PVP_WAREHOUSE_PROTECTED_AMOUNT_PER_LEVEL;
    const protectedResources = Object.fromEntries(
      RESOURCE_KEYS.map((resourceType) => [
        resourceType,
        Math.min(defenderResources[resourceType], protectedAmount),
      ]),
    ) as ResourceBalancePayload;
    const loot = { ...EMPTY_RESOURCE_BALANCE };
    let remainingCapacity = attackerVictory
      ? UNIT_TYPE_KEYS.reduce((sum, unitType) => sum + attackerUnitsSurvived[unitType] * UNIT_CARRY[unitType], 0)
      : 0;

    for (const resourceType of RESOURCE_KEYS) {
      const unprotected = Math.max(0, defenderResources[resourceType] - protectedResources[resourceType]);
      const candidate = Math.min(
        Math.floor(unprotected * PVP_LOOT_PERCENT_PER_RESOURCE),
        PVP_MAX_LOOT_PER_RESOURCE,
      );
      loot[resourceType] = Math.min(candidate, remainingCapacity);
      remainingCapacity -= loot[resourceType];
      if (remainingCapacity <= 0) break;
    }

    const battle = {
      attackerVictory,
      attackerPower,
      defenderPower,
      wallDefenseBonus,
      attackerUnitsSent: attackerUnits,
      defenderUnitsParticipated: defenderUnits,
      attackerUnitsLost,
      defenderUnitsLost,
      attackerUnitsSurvived,
      defenderUnitsSurvived,
      loot,
      protectedResources,
    };
    const updateResult = await tx.movement.updateMany({
      where: { id: movement.id, status: 'in_transit' },
      data: {
        movementType: hasSurvivors ? PVP_RETURN_MOVEMENT_TYPE : movement.movementType,
        status: hasSurvivors ? 'returning' : 'completed',
        completedAt: hasSurvivors ? null : new Date(),
        payload: { ...payload, units: attackerUnitsSurvived, loot, battle },
      },
    });
    if (updateResult.count === 0) {
      return false;
    }

    await Promise.all(
      UNIT_TYPE_KEYS.filter((unitType) => defenderUnitsLost[unitType] > 0).map((unitType) =>
        tx.cityUnit.update({
          where: { cityId_unitType: { cityId: targetCityId, unitType } },
          data: { quantity: defenderUnitsSurvived[unitType] },
        }),
      ),
    );

    if (attackerVictory) {
      await tx.cityResource.update({
        where: { cityId: targetCityId },
        data: Object.fromEntries(
          RESOURCE_KEYS.map((resourceType) => [
            resourceType,
            Math.max(0, defenderResources[resourceType] - loot[resourceType]),
          ]),
        ),
      });
    }

    await Promise.all([
      tx.report.create({
        data: {
          worldId: movement.worldId,
          playerId: movement.playerId,
          cityId: movement.originCityId,
          type: attackerVictory ? 'pvp_attack_victory' : 'pvp_attack_defeat',
          title: attackerVictory ? 'Attack victory' : 'Attack defeated',
          message: attackerVictory
            ? `Your army defeated ${movement.destinationCity.name}. Lost ${formatUnitCounts(attackerUnitsLost)}. Loot: ${formatResourceCounts(loot)}.`
            : `Your army was defeated at ${movement.destinationCity.name}. Lost ${formatUnitCounts(attackerUnitsLost)}.`,
          payload: { movementId: movement.id, battle },
        },
      }),
      tx.report.create({
        data: {
          worldId: movement.worldId,
          playerId: movement.destinationCity.playerId,
          cityId: targetCityId,
          type: attackerVictory ? 'pvp_defense_defeat' : 'pvp_defense_victory',
          title: attackerVictory ? 'City raided' : 'City defended',
          message: attackerVictory
            ? `${movement.originCity.name} raided ${movement.destinationCity.name}.`
            : `${movement.destinationCity.name} defeated an incoming attack from ${movement.originCity.name}.`,
          payload: { movementId: movement.id, battle },
        },
      }),
      tx.gameAnalyticsEvent.create({
        data: {
          worldId: movement.worldId,
          playerId: movement.playerId,
          eventType: 'pvp_attack_completed',
          payload: {
            movementId: movement.id,
            targetPlayerId: movement.destinationCity.playerId,
            targetCityId,
            attackerVictory,
            battle,
          },
        },
      }),
    ]);

    return true;
  });
}

export async function completePvpReturn(prisma: PrismaClient, movementId: string): Promise<boolean> {
  return prisma.$transaction(async (tx: PrismaTransactionClient) => {
    const movement = await tx.movement.findUnique({
      where: { id: movementId },
      include: { originCity: { include: { player: true } } },
    });

    if (
      !movement ||
      movement.movementType !== PVP_RETURN_MOVEMENT_TYPE ||
      movement.status !== 'returning' ||
      !movement.returnArrivalTime ||
      movement.returnArrivalTime > new Date()
    ) {
      return false;
    }

    const updateResult = await tx.movement.updateMany({
      where: { id: movement.id, status: 'returning' },
      data: { status: 'completed', completedAt: new Date() },
    });
    if (updateResult.count === 0) {
      return false;
    }

    const payload = getPvpMovementPayload(movement.payload);
    await Promise.all(
      UNIT_TYPE_KEYS.filter((unitType) => payload.units[unitType] > 0).map((unitType) =>
        tx.cityUnit.upsert({
          where: { cityId_unitType: { cityId: movement.originCityId, unitType } },
          update: { quantity: { increment: payload.units[unitType] } },
          create: { cityId: movement.originCityId, unitType, quantity: payload.units[unitType] },
        }),
      ),
    );

    await grantResourceLoot(tx, {
      userId: movement.originCity.player.userId,
      playerId: movement.playerId,
      cityId: movement.originCityId,
      sourceType: 'pvp',
      sourceId: 'pvp_loot',
      transactionSourceId: movement.id,
      rewards: payload.loot,
    });

    await tx.report.create({
      data: {
        worldId: movement.worldId,
        playerId: movement.playerId,
        cityId: movement.originCityId,
        type: 'pvp_army_returned',
        title: 'Raid army returned',
        message: `Your army returned to ${movement.originCity.name}. It added ${formatResourceCounts(payload.loot)} to your inventory.`,
        payload: {
          movementId: movement.id,
          unitsReturned: payload.units,
          resourcesDelivered: payload.loot,
          resourcesAddedToInventory: payload.loot,
        },
      },
    });

    return true;
  });
}

export async function scanDuePveMovements(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const dueArrivals = await prisma.movement.findMany({
    where: {
      movementType: PVE_ATTACK_MOVEMENT_TYPE,
      status: 'in_transit',
      arrivalTime: { lte: now },
    },
    select: { id: true },
  });
  const dueReturns = await prisma.movement.findMany({
    where: {
      movementType: PVE_RETURN_MOVEMENT_TYPE,
      status: 'returning',
      returnArrivalTime: { lte: now },
    },
    select: { id: true },
  });

  let completed = 0;
  for (const movement of dueArrivals) {
    if (await completePveAttackArrival(prisma, movement.id)) {
      completed += 1;
    }
  }
  for (const movement of dueReturns) {
    if (await completePveReturn(prisma, movement.id)) {
      completed += 1;
    }
  }

  return completed;
}

export async function scanDuePvpMovements(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const dueArrivals = await prisma.movement.findMany({
    where: {
      movementType: PVP_ATTACK_MOVEMENT_TYPE,
      status: 'in_transit',
      arrivalTime: { lte: now },
    },
    select: { id: true },
  });
  const dueReturns = await prisma.movement.findMany({
    where: {
      movementType: PVP_RETURN_MOVEMENT_TYPE,
      status: 'returning',
      returnArrivalTime: { lte: now },
    },
    select: { id: true },
  });

  let completed = 0;
  for (const movement of dueArrivals) {
    if (await completePvpAttackArrival(prisma, movement.id)) {
      completed += 1;
    }
  }
  for (const movement of dueReturns) {
    if (await completePvpReturn(prisma, movement.id)) {
      completed += 1;
    }
  }

  return completed;
}

export async function completeSpyTrainingJob(
  prisma: PrismaClient,
  spyTrainingJobId: string,
): Promise<boolean> {
  return (prisma as any).$transaction(async (tx: any) => {
    const job = await tx.spyTrainingJob.findUnique({
      where: { id: spyTrainingJobId },
      include: { city: true },
    });

    if (!job || job.status !== 'training' || job.finishesAt > new Date()) {
      return false;
    }

    const updateResult = await tx.spyTrainingJob.updateMany({
      where: { id: job.id, status: 'training' },
      data: { status: 'completed', completedAt: new Date() },
    });

    if (updateResult.count === 0) {
      return false;
    }

    await tx.citySpyState.upsert({
      where: { cityId: job.cityId },
      create: {
        worldId: job.worldId,
        playerId: job.playerId,
        cityId: job.cityId,
        spies: job.quantity,
      },
      update: { spies: { increment: job.quantity } },
    });

    await tx.report.create({
      data: {
        worldId: job.worldId,
        playerId: job.playerId,
        cityId: job.cityId,
        type: 'spies_trained',
        title: 'Spy training completed',
        message: `${job.quantity} ${job.quantity === 1 ? 'spy has' : 'spies have'} finished training in ${job.city.name}.`,
        payload: { spyTrainingJobId: job.id, quantity: job.quantity },
      },
    });

    await tx.gameAnalyticsEvent.create({
      data: {
        worldId: job.worldId,
        playerId: job.playerId,
        eventType: 'spy_training_completed',
        payload: { cityId: job.cityId, spyTrainingJobId: job.id, quantity: job.quantity },
      },
    });

    return true;
  });
}

export async function completeSpyMissionArrival(
  prisma: PrismaClient,
  movementId: string,
): Promise<boolean> {
  return (prisma as any).$transaction(async (tx: any) => {
    const movement = await tx.movement.findUnique({
      where: { id: movementId },
      include: {
        originCity: true,
        destinationCity: { include: { resources: true, buildings: true, units: true } },
      },
    });

    if (
      !movement ||
      movement.movementType !== SPY_MISSION_MOVEMENT_TYPE ||
      movement.status !== 'in_transit' ||
      movement.arrivalTime > new Date() ||
      !movement.destinationCity
    ) {
      return false;
    }

    const mission = await tx.spyMission.findFirst({
      where: { movementId: movement.id, status: 'in_transit' },
    });
    if (!mission) {
      return false;
    }

    const wasSuccessful = Math.random() < mission.successChance;
    const wasDetected = Math.random() < mission.detectionChance;
    const spyLost = wasDetected && Math.random() < 0.5;
    const defenderSpyState = await tx.citySpyState.findUnique({
      where: { cityId: movement.destinationCity.id },
    });
    const report = buildSpyReport({
      missionType: mission.missionType,
      targetCityName: movement.destinationCity.name,
      wasSuccessful,
      wasDetected,
      spyLost,
      resources: movement.destinationCity.resources,
      units: movement.destinationCity.units,
      buildings: movement.destinationCity.buildings,
      defenderSpyCount: defenderSpyState?.spies ?? 0,
    });

    const createdReport = await tx.report.create({
      data: {
        worldId: mission.worldId,
        playerId: mission.attackerPlayerId,
        cityId: mission.originCityId,
        type: 'spy_report',
        title: report.title,
        message: report.message,
        payload: {
          ...report.payload,
          missionId: mission.id,
          targetCityId: mission.targetCityId,
        },
      },
    });

    if (wasDetected) {
      await tx.message.create({
        data: {
          worldId: mission.worldId,
          senderPlayerId: null,
          recipientPlayerId: mission.targetPlayerId,
          messageType: 'system',
          subject: spyLost ? 'Enemy spy captured' : 'Suspicious activity detected',
          body: spyLost
            ? `Your counter-spies captured an enemy spy in ${movement.destinationCity.name}.`
            : `Your counter-spies detected an enemy spy mission in ${movement.destinationCity.name}.`,
        },
      });
    }

    let returnMovement = null;
    if (!spyLost) {
      const travelTimeSeconds = Math.max(60, Number(movement.payload?.travelTimeSeconds ?? 60));
      const returnArrivalTime = new Date(Date.now() + travelTimeSeconds * 1000);
      returnMovement = await tx.movement.create({
        data: {
          worldId: mission.worldId,
          playerId: mission.attackerPlayerId,
          originCityId: mission.originCityId,
          destinationCityId: mission.targetCityId,
          destinationIslandId: movement.destinationIslandId,
          destinationSlotIndex: movement.destinationSlotIndex,
          movementType: SPY_RETURN_MOVEMENT_TYPE,
          status: 'returning',
          departureTime: new Date(),
          arrivalTime: returnArrivalTime,
          returnArrivalTime,
          payload: {
            missionId: mission.id,
            originCityId: mission.originCityId,
            targetCityId: mission.targetCityId,
            spyCount: 1,
            travelTimeSeconds,
          },
        },
      });
    }

    await tx.movement.updateMany({
      where: { id: movement.id, status: 'in_transit' },
      data: { status: 'completed', completedAt: new Date() },
    });
    await tx.spyMission.update({
      where: { id: mission.id },
      data: {
        status: spyLost ? 'completed' : 'returning',
        resolvedAt: new Date(),
        completedAt: spyLost ? new Date() : null,
        wasSuccessful,
        wasDetected,
        spyLost,
        reportMessageId: createdReport.id,
        returnMovementId: returnMovement?.id ?? null,
      },
    });
    await tx.gameAnalyticsEvent.create({
      data: {
        worldId: mission.worldId,
        playerId: mission.attackerPlayerId,
        eventType: 'spy_mission_resolved',
        payload: { missionId: mission.id, wasSuccessful, wasDetected, spyLost },
      },
    });

    return true;
  });
}

export async function completeSpyReturn(
  prisma: PrismaClient,
  movementId: string,
): Promise<boolean> {
  return (prisma as any).$transaction(async (tx: any) => {
    const movement = await tx.movement.findUnique({ where: { id: movementId } });
    if (
      !movement ||
      movement.movementType !== SPY_RETURN_MOVEMENT_TYPE ||
      movement.status !== 'returning' ||
      movement.arrivalTime > new Date()
    ) {
      return false;
    }

    const updateResult = await tx.movement.updateMany({
      where: { id: movement.id, status: 'returning' },
      data: { status: 'completed', completedAt: new Date() },
    });

    if (updateResult.count === 0) {
      return false;
    }

    await tx.citySpyState.upsert({
      where: { cityId: movement.originCityId },
      create: {
        worldId: movement.worldId,
        playerId: movement.playerId,
        cityId: movement.originCityId,
        spies: 1,
      },
      update: { spies: { increment: 1 } },
    });

    const missionId = movement.payload?.missionId;
    if (missionId) {
      await tx.spyMission.updateMany({
        where: { id: missionId, status: 'returning' },
        data: { status: 'completed', completedAt: new Date() },
      });
    }

    return true;
  });
}

export async function scanDueScoutingJobs(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const dueTrainingJobs = await (prisma as any).spyTrainingJob.findMany({
    where: { status: 'training', finishesAt: { lte: now } },
    select: { id: true },
  });
  const dueMissionArrivals = await (prisma as any).movement.findMany({
    where: {
      movementType: SPY_MISSION_MOVEMENT_TYPE,
      status: 'in_transit',
      arrivalTime: { lte: now },
    },
    select: { id: true },
  });
  const dueReturns = await (prisma as any).movement.findMany({
    where: {
      movementType: SPY_RETURN_MOVEMENT_TYPE,
      status: 'returning',
      arrivalTime: { lte: now },
    },
    select: { id: true },
  });

  let completed = 0;
  for (const job of dueTrainingJobs) {
    if (await completeSpyTrainingJob(prisma, job.id)) completed += 1;
  }
  for (const movement of dueMissionArrivals) {
    if (await completeSpyMissionArrival(prisma, movement.id)) completed += 1;
  }
  for (const movement of dueReturns) {
    if (await completeSpyReturn(prisma, movement.id)) completed += 1;
  }

  return completed;
}

function buildSpyReport(input: {
  missionType: string;
  targetCityName: string;
  wasSuccessful: boolean;
  wasDetected: boolean;
  spyLost: boolean;
  resources?: Record<string, number> | null;
  units?: Array<{ unitType: string; quantity: number }>;
  buildings?: Array<{ buildingType: string; level: number }>;
  defenderSpyCount: number;
}) {
  const detection = input.wasDetected
    ? input.spyLost
      ? 'Your spy was detected and captured.'
      : 'Your spy was detected but escaped.'
    : 'Your spy was not detected.';

  if (!input.wasSuccessful) {
    return {
      title: 'Spy Report Failed',
      message: `Target: ${input.targetCityName}\n\nYour spy could not gather reliable information.\nDetection: ${detection}`,
      payload: {
        missionType: input.missionType,
        targetCityName: input.targetCityName,
        result: 'Failed',
        wasDetected: input.wasDetected,
        spyLost: input.spyLost,
      },
    };
  }

  if (input.missionType === 'army_report') {
    const unitLines = (input.units ?? []).map(
      (unit) => `- ${formatName(unit.unitType)}: ${estimateQuantity(unit.quantity)}`,
    );
    const counterSpyPresence =
      input.defenderSpyCount >= 5
        ? 'High'
        : input.defenderSpyCount >= 2
          ? 'Moderate'
          : input.defenderSpyCount > 0
            ? 'Low'
            : 'None';
    return {
      title: 'Spy Report: Army',
      message: [
        `Target: ${input.targetCityName}`,
        '',
        'Estimated army:',
        ...(unitLines.length > 0 ? unitLines : ['- No army presence observed']),
        '',
        `Counter-spy presence: ${counterSpyPresence}`,
        `Detection: ${detection}`,
      ].join('\n'),
      payload: {
        missionType: input.missionType,
        targetCityName: input.targetCityName,
        result: 'Success',
        counterSpyPresence,
        wasDetected: input.wasDetected,
        spyLost: input.spyLost,
      },
    };
  }

  if (input.missionType === 'building_report') {
    const buildingLines = (input.buildings ?? []).map(
      (building) => `- ${formatName(building.buildingType)}: Level ${building.level}`,
    );
    return {
      title: 'Spy Report: Buildings',
      message: [
        `Target: ${input.targetCityName}`,
        '',
        'Visible buildings:',
        ...buildingLines,
        '',
        `Detection: ${detection}`,
      ].join('\n'),
      payload: {
        missionType: input.missionType,
        targetCityName: input.targetCityName,
        result: 'Success',
        wasDetected: input.wasDetected,
        spyLost: input.spyLost,
      },
    };
  }

  const resourceLines = RESOURCE_KEYS.map(
    (resourceType) => `- ${formatName(resourceType)}: ${estimateResource(input.resources?.[resourceType] ?? 0)}`,
  );
  return {
    title: 'Spy Report: Resources',
    message: [
      `Target: ${input.targetCityName}`,
      '',
      'Result: Success',
      '',
      'Estimated resources:',
      ...resourceLines,
      '',
      `Detection: ${detection}`,
    ].join('\n'),
    payload: {
      missionType: input.missionType,
      targetCityName: input.targetCityName,
      result: 'Success',
      wasDetected: input.wasDetected,
      spyLost: input.spyLost,
    },
  };
}

function estimateResource(value: number): string {
  if (value <= 0) return 'None';
  if (value < 100) return 'Low';
  return `~${(Math.round(value / 100) * 100).toLocaleString('en-US')}`;
}

function estimateQuantity(value: number): string {
  const quantity = Math.max(0, Math.floor(value));
  if (quantity <= 0) return 'None';
  if (quantity <= 5) return '1-5';
  const lower = Math.floor(quantity / 10) * 10;
  const upper = Math.max(lower + 10, Math.ceil(quantity / 10) * 10);
  return `${lower}-${upper}`;
}

function formatName(value: string): string {
  return value
    .split('_')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function createDefaultProcessor(prisma: PrismaClient): Worker {
  return new Worker(
    'island-empires-default',
    async (job) => {
      if (job.name === BUILDING_UPGRADE_COMPLETE_JOB) {
        const payload = job.data as BuildingUpgradeCompleteJobPayload;
        const completed = await completeBuildingUpgrade(prisma, payload.buildingId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === RESEARCH_COMPLETE_JOB) {
        const payload = job.data as ResearchCompleteJobPayload;
        const completed = await completeResearchJob(prisma, payload.researchJobId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === RESOURCE_TRANSPORT_ARRIVE_JOB) {
        const payload = job.data as MovementJobPayload;
        const completed = await completeResourceTransportArrival(prisma, payload.movementId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === RESOURCE_TRANSPORT_RETURN_JOB) {
        const payload = job.data as MovementJobPayload;
        const completed = await completeResourceTransportReturn(prisma, payload.movementId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === UNIT_TRAINING_COMPLETE_JOB) {
        const payload = job.data as UnitTrainingCompleteJobPayload;
        const completed = await completeUnitTrainingOrder(prisma, payload.trainingOrderId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === PVE_ATTACK_ARRIVE_JOB) {
        const payload = job.data as MovementJobPayload;
        const completed = await completePveAttackArrival(prisma, payload.movementId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === PVE_RETURN_JOB) {
        const payload = job.data as MovementJobPayload;
        const completed = await completePveReturn(prisma, payload.movementId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === PVP_ATTACK_ARRIVE_JOB) {
        const payload = job.data as MovementJobPayload;
        const completed = await completePvpAttackArrival(prisma, payload.movementId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === PVP_RETURN_JOB) {
        const payload = job.data as MovementJobPayload;
        const completed = await completePvpReturn(prisma, payload.movementId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === SPY_TRAINING_COMPLETE_JOB) {
        const payload = job.data as SpyTrainingCompleteJobPayload;
        const completed = await completeSpyTrainingJob(prisma, payload.spyTrainingJobId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === SPY_MISSION_ARRIVE_JOB) {
        const payload = job.data as MovementJobPayload;
        const completed = await completeSpyMissionArrival(prisma, payload.movementId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      if (job.name === SPY_RETURN_JOB) {
        const payload = job.data as MovementJobPayload;
        const completed = await completeSpyReturn(prisma, payload.movementId);
        return { status: completed ? 'completed' : 'skipped' };
      }

      return { status: 'ignored' };
    },
    {
      connection: getRedisConnectionOptions(),
    },
  );
}
