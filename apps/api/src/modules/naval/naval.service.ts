import { HttpStatus, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  BUILDING_TYPES,
  MAP_CONFIG,
  NAVAL_CONFIG,
  NAVAL_SHIP_TYPES,
  UNIT_CONFIG,
  type NavalShipType,
  type UnitType,
} from '@island-empires/config';
import {
  calculateArmySize,
  calculateMapDistance,
  calculatePvpLoot,
  calculateTransportTravelTimeSeconds,
  calculateTravelTimeSeconds,
  resolveNavalBattle,
} from '@island-empires/game-engine';
import type {
  NavalAttackOptionsResponse,
  NavalAttackRequest,
  NavalAttackResponse,
  NavalBattleSummary,
  NavalMovementSummary,
  NavalShips,
  ResourceBalance,
  UnitDefinitionSummary,
  CityBlockadeSummary,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { DevelopmentStateService } from '../players/development-state.service';

const QUEUE_NAME = 'island-empires-default';
const NAVAL_ARRIVE_JOB = 'movement.naval.arrive';
const NAVAL_RETURN_JOB = 'movement.naval.return';
const BLOCKADE_EXPIRE_JOB = 'blockade.expire';
const SHIP_TYPE_KEYS = Object.values(NAVAL_SHIP_TYPES) as NavalShipType[];
const NAVAL_MOVEMENT_TYPES = [
  NAVAL_CONFIG.attackMovementType,
  NAVAL_CONFIG.returnMovementType,
  NAVAL_CONFIG.blockadeReturnMovementType,
];
const EMPTY_SHIPS: NavalShips = { light_ship: 0, ram_ship: 0, fire_ship: 0 };
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
const SHIP_STATS = Object.fromEntries(
  SHIP_TYPE_KEYS.map((shipType) => [
    shipType,
    {
      attack: UNIT_CONFIG[shipType as UnitType].attack,
      defense: UNIT_CONFIG[shipType as UnitType].defense,
      health: UNIT_CONFIG[shipType as UnitType].health,
    },
  ]),
);

type Db = Record<string, any>;

@Injectable()
export class NavalService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly analyticsService: AnalyticsService | undefined,
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

  async getAttackOptions(targetCityId: string, originCityId?: string): Promise<NavalAttackOptionsResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDueNavalMovements();
    const originCity = await this.getOwnedOriginCity(originCityId ?? bootstrap.selectedCityId);
    const targetCity = await this.getTargetCity(targetCityId);
    const fleet = await this.ensureFleet(this.prisma as Db, originCity);
    const eligibility = await this.getEligibility({
      attackerPlayerId: bootstrap.player.id,
      attackerCreatedAt: originCity.player.createdAt,
      originCity,
      targetCity,
      ships: this.toShips(fleet),
      requireShipsSelected: false,
    });

    return {
      originCity: { id: originCity.id, name: originCity.name },
      targetCity: {
        id: targetCity.id,
        name: targetCity.name,
        playerName: targetCity.player.name,
        beginnerProtectionActive: this.hasBeginnerProtection(targetCity.player.createdAt),
        blockaded: await this.isCityBlockaded(targetCity.id),
      },
      fleet: this.toShips(fleet),
      ships: SHIP_TYPE_KEYS.map((shipType) => this.toUnitDefinitionSummary(shipType)),
      attack: {
        canAttack: eligibility.canAttack,
        disabledReason: eligibility.reason ?? null,
        cooldownEndsAt: eligibility.cooldownEndsAt?.toISOString() ?? null,
      },
    };
  }

  async attackCity(targetCityId: string, input: NavalAttackRequest): Promise<NavalAttackResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const shipsToSend = this.normalizeShips(input.ships);
    await this.completeDueNavalMovements();

    const movement = await this.prisma.$transaction(async (tx) => {
      const db = tx as Db;
      const [originCity, targetCity] = await Promise.all([
        db.city.findUnique({ where: { id: input.originCityId }, include: { island: true, world: true, player: true } }),
        db.city.findUnique({ where: { id: targetCityId }, include: { island: true, player: true } }),
      ]);
      if (!originCity || originCity.playerId !== bootstrap.player.id || originCity.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Origin city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      if (!targetCity || targetCity.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Target city not found.', 'TARGET_CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      if (!originCity.island || !targetCity.island) {
        throw new ApiErrorException('Both cities must be placed on the world map.', 'CITY_NOT_PLACED_ON_MAP', HttpStatus.CONFLICT);
      }

      const fleet = await this.ensureFleet(db, originCity);
      const eligibility = await this.getEligibility({
        attackerPlayerId: bootstrap.player.id,
        attackerCreatedAt: originCity.player.createdAt,
        originCity,
        targetCity,
        ships: shipsToSend,
        availableShips: this.toShips(fleet),
        tx: db,
      });
      if (!eligibility.canAttack) {
        await this.logBlockedAttack(db, {
          worldId: bootstrap.world.id,
          playerId: bootstrap.player.id,
          targetPlayerId: targetCity.playerId,
          originCityId: originCity.id,
          targetCityId: targetCity.id,
          reason: eligibility.reason ?? 'NAVAL_ATTACK_UNAVAILABLE',
        });
        throw new ApiErrorException(
          this.reasonToMessage(eligibility.reason),
          eligibility.reason ?? 'NAVAL_ATTACK_UNAVAILABLE',
          HttpStatus.BAD_REQUEST,
        );
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
        transportTravelMultiplier: NAVAL_CONFIG.navalTravelMultiplier,
        minTravelTimeSeconds: NAVAL_CONFIG.minNavalTravelTimeSeconds,
      });
      const returnTravelTimeSeconds = calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds,
        transportTravelMultiplier: NAVAL_CONFIG.returnTravelTimeMultiplier,
        minTravelTimeSeconds: NAVAL_CONFIG.minNavalTravelTimeSeconds,
      });
      const departureTime = new Date();
      const arrivalTime = new Date(departureTime.getTime() + travelTimeSeconds * 1000);
      const returnArrivalTime = new Date(arrivalTime.getTime() + returnTravelTimeSeconds * 1000);

      await db.cityFleet.update({
        where: { cityId: originCity.id },
        data: {
          lightShip: fleet.lightShip - shipsToSend.light_ship,
          ramShip: fleet.ramShip - shipsToSend.ram_ship,
          fireShip: fleet.fireShip - shipsToSend.fire_ship,
        },
      });
      const navalAttack = await db.navalAttack.create({
        data: {
          worldId: originCity.worldId,
          attackerPlayerId: originCity.playerId,
          defenderPlayerId: targetCity.playerId,
          originCityId: originCity.id,
          targetCityId: targetCity.id,
          sentLightShip: shipsToSend.light_ship,
          sentRamShip: shipsToSend.ram_ship,
          sentFireShip: shipsToSend.fire_ship,
          startedAt: departureTime,
        },
      });
      const created = await db.movement.create({
        data: {
          worldId: originCity.worldId,
          playerId: originCity.playerId,
          originCityId: originCity.id,
          destinationCityId: targetCity.id,
          destinationIslandId: targetCity.islandId,
          destinationSlotIndex: targetCity.slotIndex,
          movementType: NAVAL_CONFIG.attackMovementType,
          status: 'in_transit',
          departureTime,
          arrivalTime,
          returnArrivalTime,
          payload: {
            navalAttackId: navalAttack.id,
            targetPlayerId: targetCity.playerId,
            targetPlayerName: targetCity.player.name,
            targetCityId: targetCity.id,
            targetCityName: targetCity.name,
            ships: shipsToSend,
            establishBlockade: input.establishBlockade === true,
            travelTimeSeconds,
            returnTravelTimeSeconds,
          },
        },
        include: { originCity: true, destinationCity: { include: { player: true } } },
      });
      await db.navalAttack.update({
        where: { id: navalAttack.id },
        data: { attackMovementId: created.id },
      });
      await db.navalCooldown.upsert({
        where: { attackerPlayerId_targetCityId: { attackerPlayerId: originCity.playerId, targetCityId: targetCity.id } },
        update: { cooldownEndsAt: new Date(departureTime.getTime() + NAVAL_CONFIG.attackCooldownSeconds * 1000) },
        create: {
          worldId: originCity.worldId,
          attackerPlayerId: originCity.playerId,
          targetCityId: targetCity.id,
          cooldownEndsAt: new Date(departureTime.getTime() + NAVAL_CONFIG.attackCooldownSeconds * 1000),
        },
      });
      await db.gameAnalyticsEvent.create({
        data: {
          worldId: originCity.worldId,
          playerId: originCity.playerId,
          eventType: 'naval_attack_started',
          payload: {
            navalAttackId: navalAttack.id,
            movementId: created.id,
            originCityId: originCity.id,
            targetCityId: targetCity.id,
            targetPlayerId: targetCity.playerId,
            ships: shipsToSend,
            establishBlockade: input.establishBlockade === true,
            arrivalTime: arrivalTime.toISOString(),
          },
        },
      });

      return created;
    });

    await this.enqueueNavalArrival(movement.id, movement.arrivalTime);
    return { movement: this.toMovementSummary(movement) };
  }

  async getNavalMovements(): Promise<NavalMovementSummary[]> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDueNavalMovements();
    const movements = await (this.prisma as Db).movement.findMany({
      where: { playerId: bootstrap.player.id, movementType: { in: NAVAL_MOVEMENT_TYPES } },
      include: { originCity: true, destinationCity: { include: { player: true } } },
      orderBy: [{ status: 'asc' }, { arrivalTime: 'desc' }],
      take: 25,
    });
    return movements.map((movement: any) => this.toMovementSummary(movement));
  }

  async getActiveBlockades(): Promise<CityBlockadeSummary[]> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDueNavalMovements();
    const blockades = await (this.prisma as Db).cityBlockade.findMany({
      where: {
        worldId: bootstrap.world.id,
        status: 'active',
        OR: [{ attackerPlayerId: bootstrap.player.id }, { defenderPlayerId: bootstrap.player.id }],
      },
      orderBy: { endsAt: 'asc' },
    });
    return blockades.map((blockade: any) => this.toBlockadeSummary(blockade));
  }

  async isCityBlockaded(cityId: string, tx?: Db): Promise<boolean> {
    await this.expireDueBlockades(tx);
    const db = tx ?? (this.prisma as Db);
    const blockade = await db.cityBlockade.findFirst({
      where: { targetCityId: cityId, status: 'active', endsAt: { gt: new Date() } },
      select: { id: true },
    });
    return Boolean(blockade);
  }

  async completeDueNavalMovements(): Promise<number> {
    await this.expireDueBlockades();
    const db = this.prisma as Db;
    const dueArrivals = await db.movement.findMany({
      where: { movementType: NAVAL_CONFIG.attackMovementType, status: 'in_transit', arrivalTime: { lte: new Date() } },
      select: { id: true },
    });
    const dueReturns = await db.movement.findMany({
      where: {
        movementType: { in: [NAVAL_CONFIG.returnMovementType, NAVAL_CONFIG.blockadeReturnMovementType] },
        status: 'returning',
        returnArrivalTime: { lte: new Date() },
      },
      select: { id: true },
    });
    let completed = 0;
    for (const movement of dueArrivals) {
      if (await this.completeNavalArrival(movement.id)) completed += 1;
    }
    for (const movement of dueReturns) {
      if (await this.completeNavalReturn(movement.id)) completed += 1;
    }
    return completed;
  }

  async completeNavalArrival(movementId: string): Promise<boolean> {
    const result = await this.prisma.$transaction(async (tx) => {
      const db = tx as Db;
      const movement = await db.movement.findUnique({
        where: { id: movementId },
        include: { originCity: true, destinationCity: { include: { player: true } } },
      });
      if (
        !movement ||
        movement.movementType !== NAVAL_CONFIG.attackMovementType ||
        movement.status !== 'in_transit' ||
        movement.arrivalTime > new Date() ||
        !movement.destinationCity
      ) {
        return { completed: false, returning: false };
      }
      const payload = this.getMovementPayload(movement.payload);
      const claim = await db.movement.updateMany({
        where: { id: movement.id, status: 'in_transit' },
        data: { status: 'resolving' },
      });
      if (claim.count === 0) {
        return { completed: false, returning: false };
      }
      const [defenderFleet, defenderResources, warehouse, port, shipyard] = await Promise.all([
        this.ensureFleet(db, movement.destinationCity),
        db.cityResource.findUniqueOrThrow({ where: { cityId: movement.destinationCity.id } }),
        db.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: movement.destinationCity.id, buildingType: BUILDING_TYPES.WAREHOUSE } },
        }),
        db.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: movement.destinationCity.id, buildingType: BUILDING_TYPES.PORT } },
        }),
        db.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: movement.destinationCity.id, buildingType: BUILDING_TYPES.SHIPYARD } },
        }),
      ]);
      const battle = resolveNavalBattle({
        attackerShips: payload.ships,
        defenderShips: this.toShips(defenderFleet),
        shipStats: SHIP_STATS,
        portLevel: port?.level ?? 0,
        shipyardLevel: shipyard?.level ?? 0,
        portDefensePerLevel: NAVAL_CONFIG.portDefensePerLevel,
        shipyardDefensePerLevel: NAVAL_CONFIG.shipyardDefensePerLevel,
      });
      const battleSummary = this.toBattleSummary(battle);
      const survivors = battleSummary.attackerShipsSurvived;
      const carryCapacity = battle.attackerVictory
        ? SHIP_TYPE_KEYS.reduce(
            (sum, shipType) =>
              sum +
              survivors[shipType] *
                (NAVAL_CONFIG.shipCarryCapacity[shipType as keyof typeof NAVAL_CONFIG.shipCarryCapacity] ?? 0),
            0,
          )
        : 0;
      const lootResult = battle.attackerVictory
        ? calculatePvpLoot({
            availableResources: this.toResources(defenderResources),
            protectedAmountPerResource: (warehouse?.level ?? 0) * NAVAL_CONFIG.warehouseProtectedAmountPerLevel,
            lootPercentPerResource: NAVAL_CONFIG.lootPercentPerResource,
            maxLootPerResource: NAVAL_CONFIG.maxLootPerResource,
            carryCapacity,
          })
        : { loot: EMPTY_RESOURCES, protectedResources: EMPTY_RESOURCES };
      const battleWithLoot = {
        ...battleSummary,
        loot: lootResult.loot,
        protectedResources: lootResult.protectedResources,
      };
      const canBlockade =
        payload.establishBlockade &&
        battle.attackerVictory &&
        calculateArmySize(survivors) > 0 &&
        (port?.level ?? 0) >= 1 &&
        !(await this.hasActiveBlockadeByAttacker(db, movement.playerId, movement.destinationCity.id)) &&
        (await this.getActiveBlockadeCount(db, movement.playerId)) < NAVAL_CONFIG.maxActiveBlockadesPerAttacker;

      await db.cityFleet.update({
        where: { cityId: movement.destinationCity.id },
        data: {
          lightShip: battleSummary.defenderShipsSurvived.light_ship,
          ramShip: battleSummary.defenderShipsSurvived.ram_ship,
          fireShip: battleSummary.defenderShipsSurvived.fire_ship,
        },
      });
      if (battle.attackerVictory) {
        await db.cityResource.update({
          where: { cityId: movement.destinationCity.id },
          data: Object.fromEntries(
            RESOURCE_KEYS.map((resourceType) => [
              resourceType,
              Math.max(0, defenderResources[resourceType] - lootResult.loot[resourceType]),
            ]),
          ),
        });
      }

      const now = new Date();
      let blockade: any = null;
      if (canBlockade) {
        const endsAt = new Date(now.getTime() + NAVAL_CONFIG.blockadeDurationMinutes * 60 * 1000);
        blockade = await db.cityBlockade.create({
          data: {
            worldId: movement.worldId,
            attackerPlayerId: movement.playerId,
            defenderPlayerId: movement.destinationCity.playerId,
            originCityId: movement.originCityId,
            targetCityId: movement.destinationCity.id,
            navalAttackId: payload.navalAttackId,
            startedAt: now,
            endsAt,
            committedLightShip: survivors.light_ship,
            committedRamShip: survivors.ram_ship,
            committedFireShip: survivors.fire_ship,
          },
        });
        await this.enqueueBlockadeExpiry(blockade.id, endsAt);
      }

      const hasSurvivors = calculateArmySize(survivors) > 0;
      await db.movement.updateMany({
        where: { id: movement.id, status: 'resolving' },
        data: {
          movementType: canBlockade ? NAVAL_CONFIG.attackMovementType : hasSurvivors ? NAVAL_CONFIG.returnMovementType : NAVAL_CONFIG.attackMovementType,
          status: canBlockade ? 'completed' : hasSurvivors ? 'returning' : 'completed',
          completedAt: canBlockade || !hasSurvivors ? now : null,
          payload: {
            ...payload,
            ships: survivors,
            battle: battleWithLoot,
            loot: lootResult.loot,
            blockadeId: blockade?.id ?? null,
          },
        },
      });
      await db.navalAttack.update({
        where: { id: payload.navalAttackId },
        data: {
          status: canBlockade ? 'blockading' : hasSurvivors ? 'returning' : 'completed',
          returnMovementId: canBlockade ? null : hasSurvivors ? movement.id : null,
          lostLightShip: battleSummary.attackerShipsLost.light_ship,
          lostRamShip: battleSummary.attackerShipsLost.ram_ship,
          lostFireShip: battleSummary.attackerShipsLost.fire_ship,
          result: battle.attackerVictory ? 'attacker_victory' : 'defender_victory',
          attackerPower: battle.attackerPower,
          defenderPower: battle.defenderPower,
          blockadeCreated: Boolean(blockade),
          blockadeId: blockade?.id ?? null,
          resolvedAt: now,
          completedAt: !hasSurvivors ? now : null,
        },
      });

      await this.createBattleReports(db, movement, battleWithLoot, blockade);
      await this.analyticsService?.track({
        worldId: movement.worldId,
        playerId: movement.playerId,
        eventType: 'naval_attack_completed',
        payload: { movementId: movement.id, targetCityId: movement.destinationCity.id, attackerVictory: battle.attackerVictory, blockadeId: blockade?.id ?? null },
      });

      return { completed: true, returning: hasSurvivors && !canBlockade, returnArrivalTime: movement.returnArrivalTime };
    });
    if (result.completed && result.returning && result.returnArrivalTime) {
      await this.enqueueNavalReturn(movementId, result.returnArrivalTime);
    }
    return result.completed;
  }

  async completeNavalReturn(movementId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const db = tx as Db;
      const movement = await db.movement.findUnique({
        where: { id: movementId },
        include: { originCity: { include: { player: true } } },
      });
      if (
        !movement ||
        ![NAVAL_CONFIG.returnMovementType, NAVAL_CONFIG.blockadeReturnMovementType].includes(movement.movementType) ||
        movement.status !== 'returning' ||
        !movement.returnArrivalTime ||
        movement.returnArrivalTime > new Date()
      ) {
        return false;
      }
      const payload = this.getMovementPayload(movement.payload);
      const updated = await db.movement.updateMany({
        where: { id: movement.id, status: 'returning' },
        data: { status: 'completed', completedAt: new Date() },
      });
      if (updated.count === 0) return false;

      const fleet = await this.ensureFleet(db, movement.originCity);
      await db.cityFleet.update({
        where: { cityId: movement.originCityId },
        data: {
          lightShip: fleet.lightShip + payload.ships.light_ship,
          ramShip: fleet.ramShip + payload.ships.ram_ship,
          fireShip: fleet.fireShip + payload.ships.fire_ship,
        },
      });
      await this.grantResourceLoot(db, {
        userId: movement.originCity.player.userId,
        playerId: movement.playerId,
        cityId: movement.originCityId,
        sourceId: 'naval_loot',
        transactionSourceId: movement.id,
        rewards: payload.loot,
      });
      if (payload.navalAttackId) {
        await db.navalAttack.updateMany({
          where: { id: payload.navalAttackId, status: { in: ['returning', 'blockading'] } },
          data: {
            status: 'completed',
            returnedLightShip: payload.ships.light_ship,
            returnedRamShip: payload.ships.ram_ship,
            returnedFireShip: payload.ships.fire_ship,
            completedAt: new Date(),
          },
        });
      }
      await db.report.create({
        data: {
          worldId: movement.worldId,
          playerId: movement.playerId,
          cityId: movement.originCityId,
          type: 'naval_fleet_returned',
          title: 'Fleet returned',
          message: `Your fleet returned to ${movement.originCity.name}. It added ${this.formatResourceCounts(payload.loot)} to your inventory.`,
          payload: {
            movementId: movement.id,
            shipsReturned: payload.ships,
            resourcesDelivered: payload.loot,
            resourcesAddedToInventory: payload.loot,
            blockadeId: payload.blockadeId ?? null,
          },
        },
      });
      return true;
    });
  }

  private async expireDueBlockades(tx?: Db): Promise<number> {
    const db = tx ?? (this.prisma as Db);
    const due = await db.cityBlockade.findMany({
      where: { status: 'active', endsAt: { lte: new Date() } },
    });
    let expired = 0;
    for (const blockade of due) {
      const expireOne = async (inner: Db) => {
        const current = await inner.cityBlockade.findUnique({ where: { id: blockade.id } });
        if (!current || current.status !== 'active' || current.endsAt > new Date()) return null;
        const updated = await inner.cityBlockade.updateMany({
          where: { id: current.id, status: 'active' },
          data: { status: 'expired', endedAt: new Date() },
        });
        if (updated.count === 0) return null;
        const attack = current.navalAttackId
          ? await inner.navalAttack.findUnique({ where: { id: current.navalAttackId } })
          : null;
        const attackMovement = attack?.attackMovementId
          ? await inner.movement.findFirst({
              where: { id: attack.attackMovementId },
              select: { payload: true },
            })
          : null;
        const returnTravelTimeSeconds = Number(
          attackMovement?.payload?.returnTravelTimeSeconds ?? NAVAL_CONFIG.minNavalTravelTimeSeconds,
        );
        const now = new Date();
        const returnArrivalTime = new Date(now.getTime() + returnTravelTimeSeconds * 1000);
        const movement = await inner.movement.create({
          data: {
            worldId: current.worldId,
            playerId: current.attackerPlayerId,
            originCityId: current.originCityId,
            destinationCityId: current.targetCityId,
            movementType: NAVAL_CONFIG.blockadeReturnMovementType,
            status: 'returning',
            departureTime: now,
            arrivalTime: now,
            returnArrivalTime,
            payload: {
              navalAttackId: current.navalAttackId,
              blockadeId: current.id,
              ships: {
                light_ship: current.committedLightShip,
                ram_ship: current.committedRamShip,
                fire_ship: current.committedFireShip,
              },
              loot: this.toResources(attackMovement?.payload?.loot ?? EMPTY_RESOURCES),
              returnTravelTimeSeconds,
            },
          },
        });
        await inner.navalAttack.updateMany({
          where: { id: current.navalAttackId ?? '', status: 'blockading' },
          data: { status: 'returning', returnMovementId: movement.id },
        });
        await Promise.all([
          inner.report.create({
            data: {
              worldId: current.worldId,
              playerId: current.attackerPlayerId,
              cityId: current.originCityId,
              type: 'blockade_expired',
              title: 'Blockade ended',
              message: 'Your blockade ended and the fleet is returning.',
              payload: { blockadeId: current.id, movementId: movement.id },
            },
          }),
          inner.report.create({
            data: {
              worldId: current.worldId,
              playerId: current.defenderPlayerId,
              cityId: current.targetCityId,
              type: 'blockade_expired',
              title: 'Blockade lifted',
              message: 'The blockade on your city has ended.',
              payload: { blockadeId: current.id },
            },
          }),
        ]);
        return movement;
      };
      const result = tx ? await expireOne(tx) : await this.prisma.$transaction(async (innerTx) => expireOne(innerTx as Db));
      if (result) {
        expired += 1;
        await this.enqueueNavalReturn(result.id, result.returnArrivalTime);
      }
    }
    return expired;
  }

  private async getOwnedOriginCity(cityId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const city = await (this.prisma as Db).city.findUnique({
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
    const city = await (this.prisma as Db).city.findUnique({
      where: { id: cityId },
      include: { island: true, player: true },
    });
    if (!city || city.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Target city not found.', 'TARGET_CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (!city.island) {
      throw new ApiErrorException('Target city must be placed on the world map.', 'CITY_NOT_PLACED_ON_MAP', HttpStatus.CONFLICT);
    }
    return { ...city, island: city.island };
  }

  private async getEligibility(input: {
    attackerPlayerId: string;
    attackerCreatedAt: Date;
    originCity: any;
    targetCity: any;
    ships: NavalShips;
    availableShips?: NavalShips;
    requireShipsSelected?: boolean;
    tx?: Db;
  }): Promise<{ canAttack: boolean; reason?: string; cooldownEndsAt?: Date }> {
    const db = input.tx ?? (this.prisma as Db);
    if (!input.originCity.island || !input.targetCity.island) return { canAttack: false, reason: 'CITY_NOT_PLACED_ON_MAP' };
    if (input.originCity.id === input.targetCity.id) return { canAttack: false, reason: 'SAME_CITY_ATTACK_BLOCKED' };
    if (input.targetCity.playerId === input.attackerPlayerId) return { canAttack: false, reason: 'OWN_CITY_ATTACK_BLOCKED' };
    if (input.originCity.worldId !== input.targetCity.worldId) return { canAttack: false, reason: 'WORLD_MISMATCH' };
    if (this.hasBeginnerProtection(input.targetCity.player.createdAt)) return { canAttack: false, reason: 'TARGET_BEGINNER_PROTECTED' };
    if (this.hasBeginnerProtection(input.attackerCreatedAt)) return { canAttack: false, reason: 'ATTACKER_BEGINNER_PROTECTED' };

    const [attackerAlliance, targetAlliance, cooldown, repeatedAttackCount] = await Promise.all([
      db.allianceMember.findUnique({ where: { playerId: input.attackerPlayerId } }),
      db.allianceMember.findUnique({ where: { playerId: input.targetCity.playerId } }),
      db.navalCooldown.findUnique({
        where: { attackerPlayerId_targetCityId: { attackerPlayerId: input.attackerPlayerId, targetCityId: input.targetCity.id } },
      }),
      db.navalAttack.count({
        where: {
          attackerPlayerId: input.attackerPlayerId,
          targetCityId: input.targetCity.id,
          startedAt: { gte: new Date(Date.now() - NAVAL_CONFIG.repeatedAttackWindowSeconds * 1000) },
        },
      }),
    ]);
    if (attackerAlliance && targetAlliance && attackerAlliance.allianceId === targetAlliance.allianceId) {
      return { canAttack: false, reason: 'SAME_ALLIANCE_ATTACK_BLOCKED' };
    }
    if (cooldown?.cooldownEndsAt > new Date()) {
      return { canAttack: false, reason: 'ATTACK_COOLDOWN_ACTIVE', cooldownEndsAt: cooldown.cooldownEndsAt };
    }
    if (repeatedAttackCount >= NAVAL_CONFIG.repeatedAttackLimit) {
      return { canAttack: false, reason: 'REPEATED_ATTACK_PROTECTION_ACTIVE' };
    }
    if (input.requireShipsSelected !== false && calculateArmySize(input.ships) <= 0) return { canAttack: false, reason: 'NO_SHIPS_SELECTED' };
    if (input.availableShips && SHIP_TYPE_KEYS.some((shipType) => input.ships[shipType] > input.availableShips![shipType])) {
      return { canAttack: false, reason: 'NOT_ENOUGH_SHIPS' };
    }
    return { canAttack: true };
  }

  private hasBeginnerProtection(createdAt: Date): boolean {
    return Date.now() < createdAt.getTime() + NAVAL_CONFIG.beginnerProtectionDays * 24 * 60 * 60 * 1000;
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
        return 'Your naval attack cooldown is still active.';
      case 'REPEATED_ATTACK_PROTECTION_ACTIVE':
        return 'This city is protected from repeated naval attacks.';
      case 'NO_SHIPS_SELECTED':
        return 'Select at least one ship.';
      case 'NOT_ENOUGH_SHIPS':
        return 'You do not have enough available ships.';
      default:
        return 'Naval attack cannot be started.';
    }
  }

  private async logBlockedAttack(db: Db, input: Record<string, unknown>): Promise<void> {
    await db.gameAnalyticsEvent.create({
      data: {
        worldId: input.worldId,
        playerId: input.playerId,
        eventType: 'naval_attack_blocked',
        payload: input,
      },
    });
  }

  private async ensureFleet(db: Db, city: { id: string; worldId: string; playerId: string }) {
    const existing = await db.cityFleet.findUnique({ where: { cityId: city.id } });
    if (existing) return existing;
    const units = await db.cityUnit.findMany({ where: { cityId: city.id } });
    const ships = this.toShipsFromUnits(units);
    return db.cityFleet.create({
      data: {
        worldId: city.worldId,
        playerId: city.playerId,
        cityId: city.id,
        lightShip: ships.light_ship,
        ramShip: ships.ram_ship,
        fireShip: ships.fire_ship,
      },
    });
  }

  private normalizeShips(ships: Partial<Record<string, number>> | null | undefined): NavalShips {
    return Object.fromEntries(
      SHIP_TYPE_KEYS.map((shipType) => {
        const value = Number(ships?.[shipType] ?? 0);
        if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
          throw new ApiErrorException('Ships must be non-negative integers.', 'INVALID_NAVAL_SHIPS', HttpStatus.BAD_REQUEST);
        }
        return [shipType, value];
      }),
    ) as NavalShips;
  }

  private toShips(fleet: { lightShip?: number; ramShip?: number; fireShip?: number }): NavalShips {
    return {
      light_ship: Math.max(0, fleet.lightShip ?? 0),
      ram_ship: Math.max(0, fleet.ramShip ?? 0),
      fire_ship: Math.max(0, fleet.fireShip ?? 0),
    };
  }

  private toShipsFromUnits(units: Array<{ unitType: string; quantity: number }>): NavalShips {
    const ships = { ...EMPTY_SHIPS };
    for (const unit of units) {
      if (unit.unitType === 'light_ship' || unit.unitType === 'light_galley') ships.light_ship += Math.max(0, unit.quantity);
      if (unit.unitType === 'ram_ship' || unit.unitType === 'war_galley') ships.ram_ship += Math.max(0, unit.quantity);
      if (unit.unitType === 'fire_ship') ships.fire_ship += Math.max(0, unit.quantity);
    }
    return ships;
  }

  private getMovementPayload(payload: unknown): {
    navalAttackId?: string;
    blockadeId?: string | null;
    targetPlayerId?: string;
    targetPlayerName?: string;
    targetCityId?: string;
    targetCityName?: string;
    ships: NavalShips;
    loot: ResourceBalance;
    establishBlockade?: boolean;
    battle?: NavalBattleSummary;
    returnTravelTimeSeconds?: number;
  } {
    const parsed = (payload ?? {}) as Record<string, any>;
    return {
      ...parsed,
      ships: this.normalizeShips(parsed.ships),
      loot: this.toResources(parsed.loot ?? EMPTY_RESOURCES),
    };
  }

  private toBattleSummary(battle: any): NavalBattleSummary {
    return {
      attackerVictory: battle.attackerVictory,
      attackerPower: battle.attackerPower,
      defenderPower: battle.defenderPower,
      portDefenseBonus: battle.portDefenseBonus,
      shipyardDefenseBonus: battle.shipyardDefenseBonus,
      attackerShipsSent: this.normalizeShips(battle.attackerShipsSent),
      defenderShipsParticipated: this.normalizeShips(battle.defenderShipsParticipated),
      attackerShipsLost: this.normalizeShips(battle.attackerShipsLost),
      defenderShipsLost: this.normalizeShips(battle.defenderShipsLost),
      attackerShipsSurvived: this.normalizeShips(battle.attackerShipsSurvived),
      defenderShipsSurvived: this.normalizeShips(battle.defenderShipsSurvived),
      loot: this.toResources(battle.loot ?? EMPTY_RESOURCES),
      protectedResources: this.toResources(battle.protectedResources ?? EMPTY_RESOURCES),
      attackerLossRate: battle.attackerLossRate,
      defenderLossRate: battle.defenderLossRate,
    };
  }

  private toResources(resources: Partial<ResourceBalance> | null | undefined): ResourceBalance {
    return Object.fromEntries(
      RESOURCE_KEYS.map((resourceType) => [
        resourceType,
        Math.max(0, Math.floor(Number(resources?.[resourceType] ?? 0))),
      ]),
    ) as ResourceBalance;
  }

  private toMovementSummary(movement: {
    id: string;
    movementType: string;
    status: string;
    departureTime: Date;
    arrivalTime: Date;
    returnArrivalTime: Date | null;
    payload: unknown;
    originCity: { id: string; name: string };
    destinationCity: ({ id: string; name: string; player?: { name: string } } | null);
  }): NavalMovementSummary {
    const payload = this.getMovementPayload(movement.payload);
    const referenceTime = movement.status === 'returning' ? movement.returnArrivalTime : movement.arrivalTime;
    return {
      id: movement.id,
      movementType: movement.movementType,
      status: movement.status,
      originCity: { id: movement.originCity.id, name: movement.originCity.name },
      targetCity: movement.destinationCity
        ? { id: movement.destinationCity.id, name: movement.destinationCity.name, playerName: movement.destinationCity.player?.name ?? null }
        : { id: payload.targetCityId ?? '', name: payload.targetCityName ?? 'Target city', playerName: payload.targetPlayerName ?? null },
      ships: payload.ships,
      departureTime: movement.departureTime.toISOString(),
      arrivalTime: movement.arrivalTime.toISOString(),
      returnArrivalTime: movement.returnArrivalTime?.toISOString() ?? null,
      remainingSeconds: movement.status === 'completed' ? 0 : Math.max(0, Math.ceil(((referenceTime ?? new Date()).getTime() - Date.now()) / 1000)),
      loot: payload.loot,
      battle: payload.battle ?? null,
      blockadeId: payload.blockadeId ?? null,
    };
  }

  private toBlockadeSummary(blockade: any): CityBlockadeSummary {
    return {
      id: blockade.id,
      status: blockade.status,
      attackerPlayerId: blockade.attackerPlayerId,
      defenderPlayerId: blockade.defenderPlayerId,
      originCityId: blockade.originCityId,
      targetCityId: blockade.targetCityId,
      startedAt: blockade.startedAt.toISOString(),
      endsAt: blockade.endsAt.toISOString(),
      endedAt: blockade.endedAt?.toISOString() ?? null,
      committedShips: {
        light_ship: blockade.committedLightShip,
        ram_ship: blockade.committedRamShip,
        fire_ship: blockade.committedFireShip,
      },
      remainingSeconds: blockade.status === 'active' ? Math.max(0, Math.ceil((blockade.endsAt.getTime() - Date.now()) / 1000)) : 0,
    };
  }

  private toUnitDefinitionSummary(shipType: NavalShipType): UnitDefinitionSummary {
    const definition = UNIT_CONFIG[shipType as UnitType];
    return {
      type: shipType,
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

  private async grantResourceLoot(
    db: Db,
    input: {
      userId: string;
      playerId: string;
      cityId: string;
      sourceId: string;
      transactionSourceId: string;
      rewards: ResourceBalance;
    },
  ): Promise<void> {
    for (const resourceType of RESOURCE_KEYS) {
      const quantity = Math.max(0, Math.floor(input.rewards[resourceType] ?? 0));
      if (quantity <= 0) continue;
      const itemId = RESOURCE_LOOT_ITEM_IDS[resourceType];
      const item = await db.userInventoryItem.upsert({
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
          sourceType: 'naval',
          sourceId: input.sourceId,
          metadata: { movementId: input.transactionSourceId, resourceType },
        },
      });
      await db.inventoryTransaction.create({
        data: {
          userId: input.userId,
          playerId: input.playerId,
          itemId,
          transactionType: 'grant',
          quantity,
          balanceAfter: item.quantity,
          sourceType: 'naval',
          sourceId: input.transactionSourceId,
          targetType: 'city',
          targetId: input.cityId,
          metadata: { resourceType, movementId: input.transactionSourceId },
        },
      });
    }
  }

  private formatShipCounts(ships: NavalShips): string {
    const text = SHIP_TYPE_KEYS.filter((shipType) => ships[shipType] > 0)
      .map((shipType) => `${ships[shipType]} ${UNIT_CONFIG[shipType as UnitType].name}`)
      .join(', ');
    return text || 'none';
  }

  private formatResourceCounts(resources: Partial<ResourceBalance>): string {
    const text = RESOURCE_KEYS.filter((resourceType) => (resources[resourceType] ?? 0) > 0)
      .map((resourceType) => `${Math.floor(resources[resourceType] ?? 0)} ${resourceType}`)
      .join(', ');
    return text || 'no resources';
  }

  private async hasActiveBlockadeByAttacker(db: Db, attackerPlayerId: string, targetCityId: string): Promise<boolean> {
    const blockade = await db.cityBlockade.findFirst({
      where: { attackerPlayerId, targetCityId, status: 'active', endsAt: { gt: new Date() } },
      select: { id: true },
    });
    return Boolean(blockade);
  }

  private async getActiveBlockadeCount(db: Db, attackerPlayerId: string): Promise<number> {
    return db.cityBlockade.count({ where: { attackerPlayerId, status: 'active', endsAt: { gt: new Date() } } });
  }

  private async createBattleReports(db: Db, movement: any, battle: NavalBattleSummary, blockade: any): Promise<void> {
    const reports = [
      db.report.create({
        data: {
          worldId: movement.worldId,
          playerId: movement.playerId,
          cityId: movement.originCityId,
          type: battle.attackerVictory ? 'naval_attack_victory' : 'naval_attack_defeat',
          title: battle.attackerVictory ? 'Naval victory' : 'Naval defeat',
          message: blockade
            ? `Your fleet defeated ${movement.destinationCity.name}, lost ${this.formatShipCounts(battle.attackerShipsLost)}, seized ${this.formatResourceCounts(battle.loot)}, and established a blockade.`
            : battle.attackerVictory
              ? `Your fleet defeated ${movement.destinationCity.name}. Lost ${this.formatShipCounts(battle.attackerShipsLost)}. Loot: ${this.formatResourceCounts(battle.loot)}.`
              : `Your fleet was defeated at ${movement.destinationCity.name}. Lost ${this.formatShipCounts(battle.attackerShipsLost)}.`,
          payload: { movementId: movement.id, battle, blockadeId: blockade?.id ?? null },
        },
      }),
      db.report.create({
        data: {
          worldId: movement.worldId,
          playerId: movement.destinationCity.playerId,
          cityId: movement.destinationCity.id,
          type: battle.attackerVictory ? 'naval_defense_defeat' : 'naval_defense_victory',
          title: battle.attackerVictory ? 'Port defeated' : 'Port defended',
          message: blockade
            ? `${movement.originCity.name} defeated your port fleet, seized ${this.formatResourceCounts(battle.loot)}, and blockaded ${movement.destinationCity.name}.`
            : battle.attackerVictory
              ? `${movement.originCity.name} defeated your port fleet at ${movement.destinationCity.name} and seized ${this.formatResourceCounts(battle.loot)}.`
              : `${movement.destinationCity.name} defeated an incoming fleet from ${movement.originCity.name}.`,
          payload: { movementId: movement.id, battle, blockadeId: blockade?.id ?? null },
        },
      }),
    ];
    if (blockade) {
      reports.push(
        db.report.create({
          data: {
            worldId: movement.worldId,
            playerId: movement.playerId,
            cityId: movement.originCityId,
            type: 'blockade_started',
            title: 'Blockade established',
            message: `Your fleet is blockading ${movement.destinationCity.name}.`,
            payload: { movementId: movement.id, blockadeId: blockade.id, endsAt: blockade.endsAt.toISOString() },
          },
        }),
        db.report.create({
          data: {
            worldId: movement.worldId,
            playerId: movement.destinationCity.playerId,
            cityId: movement.destinationCity.id,
            type: 'blockade_started',
            title: 'City blockaded',
            message: `${movement.destinationCity.name} is under naval blockade.`,
            payload: { movementId: movement.id, blockadeId: blockade.id, endsAt: blockade.endsAt.toISOString() },
          },
        }),
      );
    }
    await Promise.all(reports);
  }

  private async enqueueNavalArrival(movementId: string, arrivalTime: Date): Promise<void> {
    await this.queue.add(NAVAL_ARRIVE_JOB, { movementId }, { delay: Math.max(0, arrivalTime.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 });
  }

  private async enqueueNavalReturn(movementId: string, returnArrivalTime: Date): Promise<void> {
    await this.queue.add(NAVAL_RETURN_JOB, { movementId }, { delay: Math.max(0, returnArrivalTime.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 });
  }

  private async enqueueBlockadeExpiry(blockadeId: string, endsAt: Date): Promise<void> {
    await this.queue.add(BLOCKADE_EXPIRE_JOB, { blockadeId }, { delay: Math.max(0, endsAt.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 });
  }
}
