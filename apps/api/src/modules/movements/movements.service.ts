import { HttpStatus, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BUILDING_TYPES, MAP_CONFIG, STORAGE_CONFIG, TRANSPORT_CONFIG } from '@island-empires/config';
import {
  calculateMapDistance,
  calculateShipCapacity,
  calculateShipsRequired,
  calculateStorageCapacity,
  calculateTradeShipCount,
  calculateTransportCapacity,
  calculateTransportLoad,
  calculateTransportTravelTimeSeconds,
  calculateTravelTimeSeconds,
  canStartTransport,
} from '@island-empires/game-engine';
import type {
  CityResourcesResponse,
  CancelTransportResponse,
  MovementSummary,
  ResourceBalance,
  StartTransportRequest,
  StartTransportResponse,
  TransportOptionsResponse,
  TransportPayload,
} from '@island-empires/shared-types';
import { Queue } from 'bullmq';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AntiAbuseService } from '../anti-abuse/anti-abuse.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { QuestsService } from '../quests/quests.service';
import { ResourcesService } from '../resources/resources.service';

const QUEUE_NAME = 'island-empires-default';
const TRANSPORT_ARRIVE_JOB = 'movement.transport.arrive';
const TRANSPORT_RETURN_JOB = 'movement.transport.return';
const RESOURCE_KEYS: Array<keyof ResourceBalance> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];

