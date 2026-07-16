import { HttpStatus, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { ANTI_ABUSE_CONFIG, BUILDING_TYPES, MAP_CONFIG, PVP_CONFIG, UNIT_CONFIG, type UnitType } from '@island-empires/config';
import {
  calculateArmySize,
  calculateMapDistance,
  calculateRepeatedAttackRisk,
  calculateTransportTravelTimeSeconds,
  calculateTravelTimeSeconds,
  resolvePvpBattle,
} from '@island-empires/game-engine';
import type {
  ArmyUnits,
  AttackPlayerCityRequest,
  AttackPlayerCityResponse,
  PvpAttackOptionsResponse,
  PvpBattleSummary,
  PvpMovementSummary,
  ResourceBalance,
  UnitDefinitionSummary,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AntiAbuseService } from '../anti-abuse/anti-abuse.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesService } from '../resources/resources.service';

const QUEUE_NAME = 'island-empires-default';
const PVP_ARRIVE_JOB = 'movement.pvp.arrive';
const PVP_RETURN_JOB = 'movement.pvp.return';
const UNIT_TYPE_KEYS = (Object.keys(UNIT_CONFIG) as UnitType[]).filter(
  (unitType) => UNIT_CONFIG[unitType].category === 'land',
);
const RESOURCE_KEYS: Array<keyof ResourceBalance> = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'];
const EMPTY_RESOURCES: ResourceBalance = { wood: 0, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 };
const RESOURCE_LOOT_ITEM_IDS: Record<keyof ResourceBalance, string> = {
  wood: 'resource_loot_wood',
  gold: 'resource_loot_gold',
  marble: 'resource_loot_marble',
  wine: 'resource_loot_wine',
  crystal: 'resource_loot_crystal',
  sulfur: 'resource_loot_sulfur',
};
const PVP_UNIT_STATS = Object.fromEntries(
  UNIT_TYPE_KEYS.map((unitType) => [
    unitType,
    {
      attack: UNIT_CONFIG[unitType].attack,
      defense: UNIT_CONFIG[unitType].defense,
      health: UNIT_CONFIG[unitType].health,
      carryCapacity:
        PVP_CONFIG.landUnitCarryCapacity[
          unitType as keyof typeof PVP_CONFIG.landUnitCarryCapacity
        ] ?? 0,
    },
  ]),
);
const PVP_MOVEMENT_TYPES = [PVP_CONFIG.attackMovementType, PVP_CONFIG.returnMovementType];

type Db = Record<string, any>;

@Injectable()
export class PvpService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly analyticsService: AnalyticsService | undefined,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly resourcesService: ResourcesService,
    private readonly antiAbuseService: AntiAbuseService,
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

  async getAttackOptions(targetCityId: string, originCityId?: string): Promise<PvpAttackOptionsResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDuePvpMovements();
    const originCity = await this.getOwnedOriginCity(originCityId ?? bootstrap.selectedCityId);
    const targetCity = await this.getTargetCity(targetCityId);
    const cityUnits = await this.prisma.cityUnit.findMany({ where: { cityId: originCity.id } });
    const army = this.toArmyUnits(cityUnits);
    const eligibility = await this.getEligibility({
      attackerPlayerId: bootstrap.player.id,
      attackerCreatedAt: originCity.player.createdAt,
      originCity,
      targetCity,
      units: army,
      requireUnitsSelected: false,
    });

    return {
      originCity: { id: originCity.id, name: originCity.name },
      targetCity: {
        id: targetCity.id,
        name: targetCity.name,
        playerName: targetCity.player.name,
        beginnerProtectionActive: this.hasBeginnerProtection(targetCity.player.createdAt),
      },
      army,
      units: UNIT_TYPE_KEYS.map((unitType) => this.toUnitDefinitionSummary(unitType)),
      attack: {
        canAttack: eligibility.canAttack,
        disabledReason: eligibility.reason ?? null,
        cooldownEndsAt: eligibility.cooldownEndsAt?.toISOString() ?? null,
      },
    };
  }

  async attackCity(targetCityId: string, input: AttackPlayerCityRequest): Promise<AttackPlayerCityResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const unitsToSend = this.normalizeArmyUnits(input.units);
    await this.completeDuePvpMovements();
    await this.resourcesService.recalculateResources(targetCityId);
    const frequency = await this.antiAbuseService.monitorAction({
      worldId: bootstrap.world.id,
      playerId: bootstrap.player.id,
      actionType: 'pvp_attack_started',
      targetType: 'city',
      targetId: targetCityId,
      payload: { originCityId: input.originCityId, units: unitsToSend },
    });
    if (!frequency.allowed) {
      throw new ApiErrorException('Too many actions. Please try again later.', 'RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
    }

    const movement = await this.prisma.$transaction(async (tx) => {
      const [originCity, targetCity] = await Promise.all([
        tx.city.findUnique({ where: { id: input.originCityId }, include: { island: true, world: true, player: true } }),
        tx.city.findUnique({ where: { id: targetCityId }, include: { island: true, player: true } }),
      ]);
      if (!originCity || originCity.playerId !== bootstrap.player.id || originCity.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Origin city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      if (!targetCity || targetCity.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Target city not found.', 'TARGET_CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      const availableUnits = this.toArmyUnits(await tx.cityUnit.findMany({ where: { cityId: originCity.id } }));
      const eligibility = await this.getEligibility({
        attackerPlayerId: bootstrap.player.id,
        attackerCreatedAt: originCity.player.createdAt,
        originCity,
        targetCity,
        units: unitsToSend,
        availableUnits,
        tx,
      });
      if (!eligibility.canAttack) {
        await this.logBlockedAttack(tx, {
          worldId: bootstrap.world.id,
          playerId: bootstrap.player.id,
          targetPlayerId: targetCity.playerId,
          originCityId: originCity.id,
          targetCityId: targetCity.id,
          reason: eligibility.reason ?? 'PVP_ATTACK_UNAVAILABLE',
        });
        throw new ApiErrorException(
          this.reasonToMessage(eligibility.reason),
          eligibility.reason ?? 'PVP_ATTACK_UNAVAILABLE',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!originCity.island || !targetCity.island) {
        throw new ApiErrorException('Both cities must be placed on the world map.', 'CITY_NOT_PLACED_ON_MAP', HttpStatus.CONFLICT);
      }

      const distance = calculateMapDistance({
        from: { x: originCity.island.x, y: originCity.island.y },
        to: { x: targetCity.island.x, y: targetCity.island.y },
      });
      const normalTravelTimeSeconds = calculateTravelTimeSeconds({
        distance,
        baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
        worldSpeed: originCity.world.speedTravel,
      });
      const travelTimeSeconds = calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds,
        transportTravelMultiplier: PVP_CONFIG.travelTimeMultiplier,
        minTravelTimeSeconds: PVP_CONFIG.minTravelTimeSeconds,
      });
      const returnTravelTimeSeconds = calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds,
        transportTravelMultiplier: PVP_CONFIG.returnTravelTimeMultiplier,
        minTravelTimeSeconds: PVP_CONFIG.minTravelTimeSeconds,
      });
      const departureTime = new Date();
      const arrivalTime = new Date(departureTime.getTime() + travelTimeSeconds * 1000);
      const returnArrivalTime = new Date(arrivalTime.getTime() + returnTravelTimeSeconds * 1000);

      await Promise.all(
        UNIT_TYPE_KEYS.filter((unitType) => unitsToSend[unitType] > 0).map((unitType) =>
          tx.cityUnit.update({
            where: { cityId_unitType: { cityId: originCity.id, unitType } },
            data: { quantity: availableUnits[unitType] - unitsToSend[unitType] },
          }),
        ),
      );

      const created = await tx.movement.create({
        data: {
          worldId: originCity.worldId,
          playerId: originCity.playerId,
          originCityId: originCity.id,
          destinationCityId: targetCity.id,
          destinationIslandId: targetCity.islandId,
          destinationSlotIndex: targetCity.slotIndex,
          movementType: PVP_CONFIG.attackMovementType,
          status: 'in_transit',
          departureTime,
          arrivalTime,
          returnArrivalTime,
          payload: {
            targetPlayerId: targetCity.playerId,
            targetPlayerName: targetCity.player.name,
            targetCityId: targetCity.id,
            targetCityName: targetCity.name,
            units: unitsToSend,
            loot: EMPTY_RESOURCES,
            travelTimeSeconds,
            returnTravelTimeSeconds,
          },
        },
        include: { originCity: true, destinationCity: { include: { player: true } } },
      });

      await tx.gameAnalyticsEvent.create({
        data: {
          worldId: originCity.worldId,
          playerId: originCity.playerId,
          eventType: 'pvp_attack_started',
          payload: {
            movementId: created.id,
            originCityId: originCity.id,
            targetCityId: targetCity.id,
            targetPlayerId: targetCity.playerId,
            units: unitsToSend,
            arrivalTime: arrivalTime.toISOString(),
          },
        },
      });
      await this.safeCreate(tx as Db, 'sensitiveActionAuditLog', {
        worldId: originCity.worldId,
        playerId: originCity.playerId,
        relatedPlayerId: targetCity.playerId,
        cityId: originCity.id,
        actionType: 'pvp_attack_started',
        targetType: 'movement',
        targetId: created.id,
        payload: { targetCityId: targetCity.id, units: unitsToSend },
      });

      return created;
    });

    await this.enqueuePvpArrival(movement.id, movement.arrivalTime);
    return { movement: this.toPvpMovementSummary(movement) };
  }

  async getPvpMovements(): Promise<PvpMovementSummary[]> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDuePvpMovements();
    const movements = await this.prisma.movement.findMany({
      where: {
        playerId: bootstrap.player.id,
        movementType: { in: PVP_MOVEMENT_TYPES },
      },
      include: { originCity: true, destinationCity: { include: { player: true } } },
      orderBy: [{ status: 'asc' }, { arrivalTime: 'desc' }],
      take: 25,
    });

    return movements.map((movement) => this.toPvpMovementSummary(movement));
  }

  async completeDuePvpMovements(): Promise<number> {
    const now = new Date();
    const dueArrivals = await this.prisma.movement.findMany({
      where: { movementType: PVP_CONFIG.attackMovementType, status: 'in_transit', arrivalTime: { lte: now } },
      select: { id: true },
    });
    const dueReturns = await this.prisma.movement.findMany({
      where: { movementType: PVP_CONFIG.returnMovementType, status: 'returning', returnArrivalTime: { lte: now } },
      select: { id: true },
    });
    let completed = 0;
    for (const movement of dueArrivals) {
      if (await this.completePvpArrival(movement.id)) completed += 1;
    }
    for (const movement of dueReturns) {
      if (await this.completePvpReturn(movement.id)) completed += 1;
    }
    return completed;
  }

  async completePvpArrival(movementId: string): Promise<boolean> {
    const result = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.movement.findUnique({
        where: { id: movementId },
        include: { originCity: true, destinationCity: { include: { player: true } } },
      });
      if (
        !movement ||
        movement.movementType !== PVP_CONFIG.attackMovementType ||
        movement.status !== 'in_transit' ||
        movement.arrivalTime > new Date() ||
        !movement.destinationCity
      ) {
        return { completed: false, returning: false };
      }

      const payload = this.getMovementPayload(movement.payload);
      const targetCityId = movement.destinationCity.id;
      const [defenderUnits, defenderResources, wall, warehouse] = await Promise.all([
        tx.cityUnit.findMany({ where: { cityId: targetCityId } }),
        tx.cityResource.findUniqueOrThrow({ where: { cityId: targetCityId } }),
        tx.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: targetCityId, buildingType: BUILDING_TYPES.WALL } },
        }),
        tx.cityBuilding.findUnique({
          where: {
            cityId_buildingType: { cityId: targetCityId, buildingType: BUILDING_TYPES.WAREHOUSE },
          },
        }),
      ]);
      const battle = resolvePvpBattle({
        attackerUnits: payload.units,
        defenderUnits: this.toArmyUnits(defenderUnits),
        unitStats: PVP_UNIT_STATS,
        wallLevel: wall?.level ?? 0,
        wallDefensePerLevel: PVP_CONFIG.wallDefensePerLevel,
        defenderResources: this.toResources(defenderResources),
        warehouseLevel: warehouse?.level ?? 0,
        warehouseProtectedAmountPerLevel: PVP_CONFIG.warehouseProtectedAmountPerLevel,
        lootPercentPerResource: PVP_CONFIG.lootPercentPerResource,
        maxLootPerResource: PVP_CONFIG.maxLootPerResource,
      });
      const survivors = this.normalizeArmyUnits(battle.attackerUnitsSurvived);
      const hasSurvivors = calculateArmySize(survivors) > 0;

      const updated = await tx.movement.updateMany({
        where: { id: movement.id, status: 'in_transit' },
        data: {
          movementType: hasSurvivors ? PVP_CONFIG.returnMovementType : movement.movementType,
          status: hasSurvivors ? 'returning' : 'completed',
          completedAt: hasSurvivors ? null : new Date(),
          payload: {
            ...payload,
            units: survivors,
            loot: battle.loot,
            battle: this.toPvpBattleSummary(battle),
          },
        },
      });
      if (updated.count === 0) {
        return { completed: false, returning: false };
      }

      await Promise.all(
        UNIT_TYPE_KEYS.filter((unitType) => battle.defenderUnitsLost[unitType] > 0).map((unitType) =>
          tx.cityUnit.update({
            where: { cityId_unitType: { cityId: targetCityId, unitType } },
            data: {
              quantity: Math.max(
                0,
                (battle.defenderUnitsParticipated[unitType] ?? 0) - battle.defenderUnitsLost[unitType],
              ),
            },
          }),
        ),
      );
      if (battle.attackerVictory) {
        const updatedResources = Object.fromEntries(
          RESOURCE_KEYS.map((resourceType) => [
            resourceType,
            Math.max(0, defenderResources[resourceType] - battle.loot[resourceType]),
          ]),
        );
        await tx.cityResource.update({ where: { cityId: targetCityId }, data: updatedResources });
      }

      await Promise.all([
        tx.report.create({
          data: {
            worldId: movement.worldId,
            playerId: movement.playerId,
            cityId: movement.originCityId,
            type: battle.attackerVictory ? 'pvp_attack_victory' : 'pvp_attack_defeat',
            title: battle.attackerVictory ? 'Attack victory' : 'Attack defeated',
            message: battle.attackerVictory
              ? `Your army defeated ${movement.destinationCity.name}. Lost ${this.formatUnitCounts(battle.attackerUnitsLost)}. Loot: ${this.formatResourceCounts(battle.loot)}.`
              : `Your army was defeated at ${movement.destinationCity.name}. Lost ${this.formatUnitCounts(battle.attackerUnitsLost)}.`,
            payload: { movementId: movement.id, battle: this.toPvpBattleSummary(battle) },
          },
        }),
        tx.report.create({
          data: {
            worldId: movement.worldId,
            playerId: movement.destinationCity.playerId,
            cityId: targetCityId,
            type: battle.attackerVictory ? 'pvp_defense_defeat' : 'pvp_defense_victory',
            title: battle.attackerVictory ? 'City raided' : 'City defended',
            message: battle.attackerVictory
              ? `${movement.originCity.name} raided ${movement.destinationCity.name}.`
              : `${movement.destinationCity.name} defeated an incoming attack from ${movement.originCity.name}.`,
            payload: { movementId: movement.id, battle: this.toPvpBattleSummary(battle) },
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
              attackerVictory: battle.attackerVictory,
              battle: this.toPvpBattleSummary(battle),
            },
          },
        }),
      ]);

      return { completed: true, returning: hasSurvivors, returnArrivalTime: movement.returnArrivalTime };
    });

    if (result.completed && result.returning && result.returnArrivalTime) {
      await this.enqueuePvpReturn(movementId, result.returnArrivalTime);
    }
    return result.completed;
  }

  async completePvpReturn(movementId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.movement.findUnique({
        where: { id: movementId },
        include: { originCity: { include: { player: true } }, destinationCity: { include: { player: true } } },
      });
      if (
        !movement ||
        movement.movementType !== PVP_CONFIG.returnMovementType ||
        movement.status !== 'returning' ||
        !movement.returnArrivalTime ||
        movement.returnArrivalTime > new Date()
      ) {
        return false;
      }

      const updated = await tx.movement.updateMany({
        where: { id: movement.id, status: 'returning' },
        data: { status: 'completed', completedAt: new Date() },
      });
      if (updated.count === 0) {
        return false;
      }

      const payload = this.getMovementPayload(movement.payload);
      await Promise.all(
        UNIT_TYPE_KEYS.filter((unitType) => payload.units[unitType] > 0).map((unitType) =>
          tx.cityUnit.upsert({
            where: { cityId_unitType: { cityId: movement.originCityId, unitType } },
            update: { quantity: { increment: payload.units[unitType] } },
            create: { cityId: movement.originCityId, unitType, quantity: payload.units[unitType] },
          }),
        ),
      );

      await this.grantResourceLoot(tx, {
        userId: (movement.originCity as unknown as { player: { userId: string } }).player.userId,
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
          message: `Your army returned to ${movement.originCity.name}. It added ${this.formatResourceCounts(payload.loot)} to your inventory.`,
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

  private async getOwnedOriginCity(cityId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      include: { island: true, world: true, player: true },
    });
    if (!city || city.playerId !== bootstrap.player.id || city.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Origin city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (!city.island) {
      throw new ApiErrorException('Origin city must be placed on the world map.', 'CITY_NOT_PLACED_ON_MAP', HttpStatus.CONFLICT);
    }
    return { ...city, island: city.island };
  }

  private async getTargetCity(cityId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      include: { island: true, player: true },
    });
    if (!city || city.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Target city not found.', 'TARGET_CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (!city.island) {
      throw new ApiErrorException('Target city must be placed on the world map.', 'TARGET_CITY_NOT_PLACED_ON_MAP', HttpStatus.CONFLICT);
    }
    return { ...city, island: city.island };
  }

  private async getEligibility(input: {
    attackerPlayerId: string;
    attackerCreatedAt: Date;
    originCity: any;
    targetCity: any;
    units: ArmyUnits;
    availableUnits?: ArmyUnits;
    requireUnitsSelected?: boolean;
    tx?: Db;
  }): Promise<{ canAttack: boolean; reason?: string; cooldownEndsAt?: Date }> {
    const db = input.tx ?? this.prisma;
    if (!input.originCity.island || !input.targetCity.island) return { canAttack: false, reason: 'CITY_NOT_PLACED_ON_MAP' };
    if (input.originCity.id === input.targetCity.id) return { canAttack: false, reason: 'SAME_CITY_ATTACK_BLOCKED' };
    if (input.targetCity.playerId === input.attackerPlayerId) return { canAttack: false, reason: 'OWN_CITY_ATTACK_BLOCKED' };
    if (input.originCity.worldId !== input.targetCity.worldId) return { canAttack: false, reason: 'WORLD_MISMATCH' };
    if (this.hasBeginnerProtection(input.targetCity.player.createdAt)) return { canAttack: false, reason: 'TARGET_BEGINNER_PROTECTED' };
    if (this.hasBeginnerProtection(input.attackerCreatedAt)) return { canAttack: false, reason: 'ATTACKER_BEGINNER_PROTECTED' };

    const [attackerAlliance, targetAlliance, lastAttack, repeatedAttackCount] = await Promise.all([
      db.allianceMember.findUnique({ where: { playerId: input.attackerPlayerId } }),
      db.allianceMember.findUnique({ where: { playerId: input.targetCity.playerId } }),
      db.movement.findFirst({
        where: { playerId: input.attackerPlayerId, movementType: { in: PVP_MOVEMENT_TYPES } },
        orderBy: { createdAt: 'desc' },
      }),
      db.movement.count({
        where: {
          playerId: input.attackerPlayerId,
          destinationCityId: input.targetCity.id,
          movementType: { in: PVP_MOVEMENT_TYPES },
          createdAt: { gte: new Date(Date.now() - PVP_CONFIG.repeatedAttackWindowSeconds * 1000) },
        },
      }),
    ]);
    if (attackerAlliance && targetAlliance && attackerAlliance.allianceId === targetAlliance.allianceId) {
      return { canAttack: false, reason: 'SAME_ALLIANCE_ATTACK_BLOCKED' };
    }
    if (lastAttack) {
      const cooldownEndsAt = new Date(lastAttack.createdAt.getTime() + PVP_CONFIG.attackCooldownSeconds * 1000);
      if (cooldownEndsAt > new Date()) {
        return { canAttack: false, reason: 'ATTACK_COOLDOWN_ACTIVE', cooldownEndsAt };
      }
    }
    if (repeatedAttackCount >= PVP_CONFIG.repeatedAttackLimit) {
      return { canAttack: false, reason: 'REPEATED_ATTACK_PROTECTION_ACTIVE' };
    }
    if (input.requireUnitsSelected !== false && calculateArmySize(input.units) <= 0) return { canAttack: false, reason: 'NO_UNITS_SELECTED' };
    if (input.availableUnits && UNIT_TYPE_KEYS.some((unitType) => input.units[unitType] > input.availableUnits![unitType])) {
      return { canAttack: false, reason: 'NOT_ENOUGH_UNITS' };
    }
    return { canAttack: true };
  }

  private hasBeginnerProtection(createdAt: Date): boolean {
    return Date.now() < createdAt.getTime() + PVP_CONFIG.beginnerProtectionDays * 24 * 60 * 60 * 1000;
  }

  private reasonToMessage(reason?: string): string {
    switch (reason) {
      case 'TARGET_BEGINNER_PROTECTED':
        return 'This player is under beginner protection.';
      case 'ATTACKER_BEGINNER_PROTECTED':
        return 'You cannot attack while beginner protection is active.';
      case 'SAME_ALLIANCE_ATTACK_BLOCKED':
        return 'You cannot attack a member of your own alliance.';
      case 'ATTACK_COOLDOWN_ACTIVE':
        return 'Your attack cooldown is still active.';
      case 'REPEATED_ATTACK_PROTECTION_ACTIVE':
        return 'This city is protected from repeated attacks.';
      case 'NO_UNITS_SELECTED':
        return 'Select at least one combat unit.';
      case 'NOT_ENOUGH_UNITS':
        return 'You do not have enough available units.';
      default:
        return 'PvP attack cannot be started.';
    }
  }

  private async logBlockedAttack(tx: Db, input: Record<string, unknown>): Promise<void> {
    await tx.gameAnalyticsEvent.create({
      data: {
        worldId: input.worldId,
        playerId: input.playerId,
        eventType: 'pvp_attack_blocked',
        payload: input,
      },
    });
    if (input.reason === 'REPEATED_ATTACK_PROTECTION_ACTIVE' || input.reason === 'ATTACK_COOLDOWN_ACTIVE') {
      const recentAttackCount = await tx.movement.count({
        where: {
          playerId: input.playerId,
          destinationCityId: input.targetCityId,
          movementType: { in: PVP_MOVEMENT_TYPES },
          createdAt: { gte: new Date(Date.now() - ANTI_ABUSE_CONFIG.repeatedAttack.sameTargetWindowHours * 60 * 60 * 1000) },
        },
      });
      const riskLevel = calculateRepeatedAttackRisk({
        attackCount: recentAttackCount + 1,
        thresholds: ANTI_ABUSE_CONFIG.repeatedAttack,
      });
      await this.safeCreate(tx, 'abuseSignal', {
        worldId: input.worldId,
        playerId: input.playerId,
        relatedPlayerId: input.targetPlayerId,
        signalType: 'repeated_attack',
        severity: riskLevel === 'none' ? 'low' : riskLevel,
        score: riskLevel === 'critical' ? 95 : riskLevel === 'high' ? 70 : riskLevel === 'medium' ? 35 : 10,
        title: 'Repeated PvP attack pattern',
        description: String(input.reason),
        reason: input.reason,
        source: 'pvp',
        targetType: 'city',
        targetId: input.targetCityId,
        payload: input,
      });
    }
  }

  private async safeCreate(db: Db, model: string, data: Record<string, unknown>): Promise<unknown> {
    try {
      const delegate = db[model];
      if (!delegate?.create) return null;
      return await delegate.create({ data });
    } catch {
      return null;
    }
  }

  private normalizeArmyUnits(units: Partial<Record<string, number>> | null | undefined): ArmyUnits {
    return Object.fromEntries(
      UNIT_TYPE_KEYS.map((unitType) => {
        const value = Number(units?.[unitType] ?? 0);
        if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
          throw new ApiErrorException('Army units must be non-negative integers.', 'INVALID_ARMY_UNITS', HttpStatus.BAD_REQUEST);
        }
        return [unitType, value];
      }),
    ) as ArmyUnits;
  }

  private toArmyUnits(cityUnits: Array<{ unitType: string; quantity: number }>): ArmyUnits {
    const army = Object.fromEntries(UNIT_TYPE_KEYS.map((unitType) => [unitType, 0])) as ArmyUnits;
    for (const unit of cityUnits) {
      if (UNIT_TYPE_KEYS.includes(unit.unitType as UnitType)) {
        army[unit.unitType] = Math.max(0, unit.quantity);
      }
    }
    return army;
  }

  private toResources(resources: ResourceBalance): ResourceBalance {
    return Object.fromEntries(RESOURCE_KEYS.map((resourceType) => [resourceType, Math.max(0, resources[resourceType] ?? 0)])) as ResourceBalance;
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
      capacity: PVP_UNIT_STATS[unitType].carryCapacity,
      requirements: [],
    };
  }

  private getMovementPayload(payload: unknown): {
    targetPlayerId?: string;
    targetPlayerName?: string;
    targetCityId?: string;
    targetCityName?: string;
    units: ArmyUnits;
    loot: ResourceBalance;
    battle?: PvpBattleSummary;
  } {
    const parsed = (payload ?? {}) as Record<string, any>;
    return {
      ...parsed,
      units: this.normalizeArmyUnits(parsed.units),
      loot: this.toResources({ ...EMPTY_RESOURCES, ...(parsed.loot ?? {}) }),
    };
  }

  private toPvpBattleSummary(battle: any): PvpBattleSummary {
    return {
      attackerVictory: battle.attackerVictory,
      attackerPower: battle.attackerPower,
      defenderPower: battle.defenderPower,
      wallDefenseBonus: battle.wallDefenseBonus,
      attackerUnitsSent: this.normalizeArmyUnits(battle.attackerUnitsSent),
      defenderUnitsParticipated: this.normalizeArmyUnits(battle.defenderUnitsParticipated),
      attackerUnitsLost: this.normalizeArmyUnits(battle.attackerUnitsLost),
      defenderUnitsLost: this.normalizeArmyUnits(battle.defenderUnitsLost),
      attackerUnitsSurvived: this.normalizeArmyUnits(battle.attackerUnitsSurvived),
      defenderUnitsSurvived: this.normalizeArmyUnits(battle.defenderUnitsSurvived),
      loot: this.toResources(battle.loot),
      protectedResources: this.toResources(battle.protectedResources),
    };
  }

  private async grantResourceLoot(
    tx: any,
    input: {
      userId: string;
      playerId: string;
      cityId: string;
      sourceType: 'pvp';
      sourceId: string;
      transactionSourceId: string;
      rewards: ResourceBalance;
    },
  ): Promise<void> {
    for (const resourceType of RESOURCE_KEYS) {
      const quantity = Math.max(0, Math.floor(input.rewards[resourceType] ?? 0));
      if (quantity <= 0) continue;
      const itemId = RESOURCE_LOOT_ITEM_IDS[resourceType];
      const item = await tx.userInventoryItem.upsert({
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
      await tx.inventoryTransaction.create({
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

  private formatUnitCounts(units: ArmyUnits): string {
    const text = UNIT_TYPE_KEYS.filter((unitType) => units[unitType] > 0)
      .map((unitType) => `${units[unitType]} ${UNIT_CONFIG[unitType].name}`)
      .join(', ');
    return text || 'none';
  }

  private formatResourceCounts(resources: Partial<ResourceBalance>): string {
    const text = RESOURCE_KEYS.filter((resourceType) => (resources[resourceType] ?? 0) > 0)
      .map((resourceType) => `${Math.floor(resources[resourceType] ?? 0)} ${resourceType}`)
      .join(', ');
    return text || 'no resources';
  }

  private toPvpMovementSummary(movement: {
    id: string;
    movementType: string;
    status: string;
    departureTime: Date;
    arrivalTime: Date;
    returnArrivalTime: Date | null;
    payload: unknown;
    originCity: { id: string; name: string };
    destinationCity: ({ id: string; name: string; player: { name: string } } | null);
  }): PvpMovementSummary {
    const payload = this.getMovementPayload(movement.payload);
    const referenceTime = movement.status === 'returning' ? movement.returnArrivalTime : movement.arrivalTime;
    return {
      id: movement.id,
      movementType: movement.movementType,
      status: movement.status,
      originCity: { id: movement.originCity.id, name: movement.originCity.name },
      targetCity: movement.destinationCity
        ? { id: movement.destinationCity.id, name: movement.destinationCity.name, playerName: movement.destinationCity.player.name }
        : payload.targetCityId
          ? { id: payload.targetCityId, name: payload.targetCityName ?? 'Target city', playerName: payload.targetPlayerName ?? 'Unknown player' }
          : null,
      departureTime: movement.departureTime.toISOString(),
      arrivalTime: movement.arrivalTime.toISOString(),
      returnArrivalTime: movement.returnArrivalTime?.toISOString() ?? null,
      remainingSeconds: movement.status === 'completed' ? 0 : Math.max(0, Math.ceil(((referenceTime ?? new Date()).getTime() - Date.now()) / 1000)),
      units: payload.units,
      loot: payload.loot,
      battle: payload.battle ?? null,
    };
  }

  private async enqueuePvpArrival(movementId: string, arrivalTime: Date): Promise<void> {
    await this.queue.add(PVP_ARRIVE_JOB, { movementId }, { delay: Math.max(0, arrivalTime.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 });
  }

  private async enqueuePvpReturn(movementId: string, returnArrivalTime: Date): Promise<void> {
    await this.queue.add(PVP_RETURN_JOB, { movementId }, { delay: Math.max(0, returnArrivalTime.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 });
  }
}
