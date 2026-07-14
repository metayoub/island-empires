import { HttpStatus, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  BUILDING_TYPES,
  EVENT_TYPES,
  MAP_CONFIG,
  PVE_CONFIG,
  STORAGE_CONFIG,
  UNIT_CONFIG,
  getPveCampLevelConfig,
  type PveCampLevelDefinition,
  type UnitType,
} from '@island-empires/config';
import {
  calculateArmySize,
  calculateMapDistance,
  calculateStorageCapacity,
  calculateTransportTravelTimeSeconds,
  calculateTravelTimeSeconds,
  canAttackPveCamp,
  resolvePveBattle,
} from '@island-empires/game-engine';
import type {
  ArmyMovementSummary,
  ArmyUnits,
  AttackPveCampRequest,
  AttackPveCampResponse,
  PveBattleSummary,
  PveCampDetailResponse,
  PveCampListResponse,
  PveCampSummary,
  UnitDefinitionSummary,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { LiveEventsService } from '../live-events/live-events.service';
import { DevelopmentStateService } from '../players/development-state.service';

const QUEUE_NAME = 'island-empires-default';
const PVE_ARRIVE_JOB = 'movement.pve.arrive';
const PVE_RETURN_JOB = 'movement.pve.return';
const UNIT_TYPE_KEYS = (Object.keys(UNIT_CONFIG) as UnitType[]).filter(
  (unitType) => UNIT_CONFIG[unitType].category === 'land',
);
const PVE_MOVEMENT_TYPES = [PVE_CONFIG.attackMovementType, PVE_CONFIG.returnMovementType];

type CampRecord = {
  id: string;
  name: string;
  level: number;
  enemyStrength: number;
  slotIndex?: number;
  island: {
    id: string;
    name: string | null;
    x: number;
    y: number;
  };
};

@Injectable()
export class PveService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly analyticsService: AnalyticsService | undefined,
    @Optional() private readonly liveEventsService: LiveEventsService | undefined,
    private readonly developmentStateService: DevelopmentStateService,
    configService: ConfigService,
  ) {
    const redisUrl = new URL(configService.get<string>('redis.url') ?? 'redis://localhost:6379');
    this.queue = new Queue(QUEUE_NAME, {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
        username: redisUrl.username || undefined,
        password: redisUrl.password || undefined,
        db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1) || 0) : 0,
        maxRetriesPerRequest: null,
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  async ensurePveCampsGenerated(worldId: string): Promise<void> {
    const islands = await this.prisma.island.findMany({
      where: { worldId },
      select: { id: true, x: true, y: true, name: true },
    });
    const levelConfig = this.getCampLevelConfig(1);
    const camps = islands.map((island) => ({
      worldId,
      islandId: island.id,
      name: `${island.name ?? `Island ${island.x}:${island.y}`} Barbarian Village`,
      level: 1,
      enemyStrength: levelConfig.enemyStrength,
      slotIndex: PVE_CONFIG.villageSlotIndex,
    }));

    if (camps.length > 0) {
      await this.prisma.pveCamp.createMany({
        data: camps,
        skipDuplicates: true,
      });
    }
  }

  async getCamps(): Promise<PveCampListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.ensurePveCampsGenerated(bootstrap.world.id);
    await this.completeDuePveMovements();

    const selectedCity = await this.getOwnedCityOrThrow(bootstrap.selectedCityId, bootstrap);
    const camps = await this.prisma.pveCamp.findMany({
      where: { worldId: bootstrap.world.id },
      include: { island: true },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return {
      selectedCity: {
        id: selectedCity.id,
        name: selectedCity.name,
      },
      camps: await Promise.all(
        camps.map((camp) => this.toCampSummary(camp, selectedCity, bootstrap.player.id)),
      ),
    };
  }

  async getCampDetail(campId: string, originCityId?: string): Promise<PveCampDetailResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.ensurePveCampsGenerated(bootstrap.world.id);
    await this.completeDuePveMovements();

    const camp = await this.prisma.pveCamp.findUnique({
      where: { id: campId },
      include: { island: true },
    });
    if (!camp || camp.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Barbarian Village not found.', 'PVE_CAMP_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const originCity = await this.getOwnedCityOrThrow(originCityId ?? bootstrap.selectedCityId, bootstrap);
    const cityUnits = await this.prisma.cityUnit.findMany({ where: { cityId: originCity.id } });
    const army = this.toArmyUnits(cityUnits);
    const attackState = canAttackPveCamp({
      originCityIsOnMap: true,
      hasAtLeastOneUnit: calculateArmySize(army) > 0,
      hasEnoughUnits: true,
    });

    return {
      camp: await this.toCampSummary(camp, originCity, bootstrap.player.id),
      originCity: {
        id: originCity.id,
        name: originCity.name,
      },
      army,
      units: UNIT_TYPE_KEYS.map((unitType) => this.toUnitDefinitionSummary(unitType)),
      attack: {
        canAttack: attackState.canAttack,
        disabledReason: attackState.reason ?? null,
      },
    };
  }

  async attackCamp(campId: string, input: AttackPveCampRequest): Promise<AttackPveCampResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const unitsToSend = this.normalizeArmyUnits(input.units);
    await this.completeDuePveMovements();

    const result = await this.prisma.$transaction(async (tx) => {
      const camp = await tx.pveCamp.findUnique({
        where: { id: campId },
        include: { island: true },
      });
      if (!camp || camp.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Barbarian Village not found.', 'PVE_CAMP_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      const originCity = await tx.city.findUnique({
        where: { id: input.originCityId },
        include: { island: true, world: true },
      });
      if (!originCity || originCity.playerId !== bootstrap.player.id || originCity.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Origin city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      const cityUnits = await tx.cityUnit.findMany({ where: { cityId: originCity.id } });
      const availableArmy = this.toArmyUnits(cityUnits);
      const attackState = canAttackPveCamp({
        originCityIsOnMap: Boolean(originCity.island),
        hasAtLeastOneUnit: calculateArmySize(unitsToSend) > 0,
        hasEnoughUnits: UNIT_TYPE_KEYS.every((unitType) => unitsToSend[unitType] <= availableArmy[unitType]),
      });
      if (!attackState.canAttack || !originCity.island) {
        throw new ApiErrorException(
          attackState.reason ?? 'Attack cannot be started.',
          'PVE_ATTACK_UNAVAILABLE',
          HttpStatus.BAD_REQUEST,
        );
      }

      const distance = calculateMapDistance({
        from: { x: originCity.island.x, y: originCity.island.y },
        to: { x: camp.island.x, y: camp.island.y },
      });
      const normalTravelTimeSeconds = calculateTravelTimeSeconds({
        distance,
        baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
        worldSpeed: originCity.world.speedTravel,
      });
      const travelTimeSeconds = calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds,
        transportTravelMultiplier: PVE_CONFIG.travelTimeMultiplier,
        minTravelTimeSeconds: PVE_CONFIG.minTravelTimeSeconds,
      });
      const returnTravelTimeSeconds = calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds,
        transportTravelMultiplier: PVE_CONFIG.returnTravelTimeMultiplier,
        minTravelTimeSeconds: PVE_CONFIG.minTravelTimeSeconds,
      });
      const effectiveLevel = await this.getPlayerCampLevel(camp.id, bootstrap.player.id, tx);
      const levelConfig = this.getCampLevelConfig(effectiveLevel);
      const departureTime = new Date();
      const arrivalTime = new Date(departureTime.getTime() + travelTimeSeconds * 1000);
      const returnArrivalTime = new Date(arrivalTime.getTime() + returnTravelTimeSeconds * 1000);

      await Promise.all(
        UNIT_TYPE_KEYS.filter((unitType) => unitsToSend[unitType] > 0).map((unitType) =>
          tx.cityUnit.update({
            where: { cityId_unitType: { cityId: originCity.id, unitType } },
            data: { quantity: availableArmy[unitType] - unitsToSend[unitType] },
          }),
        ),
      );

      const movement = await tx.movement.create({
        data: {
          worldId: originCity.worldId,
          playerId: originCity.playerId,
          originCityId: originCity.id,
          destinationCampId: camp.id,
          destinationIslandId: camp.islandId,
          movementType: PVE_CONFIG.attackMovementType,
          status: 'in_transit',
          departureTime,
          arrivalTime,
          returnArrivalTime,
          payload: {
            campId: camp.id,
            campName: camp.name,
            campLevel: effectiveLevel,
            campPower: levelConfig.enemyStrength,
            units: unitsToSend,
            travelTimeSeconds,
            returnTravelTimeSeconds,
          },
        },
        include: { originCity: true, destinationCamp: true },
      });

      return movement;
    });

    await this.enqueuePveArrival(result.id, result.arrivalTime);
    await this.analyticsService?.track({
      worldId: result.worldId,
      playerId: result.playerId,
      eventType: 'pve_attack_started',
      payload: {
        movementId: result.id,
        originCityId: result.originCityId,
        campId,
        units: unitsToSend,
        arrivalTime: result.arrivalTime.toISOString(),
      },
    });

    return { movement: this.toArmyMovementSummary(result) };
  }

  async getArmyMovements(): Promise<ArmyMovementSummary[]> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDuePveMovements();

    const movements = await this.prisma.movement.findMany({
      where: {
        playerId: bootstrap.player.id,
        movementType: { in: PVE_MOVEMENT_TYPES },
      },
      include: { originCity: true, destinationCamp: true },
      orderBy: [{ status: 'asc' }, { arrivalTime: 'desc' }],
      take: 25,
    });

    return movements.map((movement) => this.toArmyMovementSummary(movement));
  }

  async completeDuePveMovements(): Promise<number> {
    const now = new Date();
    const dueArrivals = await this.prisma.movement.findMany({
      where: {
        movementType: PVE_CONFIG.attackMovementType,
        status: 'in_transit',
        arrivalTime: { lte: now },
      },
      select: { id: true },
    });
    const dueReturns = await this.prisma.movement.findMany({
      where: {
        movementType: PVE_CONFIG.returnMovementType,
        status: 'returning',
        returnArrivalTime: { lte: now },
      },
      select: { id: true },
    });

    let completed = 0;
    for (const movement of dueArrivals) {
      if (await this.completePveArrival(movement.id)) {
        completed += 1;
      }
    }
    for (const movement of dueReturns) {
      if (await this.completePveReturn(movement.id)) {
        completed += 1;
      }
    }

    return completed;
  }

  async completePveArrival(movementId: string): Promise<boolean> {
    const result = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.movement.findUnique({
        where: { id: movementId },
        include: { originCity: true, destinationCamp: true },
      });

      if (
        !movement ||
        movement.movementType !== PVE_CONFIG.attackMovementType ||
        movement.status !== 'in_transit' ||
        movement.arrivalTime > new Date() ||
        !movement.destinationCamp
      ) {
        return { completed: false, returning: false };
      }

      const payload = this.getMovementPayload(movement.payload);
      const camp = movement.destinationCamp;
      const campLevel = payload.campLevel ?? 1;
      const levelConfig = this.getCampLevelConfig(campLevel);
      const battle = resolvePveBattle({
        units: payload.units,
        unitStats: UNIT_CONFIG,
        campPower: payload.campPower ?? levelConfig.enemyStrength,
        victoryLossPercent: levelConfig.victoryLossPercent,
        defeatLossPercent: levelConfig.defeatLossPercent,
        rewards: levelConfig.rewards,
      });
      const survivors = this.normalizeArmyUnits(battle.unitsSurvived);
      const hasSurvivors = calculateArmySize(survivors) > 0;

      const updateResult = await tx.movement.updateMany({
        where: { id: movement.id, status: 'in_transit' },
        data: {
          movementType: hasSurvivors ? PVE_CONFIG.returnMovementType : movement.movementType,
          status: hasSurvivors ? 'returning' : 'completed',
          completedAt: hasSurvivors ? null : new Date(),
          payload: {
            ...payload,
            units: survivors,
            battle: this.toBattleSummary(battle),
          },
        },
      });
      if (updateResult.count === 0) {
        return { completed: false, returning: false };
      }

      if (battle.victory) {
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
          type: battle.victory ? 'pve_battle_victory' : 'pve_battle_defeat',
          title: battle.victory ? 'Victory!' : 'Defeat',
          message: battle.victory
            ? `Your army defeated ${camp.name} (Level ${campLevel}).`
            : hasSurvivors
              ? `Your army was defeated by ${camp.name} (Level ${campLevel}). The survivors are returning home.`
              : `Your army was destroyed by ${camp.name} (Level ${campLevel}).`,
          payload: {
            movementId: movement.id,
            campId: camp.id,
            campName: camp.name,
            campLevel,
            battle: this.toBattleSummary(battle),
          },
        },
      });
      await tx.gameAnalyticsEvent?.create({
        data: {
          worldId: movement.worldId,
          playerId: movement.playerId,
          eventType: 'pve_attack_completed',
          payload: {
            movementId: movement.id,
            campId: camp.id,
            campLevel,
            victory: battle.victory,
            battle: this.toBattleSummary(battle),
          },
        },
      });

      return { completed: true, returning: hasSurvivors, returnArrivalTime: movement.returnArrivalTime };
    });

    if (result.completed && result.returning && result.returnArrivalTime) {
      await this.enqueuePveReturn(movementId, result.returnArrivalTime);
    }

    return result.completed;
  }

  async completePveReturn(movementId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.movement.findUnique({
        where: { id: movementId },
        include: { originCity: true, destinationCamp: true },
      });

      if (
        !movement ||
        movement.movementType !== PVE_CONFIG.returnMovementType ||
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

      const payload = this.getMovementPayload(movement.payload);
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

      const baseRewards = payload.battle?.rewards ?? { wood: 0, gold: 0 };
      const rewards =
        payload.battle?.victory && this.liveEventsService
          ? {
              wood: await this.liveEventsService.applyActiveEventBonus({
                worldId: movement.worldId,
                type: EVENT_TYPES.PVE_INVASION,
                amount: baseRewards.wood,
              }),
              gold: await this.liveEventsService.applyActiveEventBonus({
                worldId: movement.worldId,
                type: EVENT_TYPES.PVE_INVASION,
                amount: baseRewards.gold,
              }),
            }
          : baseRewards;
      const originResources = await tx.cityResource.findUniqueOrThrow({
        where: { cityId: movement.originCityId },
      });
      const warehouse = await tx.cityBuilding.findUnique({
        where: {
          cityId_buildingType: {
            cityId: movement.originCityId,
            buildingType: BUILDING_TYPES.WAREHOUSE,
          },
        },
      });
      const storageCapacity = calculateStorageCapacity({
        baseStorage: STORAGE_CONFIG.baseStorage,
        warehouseLevel: warehouse?.level ?? 0,
        storagePerWarehouseLevel: STORAGE_CONFIG.storagePerWarehouseLevel,
      });
      const delivered = { wood: 0, gold: 0 };
      const lost = { wood: 0, gold: 0 };

      for (const resourceType of ['wood', 'gold'] as const) {
        const availableSpace = Math.max(0, storageCapacity - originResources[resourceType]);
        delivered[resourceType] = Math.min(Math.max(0, rewards[resourceType]), availableSpace);
        lost[resourceType] = Math.max(0, rewards[resourceType]) - delivered[resourceType];
      }

      const updatedResources = await tx.cityResource.update({
        where: { cityId: movement.originCityId },
        data: {
          wood: originResources.wood + delivered.wood,
          gold: originResources.gold + delivered.gold,
        },
      });

      await Promise.all(
        (['wood', 'gold'] as const)
          .filter((resourceType) => delivered[resourceType] > 0)
          .map((resourceType) =>
            tx.resourceTransaction.create({
              data: {
                worldId: movement.worldId,
                cityId: movement.originCityId,
                playerId: movement.playerId,
                transactionType: 'pve_reward',
                resourceType,
                amount: delivered[resourceType],
                balanceAfter: updatedResources[resourceType],
                referenceType: 'movement',
                referenceId: movement.id,
              },
            }),
          ),
      );

      const rewardText =
        delivered.wood > 0 || delivered.gold > 0
          ? ` It brought back ${delivered.wood} wood and ${delivered.gold} gold.`
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
            resourcesDelivered: delivered,
            resourcesLost: lost,
          },
        },
      });
      if (payload.battle?.victory) {
        await this.liveEventsService?.recordParticipationForActiveEvents({
          tx,
          worldId: movement.worldId,
          playerId: movement.playerId,
          type: EVENT_TYPES.PVE_INVASION,
        });
      }

      return true;
    });
  }

  private getCampLevelConfig(level: number): PveCampLevelDefinition {
    return getPveCampLevelConfig(level);
  }

  private async getPlayerCampLevel(
    campId: string,
    playerId: string,
    client: Pick<PrismaService, 'playerPveCampProgress'> = this.prisma,
  ): Promise<number> {
    const progress = await client.playerPveCampProgress.findUnique({
      where: { playerId_pveCampId: { playerId, pveCampId: campId } },
      select: { victoryCount: true },
    });

    return Math.min(PVE_CONFIG.maxVillageLevel, 1 + (progress?.victoryCount ?? 0));
  }

  private async getOwnedCityOrThrow(
    cityId: string,
    bootstrap: { player: { id: string }; world: { id: string } },
  ) {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      include: { island: true, world: true },
    });

    if (!city || city.playerId !== bootstrap.player.id || city.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    if (!city.island) {
      throw new ApiErrorException(
        'City is not placed on the world map.',
        'CITY_NOT_PLACED_ON_MAP',
        HttpStatus.CONFLICT,
      );
    }

    return { ...city, island: city.island };
  }

  private async toCampSummary(
    camp: CampRecord,
    originCity: { island: { x: number; y: number }; world: { speedTravel: number } },
    playerId: string,
  ): Promise<PveCampSummary> {
    return this.toCampSummaryAtLevel(camp, originCity, await this.getPlayerCampLevel(camp.id, playerId));
  }

  private toCampSummaryAtLevel(
    camp: CampRecord,
    originCity: { island: { x: number; y: number }; world: { speedTravel: number } },
    level: number,
  ): PveCampSummary {
    const levelConfig = this.getCampLevelConfig(level);
    const distance = calculateMapDistance({
      from: { x: originCity.island.x, y: originCity.island.y },
      to: { x: camp.island.x, y: camp.island.y },
    });
    const normalTravelTimeSeconds = calculateTravelTimeSeconds({
      distance,
      baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
      worldSpeed: originCity.world.speedTravel,
    });

    return {
      id: camp.id,
      name: camp.name,
      level,
      slotIndex: camp.slotIndex ?? PVE_CONFIG.villageSlotIndex,
      island: {
        id: camp.island.id,
        name: camp.island.name ?? `Island ${camp.island.x}:${camp.island.y}`,
        x: camp.island.x,
        y: camp.island.y,
      },
      enemyStrength: levelConfig.enemyStrength,
      strengthLabel: levelConfig.strengthLabel,
      rewards: { ...levelConfig.rewards },
      distanceFromSelectedCity: distance,
      travelTimeSeconds: calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds,
        transportTravelMultiplier: PVE_CONFIG.travelTimeMultiplier,
        minTravelTimeSeconds: PVE_CONFIG.minTravelTimeSeconds,
      }),
    };
  }

  private toUnitDefinitionSummary(unitType: UnitType): UnitDefinitionSummary {
    const definition = UNIT_CONFIG[unitType];

    return {
      type: unitType,
      category: definition.category,
      name: definition.name,
      description: definition.description,
      cost: { ...definition.cost },
      trainingSecondsPerUnit: definition.trainingSecondsPerUnit,
      attack: definition.attack,
      defense: definition.defense,
      health: definition.health,
      speed: definition.speed,
      capacity: definition.capacity,
      requirements: [],
    };
  }

  private normalizeArmyUnits(units: Partial<Record<string, number>> | null | undefined): ArmyUnits {
    return Object.fromEntries(
      UNIT_TYPE_KEYS.map((unitType) => {
        const value = Number(units?.[unitType] ?? 0);
        if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
          throw new ApiErrorException(
            'Army units must be non-negative integers.',
            'INVALID_ARMY_UNITS',
            HttpStatus.BAD_REQUEST,
          );
        }

        return [unitType, value];
      }),
    ) as ArmyUnits;
  }

  private toArmyUnits(cityUnits: Array<{ unitType: string; quantity: number }>): ArmyUnits {
    const army = Object.fromEntries(UNIT_TYPE_KEYS.map((unitType) => [unitType, 0])) as ArmyUnits;
    for (const unit of cityUnits) {
      if (unit.unitType in army) {
        army[unit.unitType as UnitType] = Math.max(0, unit.quantity);
      }
    }

    return army;
  }

  private getMovementPayload(payload: unknown): {
    campId?: string;
    campName?: string;
    campLevel?: number;
    campPower?: number;
    units: ArmyUnits;
    travelTimeSeconds?: number;
    returnTravelTimeSeconds?: number;
    battle?: PveBattleSummary;
  } {
    const parsed = (payload ?? {}) as {
      campId?: string;
      campName?: string;
      campLevel?: number;
      campPower?: number;
      units?: Partial<Record<string, number>>;
      travelTimeSeconds?: number;
      returnTravelTimeSeconds?: number;
      battle?: PveBattleSummary;
    };

    const units = Object.fromEntries(
      UNIT_TYPE_KEYS.map((unitType) => [
        unitType,
        Math.max(0, Math.floor(Number(parsed.units?.[unitType] ?? 0))),
      ]),
    ) as ArmyUnits;

    return { ...parsed, units };
  }

  private toBattleSummary(battle: {
    victory: boolean;
    playerPower: number;
    campPower: number;
    unitsSent: Record<string, number>;
    unitsLost: Record<string, number>;
    unitsSurvived: Record<string, number>;
    rewards: { wood: number; gold: number };
  }): PveBattleSummary {
    return {
      victory: battle.victory,
      playerPower: battle.playerPower,
      campPower: battle.campPower,
      unitsSent: this.normalizeArmyUnits(battle.unitsSent),
      unitsLost: this.normalizeArmyUnits(battle.unitsLost),
      unitsSurvived: this.normalizeArmyUnits(battle.unitsSurvived),
      rewards: { ...battle.rewards },
    };
  }

  private toArmyMovementSummary(movement: {
    id: string;
    movementType: string;
    status: string;
    departureTime: Date;
    arrivalTime: Date;
    returnArrivalTime: Date | null;
    payload: unknown;
    originCity: { id: string; name: string };
    destinationCamp: { id: string; name: string; level: number } | null;
  }): ArmyMovementSummary {
    const payload = this.getMovementPayload(movement.payload);
    const referenceTime =
      movement.status === 'returning' ? movement.returnArrivalTime : movement.arrivalTime;

    return {
      id: movement.id,
      movementType: movement.movementType,
      status: movement.status,
      originCity: {
        id: movement.originCity.id,
        name: movement.originCity.name,
      },
      camp: movement.destinationCamp
        ? {
            id: movement.destinationCamp.id,
            name: movement.destinationCamp.name,
            level: movement.destinationCamp.level,
          }
        : payload.campId
          ? {
              id: payload.campId,
              name: payload.campName ?? 'Barbarian Village',
              level: payload.campLevel ?? 1,
            }
          : null,
      departureTime: movement.departureTime.toISOString(),
      arrivalTime: movement.arrivalTime.toISOString(),
      returnArrivalTime: movement.returnArrivalTime?.toISOString() ?? null,
      remainingSeconds:
        movement.status === 'completed' || movement.status === 'cancelled'
          ? 0
          : Math.max(0, Math.ceil(((referenceTime ?? new Date()).getTime() - Date.now()) / 1000)),
      units: payload.units,
      battle: payload.battle ?? null,
    };
  }

  private async enqueuePveArrival(movementId: string, arrivalTime: Date): Promise<void> {
    await this.queue.add(
      PVE_ARRIVE_JOB,
      { movementId },
      { delay: Math.max(0, arrivalTime.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 },
    );
  }

  private async enqueuePveReturn(movementId: string, returnArrivalTime: Date): Promise<void> {
    await this.queue.add(
      PVE_RETURN_JOB,
      { movementId },
      { delay: Math.max(0, returnArrivalTime.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 },
    );
  }
}