@Injectable()
export class MovementsService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly resourcesService: ResourcesService,
    private readonly questsService: QuestsService,
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

  async getPlayerMovements(): Promise<MovementSummary[]> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDueTransports();

    const movements = await this.prisma.movement.findMany({
      where: {
        playerId: bootstrap.player.id,
        movementType: TRANSPORT_CONFIG.movementType,
      },
      include: {
        originCity: true,
        destinationCity: { include: { island: true } },
      },
      orderBy: [{ status: 'asc' }, { arrivalTime: 'desc' }],
      take: 25,
    });

    return movements.map((movement) => this.toMovementSummary(movement));
  }

  async getTransportOptions(originCityId: string): Promise<TransportOptionsResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.resourcesService.recalculateResources(originCityId);
    await this.completeDueTransports();

    const originCity = await this.prisma.city.findUnique({
      where: { id: originCityId },
      include: { island: true, world: true },
    });

    if (!originCity || originCity.playerId !== bootstrap.player.id || originCity.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Origin city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    if (!originCity.island) {
      throw new ApiErrorException(
        'Origin city must be placed on the world map.',
        'CITY_NOT_PLACED_ON_MAP',
        HttpStatus.CONFLICT,
      );
    }

    const [originResources, port, destinationCities] = await Promise.all([
      this.prisma.cityResource.findUniqueOrThrow({ where: { cityId: originCity.id } }),
      this.prisma.cityBuilding.findUnique({
        where: { cityId_buildingType: { cityId: originCity.id, buildingType: BUILDING_TYPES.PORT } },
      }),
      this.prisma.city.findMany({
        where: {
          playerId: bootstrap.player.id,
          worldId: bootstrap.world.id,
          id: { not: originCity.id },
          islandId: { not: null },
        },
        include: { island: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const originPortLevel = port?.level ?? 0;
    const totalShips = calculateTradeShipCount({
      portLevel: originPortLevel,
      shipsPerPortLevel: TRANSPORT_CONFIG.shipsPerPortLevel,
    });
    const shipCapacity = calculateShipCapacity({ shipCapacity: TRANSPORT_CONFIG.shipCapacity });
    const activeMovements = await this.prisma.movement.findMany({
      where: {
        originCityId: originCity.id,
        movementType: TRANSPORT_CONFIG.movementType,
        status: { in: ['in_transit', 'returning'] },
      },
      select: { payload: true },
    });
    const shipsAway = activeMovements.reduce((sum, movement) => sum + this.getPayloadShipsUsed(movement.payload), 0);
    const availableShips = Math.max(0, totalShips - shipsAway);
    const availableCapacity = calculateTransportCapacity({ shipCount: availableShips, shipCapacity });

    return {
      originCityId: originCity.id,
      originCityName: originCity.name,
      originPortLevel,
      capacity: availableCapacity,
      totalShips,
      availableShips,
      shipCapacity,
      availableCapacity,
      resources: this.toResourcesResponse(originResources),
      destinations: destinationCities
        .filter((city) => city.island)
        .map((city) => {
          const distance = calculateMapDistance({
            from: { x: originCity.island!.x, y: originCity.island!.y },
            to: { x: city.island!.x, y: city.island!.y },
          });
          const normalTravelTimeSeconds = calculateTravelTimeSeconds({
            distance,
            baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
            worldSpeed: originCity.world.speedTravel,
          });

          return {
            cityId: city.id,
            cityName: city.name,
            islandId: city.island!.id,
            islandName: city.island!.name ?? 'Unknown island',
            distance,
            travelTimeSeconds: calculateTransportTravelTimeSeconds({
              normalTravelTimeSeconds,
              transportTravelMultiplier: TRANSPORT_CONFIG.travelTimeMultiplier,
              minTravelTimeSeconds: TRANSPORT_CONFIG.minTravelTimeSeconds,
            }),
          };
        }),
    };
  }

  async startResourceTransport(input: StartTransportRequest): Promise<StartTransportResponse> {
    return this.startTransport(input);
  }

  async startTransport(input: StartTransportRequest): Promise<StartTransportResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const payload = this.normalizePayload(input.resources);

    await this.resourcesService.recalculateResources(input.originCityId);
    await this.completeDueTransports();
    const frequency = await this.antiAbuseService.monitorAction({
      worldId: bootstrap.world.id,
      playerId: bootstrap.player.id,
      actionType: 'resource_transport_started',
      targetType: 'city',
      targetId: input.destinationCityId,
      payload,
    });
    if (!frequency.allowed) {
      throw new ApiErrorException('Too many actions. Please try again later.', 'RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const [originCity, destinationCity] = await Promise.all([
        tx.city.findUnique({
          where: { id: input.originCityId },
          include: { island: true, world: true },
        }),
        tx.city.findUnique({
          where: { id: input.destinationCityId },
          include: { island: true },
        }),
      ]);

      if (!originCity || originCity.playerId !== bootstrap.player.id || originCity.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Origin city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      if (
        !destinationCity ||
        destinationCity.playerId !== bootstrap.player.id ||
        destinationCity.worldId !== bootstrap.world.id
      ) {
        throw new ApiErrorException('Destination city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      if (!originCity.island || !destinationCity.island) {
        throw new ApiErrorException(
          'Both cities must be placed on the world map.',
          'CITY_NOT_PLACED_ON_MAP',
          HttpStatus.CONFLICT,
        );
      }
      await this.assertCitiesNotBlockaded(tx as any, [originCity.id, destinationCity.id]);

      const [originResources, port] = await Promise.all([
        tx.cityResource.findUniqueOrThrow({ where: { cityId: originCity.id } }),
        tx.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: originCity.id, buildingType: BUILDING_TYPES.PORT } },
        }),
      ]);

      const originPortLevel = port?.level ?? 0;
      const totalShips = calculateTradeShipCount({
        portLevel: originPortLevel,
        shipsPerPortLevel: TRANSPORT_CONFIG.shipsPerPortLevel,
      });
      const shipCapacity = calculateShipCapacity({ shipCapacity: TRANSPORT_CONFIG.shipCapacity });
      const activeShipMovements = await tx.movement.findMany({
        where: {
          originCityId: originCity.id,
          movementType: TRANSPORT_CONFIG.movementType,
          status: { in: ['in_transit', 'returning'] },
        },
        select: { payload: true },
      });
      const shipsAway = activeShipMovements.reduce(
        (sum, movement) => sum + this.getPayloadShipsUsed(movement.payload),
        0,
      );
      const availableShips = Math.max(0, totalShips - shipsAway);
      const availableCapacity = calculateTransportCapacity({ shipCount: availableShips, shipCapacity });
      const payloadTotal = calculateTransportLoad(payload);
      const shipsRequired = calculateShipsRequired({ totalLoad: payloadTotal, shipCapacity });
      const hasEnoughResources = RESOURCE_KEYS.every(
        (resourceType) => originResources[resourceType] >= payload[resourceType],
      );
      const transportState = canStartTransport({
        originPortLevel,
        originAndDestinationAreDifferent: originCity.id !== destinationCity.id,
        destinationBelongsToPlayer: destinationCity.playerId === originCity.playerId,
        hasAtLeastOneResource: payloadTotal > 0,
        totalLoad: payloadTotal,
        capacity: availableCapacity,
        hasEnoughResources,
        availableShips,
        shipsRequired,
      });

      if (!transportState.canStart) {
        throw new ApiErrorException(
          transportState.reason ?? 'Transport cannot be started.',
          'TRANSPORT_UNAVAILABLE',
          HttpStatus.BAD_REQUEST,
        );
      }

      const distance = calculateMapDistance({
        from: { x: originCity.island.x, y: originCity.island.y },
        to: { x: destinationCity.island.x, y: destinationCity.island.y },
      });
      const normalTravelTimeSeconds = calculateTravelTimeSeconds({
        distance,
        baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
        worldSpeed: originCity.world.speedTravel,
      });
      const travelTimeSeconds = calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds,
        transportTravelMultiplier: TRANSPORT_CONFIG.travelTimeMultiplier,
        minTravelTimeSeconds: TRANSPORT_CONFIG.minTravelTimeSeconds,
      });
      const departureTime = new Date();
      const arrivalTime = new Date(departureTime.getTime() + travelTimeSeconds * 1000);
      const returnTravelTimeSeconds = calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds,
        transportTravelMultiplier: TRANSPORT_CONFIG.returnTravelTimeMultiplier,
        minTravelTimeSeconds: TRANSPORT_CONFIG.minTravelTimeSeconds,
      });
      const returnArrivalTime = new Date(arrivalTime.getTime() + returnTravelTimeSeconds * 1000);

      const updatedResources = await tx.cityResource.update({
        where: { cityId: originCity.id },
        data: Object.fromEntries(
          RESOURCE_KEYS.map((resourceType) => [
            resourceType,
            originResources[resourceType] - payload[resourceType],
          ]),
        ),
      });

      const movement = await tx.movement.create({
        data: {
          worldId: originCity.worldId,
          playerId: originCity.playerId,
          originCityId: originCity.id,
          destinationCityId: destinationCity.id,
          destinationIslandId: destinationCity.islandId,
          destinationSlotIndex: destinationCity.slotIndex,
          movementType: TRANSPORT_CONFIG.movementType,
          status: 'in_transit',
          departureTime,
          arrivalTime,
          returnArrivalTime,
          payload: {
            resources: payload,
            capacityUsed: payloadTotal,
            capacityLimit: shipsRequired * shipCapacity,
            shipCapacity,
            shipsUsed: shipsRequired,
            travelTimeSeconds,
            returnTravelTimeSeconds,
          },
        },
        include: { originCity: true, destinationCity: { include: { island: true } } },
      });

      await Promise.all(
        RESOURCE_KEYS.filter((resourceType) => payload[resourceType] > 0).map((resourceType) =>
          tx.resourceTransaction.create({
            data: {
              worldId: originCity.worldId,
              cityId: originCity.id,
              playerId: originCity.playerId,
              transactionType: 'transport_sent',
              resourceType,
              amount: -payload[resourceType],
              balanceAfter: updatedResources[resourceType],
              referenceType: 'movement',
              referenceId: movement.id,
            },
          }),
        ),
      );
      await tx.gameAnalyticsEvent.create({
        data: {
          worldId: originCity.worldId,
          playerId: originCity.playerId,
          eventType: 'resource_transport_started',
          payload: {
            movementId: movement.id,
            originCityId: originCity.id,
            destinationCityId: destinationCity.id,
            resources: payload,
          },
        },
      });

      return {
        movement,
        resources: this.toResourcesResponse(updatedResources),
      };
    });

    await this.enqueueTransportArrival(result.movement.id, result.movement.arrivalTime);
    await this.questsService.handleQuestTrigger(bootstrap.player.id, 'resource_transport_started');

    return {
      movement: this.toMovementSummary(result.movement),
      resources: result.resources,
      originResources: result.resources,
    };
  }

  async completeDueTransports(): Promise<number> {
    const dueArrivals = await this.prisma.movement.findMany({
      where: {
        movementType: TRANSPORT_CONFIG.movementType,
        status: 'in_transit',
        arrivalTime: { lte: new Date() },
      },
      select: { id: true },
    });
    const dueReturns = await this.prisma.movement.findMany({
      where: {
        movementType: TRANSPORT_CONFIG.movementType,
        status: 'returning',
        returnArrivalTime: { lte: new Date() },
      },
      select: { id: true },
    });

    let completed = 0;
    for (const movement of dueArrivals) {
      if (await this.completeTransportArrival(movement.id)) completed += 1;
    }
    for (const movement of dueReturns) {
      if (await this.completeTransportReturn(movement.id)) completed += 1;
    }

    return completed;
  }

  async completeTransportArrival(movementId: string): Promise<boolean> {
    const movement = await this.prisma.movement.findUnique({ where: { id: movementId } });
    if (movement?.destinationCityId) {
      await this.resourcesService.recalculateResources(movement.destinationCityId);
    }

    const completed = await this.prisma.$transaction(async (tx) => {
      const dueMovement = await tx.movement.findUnique({
        where: { id: movementId },
        include: {
          originCity: true,
          destinationCity: { include: { island: true } },
        },
      });

      if (
        !dueMovement ||
        dueMovement.movementType !== TRANSPORT_CONFIG.movementType ||
        dueMovement.status !== 'in_transit' ||
        dueMovement.arrivalTime > new Date() ||
        !dueMovement.destinationCityId ||
        !dueMovement.destinationCity
      ) {
        return false;
      }
      const blockadeEndsAt = await this.getLatestActiveBlockadeEnd(tx as any, [
        dueMovement.originCityId,
        dueMovement.destinationCityId,
      ]);
      if (blockadeEndsAt) {
        await tx.movement.update({
          where: { id: dueMovement.id },
          data: { arrivalTime: blockadeEndsAt },
        });
        return false;
      }

      const updateResult = await tx.movement.updateMany({
        where: { id: dueMovement.id, status: 'in_transit' },
        data: { status: 'returning' },
      });

      if (updateResult.count === 0) {
        return false;
      }

      const resources = this.getPayloadResources(dueMovement.payload);
      const destinationResources = await tx.cityResource.findUniqueOrThrow({
        where: { cityId: dueMovement.destinationCityId },
      });
      const warehouse = await tx.cityBuilding.findUnique({
        where: {
          cityId_buildingType: {
            cityId: dueMovement.destinationCityId,
            buildingType: BUILDING_TYPES.WAREHOUSE,
          },
        },
      });
      const storageCapacity = calculateStorageCapacity({
        baseStorage: STORAGE_CONFIG.baseStorage,
        warehouseLevel: warehouse?.level ?? 0,
        storagePerWarehouseLevel: STORAGE_CONFIG.storagePerWarehouseLevel,
      });
      const delivered = {} as TransportPayload;
      const lost = {} as TransportPayload;

      for (const resourceType of RESOURCE_KEYS) {
        const availableSpace = Math.max(0, storageCapacity - destinationResources[resourceType]);
        delivered[resourceType] = Math.min(resources[resourceType], availableSpace);
        lost[resourceType] = resources[resourceType] - delivered[resourceType];
      }

      const updatedDestination = await tx.cityResource.update({
        where: { cityId: dueMovement.destinationCityId },
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
              worldId: dueMovement.worldId,
              cityId: dueMovement.destinationCityId as string,
              playerId: dueMovement.playerId,
              transactionType: 'transport_received',
              resourceType,
              amount: delivered[resourceType],
              balanceAfter: updatedDestination[resourceType],
              referenceType: 'movement',
              referenceId: dueMovement.id,
            },
          }),
        ),
      );

      await tx.report.create({
        data: {
          worldId: dueMovement.worldId,
          playerId: dueMovement.playerId,
          cityId: dueMovement.destinationCityId,
          type: 'transport_arrived',
          title: 'Transport arrived',
          message: `Resources from ${dueMovement.originCity.name} arrived in ${dueMovement.destinationCity.name}.`,
          payload: {
            movementId: dueMovement.id,
            resourcesDelivered: delivered,
            resourcesLost: lost,
          },
        },
      });

      return true;
    });

    if (completed && movement) {
      if (movement.returnArrivalTime) {
        await this.enqueueTransportReturn(movement.id, movement.returnArrivalTime);
      }
      await this.questsService.handleQuestTrigger(movement.playerId, 'resource_transport_completed');
    }

    return completed;
  }

  async completeTransportReturn(movementId: string): Promise<boolean> {
    const updateResult = await this.prisma.movement.updateMany({
      where: {
        id: movementId,
        movementType: TRANSPORT_CONFIG.movementType,
        status: 'returning',
        returnArrivalTime: { lte: new Date() },
      },
      data: { status: 'completed', completedAt: new Date() },
    });

    return updateResult.count > 0;
  }

  async cancelTransport(movementId: string): Promise<CancelTransportResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDueTransports();

    const movement = await this.prisma.movement.findUnique({ where: { id: movementId } });
    if (movement?.originCityId) {
      await this.resourcesService.recalculateResources(movement.originCityId);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const cancellable = await tx.movement.findUnique({
        where: { id: movementId },
        include: {
          originCity: true,
          destinationCity: { include: { island: true } },
        },
      });

      if (
        !cancellable ||
        cancellable.playerId !== bootstrap.player.id ||
        cancellable.movementType !== TRANSPORT_CONFIG.movementType
      ) {
        throw new ApiErrorException('Transport not found.', 'TRANSPORT_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      if (cancellable.status !== 'in_transit') {
        throw new ApiErrorException(
          'Only outbound transports can be cancelled.',
          'TRANSPORT_CANNOT_BE_CANCELLED',
          HttpStatus.BAD_REQUEST,
        );
      }

      const updateResult = await tx.movement.updateMany({
        where: { id: cancellable.id, status: 'in_transit' },
        data: { status: 'cancelled', completedAt: new Date() },
      });
      if (updateResult.count === 0) {
        throw new ApiErrorException(
          'Transport cannot be updated from the current state.',
          'INVALID_TRANSPORT_STATE',
          HttpStatus.CONFLICT,
        );
      }

      const resources = this.getPayloadResources(cancellable.payload);
      const originResources = await tx.cityResource.findUniqueOrThrow({
        where: { cityId: cancellable.originCityId },
      });
      const warehouse = await tx.cityBuilding.findUnique({
        where: {
          cityId_buildingType: {
            cityId: cancellable.originCityId,
            buildingType: BUILDING_TYPES.WAREHOUSE,
          },
        },
      });
      const storageCapacity = calculateStorageCapacity({
        baseStorage: STORAGE_CONFIG.baseStorage,
        warehouseLevel: warehouse?.level ?? 0,
        storagePerWarehouseLevel: STORAGE_CONFIG.storagePerWarehouseLevel,
      });
      const refunded = {} as TransportPayload;
      const lost = {} as TransportPayload;

      for (const resourceType of RESOURCE_KEYS) {
        const availableSpace = Math.max(0, storageCapacity - originResources[resourceType]);
        refunded[resourceType] = Math.min(resources[resourceType], availableSpace);
        lost[resourceType] = resources[resourceType] - refunded[resourceType];
      }

      const updatedResources = await tx.cityResource.update({
        where: { cityId: cancellable.originCityId },
        data: Object.fromEntries(
          RESOURCE_KEYS.map((resourceType) => [
            resourceType,
            originResources[resourceType] + refunded[resourceType],
          ]),
        ),
      });

      await Promise.all(
        RESOURCE_KEYS.filter((resourceType) => refunded[resourceType] > 0).map((resourceType) =>
          tx.resourceTransaction.create({
            data: {
              worldId: cancellable.worldId,
              cityId: cancellable.originCityId,
              playerId: cancellable.playerId,
              transactionType: 'transport_cancel_refund',
              resourceType,
              amount: refunded[resourceType],
              balanceAfter: updatedResources[resourceType],
              referenceType: 'movement',
              referenceId: cancellable.id,
            },
          }),
        ),
      );

      await tx.report.create({
        data: {
          worldId: cancellable.worldId,
          playerId: cancellable.playerId,
          cityId: cancellable.originCityId,
          type: 'transport_cancelled',
          title: 'Transport cancelled',
          message: `Transport from ${cancellable.originCity.name} was cancelled before arrival.`,
          payload: {
            movementId: cancellable.id,
            resourcesRefunded: refunded,
            resourcesLost: lost,
          },
        },
      });

      const updatedMovement = await tx.movement.findUniqueOrThrow({
        where: { id: cancellable.id },
        include: { originCity: true, destinationCity: { include: { island: true } } },
      });

      return {
        movement: updatedMovement,
        resources: this.toResourcesResponse(updatedResources),
      };
    });

    return {
      movement: this.toMovementSummary(result.movement),
      resources: result.resources,
    };
  }

  private normalizePayload(payload: TransportPayload): TransportPayload {
    return Object.fromEntries(
      RESOURCE_KEYS.map((resourceType) => {
        const value = Number(payload?.[resourceType] ?? 0);
        if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
          throw new ApiErrorException(
            'Transport resources must be non-negative integers.',
            'INVALID_TRANSPORT_RESOURCES',
            HttpStatus.BAD_REQUEST,
          );
        }

        return [resourceType, value];
      }),
    ) as TransportPayload;
  }

  private getPayloadResources(payload: unknown): TransportPayload {
    const parsed = payload as { resources?: Partial<TransportPayload> } | null;
    return Object.fromEntries(
      RESOURCE_KEYS.map((resourceType) => [
        resourceType,
        Math.max(0, Math.floor(Number(parsed?.resources?.[resourceType] ?? 0))),
      ]),
    ) as TransportPayload;
  }

  private getMovementPayload(payload: unknown): MovementSummary['payload'] {
    const parsed = payload as {
      capacityUsed?: number;
      capacityLimit?: number;
      shipCapacity?: number;
      shipsUsed?: number;
      travelTimeSeconds?: number;
    } | null;
    const resources = this.getPayloadResources(payload);

    return {
      resources,
      capacityUsed: Math.max(0, Math.floor(Number(parsed?.capacityUsed ?? calculateTransportLoad(resources)))),
      capacityLimit: Math.max(0, Math.floor(Number(parsed?.capacityLimit ?? 0))),
      shipCapacity: Math.max(0, Math.floor(Number(parsed?.shipCapacity ?? 0))),
      shipsUsed: Math.max(0, Math.floor(Number(parsed?.shipsUsed ?? 0))),
      travelTimeSeconds: Math.max(0, Math.floor(Number(parsed?.travelTimeSeconds ?? 0))),
    };
  }

  private getPayloadShipsUsed(payload: unknown): number {
    const parsed = payload as { shipsUsed?: number } | null;
    return Math.max(0, Math.floor(Number(parsed?.shipsUsed ?? 0)));
  }

  private async assertCitiesNotBlockaded(db: any, cityIds: string[]): Promise<void> {
    const blockade = await db.cityBlockade.findFirst({
      where: {
        targetCityId: { in: cityIds },
        status: 'active',
        endsAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (blockade) {
      throw new ApiErrorException('This city is currently blockaded.', 'CITY_BLOCKADED', HttpStatus.CONFLICT);
    }
  }

  private async getLatestActiveBlockadeEnd(db: any, cityIds: string[]): Promise<Date | null> {
    const blockades = await db.cityBlockade.findMany({
      where: {
        targetCityId: { in: cityIds },
        status: 'active',
        endsAt: { gt: new Date() },
      },
      select: { endsAt: true },
      orderBy: { endsAt: 'desc' },
      take: 1,
    });
    return blockades[0]?.endsAt ?? null;
  }

  private async enqueueTransportArrival(movementId: string, arrivalTime: Date): Promise<void> {
    await this.queue.add(
      TRANSPORT_ARRIVE_JOB,
      { movementId },
      { delay: Math.max(0, arrivalTime.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 },
    );
  }

  private async enqueueTransportReturn(movementId: string, returnArrivalTime: Date): Promise<void> {
    await this.queue.add(
      TRANSPORT_RETURN_JOB,
      { movementId },
      { delay: Math.max(0, returnArrivalTime.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 },
    );
  }

  private toMovementSummary(movement: {
    id: string;
    movementType: string;
    status: string;
    departureTime: Date;
    arrivalTime: Date;
    returnArrivalTime?: Date | null;
    payload: unknown;
    originCity: { id: string; name: string };
    destinationCity: { id: string; name: string; island?: { id: string; name: string | null } | null; slotIndex?: number | null } | null;
  }): MovementSummary {
    return {
      id: movement.id,
      movementType: movement.movementType,
      status: movement.status,
      originCity: {
        id: movement.originCity.id,
        name: movement.originCity.name,
      },
      destinationCity: movement.destinationCity
        ? {
            id: movement.destinationCity.id,
            name: movement.destinationCity.name,
          }
        : null,
      destination: movement.destinationCity
        ? {
            cityId: movement.destinationCity.id,
            cityName: movement.destinationCity.name,
            islandId: movement.destinationCity.island?.id,
            islandName: movement.destinationCity.island?.name ?? undefined,
            slotIndex: movement.destinationCity.slotIndex,
          }
        : null,
      departureTime: movement.departureTime.toISOString(),
      arrivalTime: movement.arrivalTime.toISOString(),
      returnArrivalTime: movement.returnArrivalTime?.toISOString() ?? null,
      remainingSeconds: Math.max(
        0,
        Math.ceil(
          (((movement.status === 'returning' ? movement.returnArrivalTime : movement.arrivalTime)?.getTime() ??
            Date.now()) -
            Date.now()) /
            1000,
        ),
      ),
      payload: this.getMovementPayload(movement.payload),
    };
  }

  private toResourcesResponse(resource: {
    wood: number;
    gold: number;
    marble: number;
    wine: number;
    crystal: number;
    sulfur: number;
    lastCalculatedAt: Date;
  }): CityResourcesResponse {
    return {
      wood: resource.wood,
      gold: resource.gold,
      marble: resource.marble,
      wine: resource.wine,
      crystal: resource.crystal,
      sulfur: resource.sulfur,
      lastCalculatedAt: resource.lastCalculatedAt.toISOString(),
    };
  }
}
