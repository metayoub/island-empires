import { HttpStatus, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  BUILDING_CONFIG,
  BUILDING_TYPES,
  MAP_CONFIG,
  SPY_CONFIG,
  SPY_MISSION_TYPES,
  type SpyMissionType,
} from '@island-empires/config';
import {
  calculateMapDistance,
  calculateSpyDetectionChance,
  calculateSpySuccessChance,
  calculateSpyTrainingCost,
  calculateSpyTravelTimeSeconds,
  calculateTravelTimeSeconds,
  canStartSpyMission,
  generateSpyReport,
} from '@island-empires/game-engine';
import type {
  ResourceBalance,
  SpyMissionListResponse,
  SpyMissionOptionsResponse,
  SpyMissionSummary,
  SpyOverviewResponse,
  StartSpyMissionRequest,
  StartSpyMissionResponse,
  TrainSpiesRequest,
  TrainSpiesResponse,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesService } from '../resources/resources.service';

const QUEUE_NAME = 'island-empires-default';
const SPY_TRAINING_COMPLETE_JOB = 'spy.training.complete';
const SPY_MISSION_ARRIVE_JOB = 'movement.spy.arrive';
const SPY_RETURN_JOB = 'movement.spy.return';
const RESOURCE_KEYS: Array<keyof ResourceBalance> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];
const MISSION_TYPES = Object.values(SPY_MISSION_TYPES) as SpyMissionType[];

type Db = Record<string, any>;

@Injectable()
export class ScoutingService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly analyticsService: AnalyticsService | undefined,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly resourcesService: ResourcesService,
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

  async getSpyOverview(cityId: string): Promise<SpyOverviewResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDueSpyTraining(cityId);

    const city = await this.db().city.findUnique({
      where: { id: cityId },
      include: { buildings: true },
    });
    if (!city || city.playerId !== bootstrap.player.id || city.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const spyState = await this.ensureCitySpyState(city);
    const trainingQueue = await this.db().spyTrainingJob.findMany({
      where: { cityId, status: 'training' },
      orderBy: { finishesAt: 'asc' },
    });
    const spyAgency = city.buildings.find((building: any) => building.buildingType === BUILDING_TYPES.SPY_AGENCY);

    return {
      city: {
        id: city.id,
        name: city.name,
        spyAgencyLevel: spyAgency?.level ?? 0,
      },
      spies: {
        available: spyState.spies,
        training: trainingQueue.reduce((sum: number, job: any) => sum + job.quantity, 0),
      },
      trainingQueue: trainingQueue.map((job: any) => this.toTrainingJobSummary(job)),
      unit: {
        cost: { ...SPY_CONFIG.unit.cost },
        trainingTimeSeconds: SPY_CONFIG.unit.trainingTimeSeconds,
      },
    };
  }

  async trainSpies(cityId: string, input: TrainSpiesRequest): Promise<TrainSpiesResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const quantity = Math.floor(Number(input.quantity));
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new ApiErrorException('Invalid spy quantity.', 'INVALID_SPY_QUANTITY', HttpStatus.BAD_REQUEST);
    }

    await this.completeDueSpyTraining(cityId);
    await this.resourcesService.recalculateResources(cityId);

    const result = await this.db().$transaction(async (tx: Db) => {
      const city = await tx.city.findUnique({
        where: { id: cityId },
        include: { world: true },
      });
      if (!city || city.playerId !== bootstrap.player.id || city.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      const spyAgency = await tx.cityBuilding.findUnique({
        where: { cityId_buildingType: { cityId, buildingType: BUILDING_TYPES.SPY_AGENCY } },
      });
      if (!spyAgency || spyAgency.level < 1) {
        throw new ApiErrorException(
          'Build the Spy Agency to level 1 before training spies.',
          'SPY_AGENCY_REQUIRED',
          HttpStatus.BAD_REQUEST,
        );
      }

      const activeJob = await tx.spyTrainingJob.findFirst({ where: { cityId, status: 'training' } });
      if (activeJob) {
        throw new ApiErrorException(
          'This city already has spies in training.',
          'SPY_TRAINING_QUEUE_BUSY',
          HttpStatus.CONFLICT,
        );
      }

      const resources = await tx.cityResource.findUniqueOrThrow({ where: { cityId } });
      const cost = calculateSpyTrainingCost({ quantity });
      if (!RESOURCE_KEYS.every((resourceType) => resources[resourceType] >= cost[resourceType])) {
        throw new ApiErrorException('Not enough resources.', 'INSUFFICIENT_RESOURCES', HttpStatus.BAD_REQUEST);
      }

      const startedAt = new Date();
      const durationSeconds = Math.ceil((SPY_CONFIG.unit.trainingTimeSeconds * quantity) / city.world.speedBuilding);
      const finishesAt = new Date(startedAt.getTime() + durationSeconds * 1000);
      const updatedResources = await tx.cityResource.update({
        where: { cityId },
        data: Object.fromEntries(
          RESOURCE_KEYS.map((resourceType) => [resourceType, resources[resourceType] - cost[resourceType]]),
        ),
      });

      const job = await tx.spyTrainingJob.create({
        data: {
          worldId: city.worldId,
          playerId: city.playerId,
          cityId: city.id,
          quantity,
          status: 'training',
          startedAt,
          finishesAt,
        },
      });

      await Promise.all(
        RESOURCE_KEYS.filter((resourceType) => cost[resourceType] > 0).map((resourceType) =>
          tx.resourceTransaction.create({
            data: {
              worldId: city.worldId,
              cityId: city.id,
              playerId: city.playerId,
              transactionType: 'spy_training_cost',
              resourceType,
              amount: -cost[resourceType],
              balanceAfter: updatedResources[resourceType],
              referenceType: 'spy_training_job',
              referenceId: job.id,
            },
          }),
        ),
      );

      await tx.citySpyState.upsert({
        where: { cityId: city.id },
        create: { worldId: city.worldId, playerId: city.playerId, cityId: city.id, spies: 0 },
        update: {},
      });

      return job;
    });

    await this.enqueue(SPY_TRAINING_COMPLETE_JOB, { spyTrainingJobId: result.id }, result.finishesAt);
    await this.analyticsService?.track({
      worldId: result.worldId,
      playerId: result.playerId,
      eventType: 'spy_training_started',
      payload: { cityId, spyTrainingJobId: result.id, quantity, finishesAt: result.finishesAt.toISOString() },
    });

    return {
      trainingJob: {
        id: result.id,
        quantity: result.quantity,
        status: result.status,
        finishesAt: result.finishesAt.toISOString(),
      },
    };
  }

  async getMissionOptions(input: {
    originCityId: string;
    targetCityId: string;
  }): Promise<SpyMissionOptionsResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDueSpyMissions();

    const context = await this.getMissionContext(bootstrap, input.originCityId, input.targetCityId);
    const cooldownActive = Boolean(context.cooldown && context.cooldown.cooldownEndsAt > new Date());
    const validation = canStartSpyMission({
      originHasSpyAgency: context.originSpyAgencyLevel >= 1,
      originSpyCount: context.originSpyState.spies,
      targetIsOwnedByAnotherPlayer: context.targetCity.playerId !== context.originCity.playerId,
      targetHasBeginnerProtection: context.beginnerProtectionActive,
      cooldownActive,
    });

    return {
      originCity: {
        id: context.originCity.id,
        name: context.originCity.name,
        spyAgencyLevel: context.originSpyAgencyLevel,
        availableSpies: context.originSpyState.spies,
      },
      targetCity: {
        id: context.targetCity.id,
        name: context.targetCity.name,
        playerName: context.targetCity.player.name,
        beginnerProtectionActive: context.beginnerProtectionActive,
      },
      missions: MISSION_TYPES.map((missionType) => ({
        missionType,
        successChance: context.successChance,
        detectionChance: context.detectionChance,
        travelTimeSeconds: context.travelTimeSeconds,
        cooldownActive,
        canStart: validation.canStart,
        disabledReason: validation.reason ?? null,
      })),
    };
  }

  async startMission(input: StartSpyMissionRequest): Promise<StartSpyMissionResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const missionType = input.missionType as SpyMissionType;
    if (!MISSION_TYPES.includes(missionType)) {
      throw new ApiErrorException('Invalid spy mission type.', 'INVALID_SPY_MISSION_TYPE', HttpStatus.BAD_REQUEST);
    }

    await this.completeDueSpyMissions();

    const result = await this.db().$transaction(async (tx: Db) => {
      const context = await this.getMissionContext(
        bootstrap,
        input.originCityId,
        input.targetCityId,
        tx,
      );
      const cooldownActive = Boolean(context.cooldown && context.cooldown.cooldownEndsAt > new Date());
      const validation = canStartSpyMission({
        originHasSpyAgency: context.originSpyAgencyLevel >= 1,
        originSpyCount: context.originSpyState.spies,
        targetIsOwnedByAnotherPlayer: context.targetCity.playerId !== context.originCity.playerId,
        targetHasBeginnerProtection: context.beginnerProtectionActive,
        cooldownActive,
      });
      if (!validation.canStart) {
        throw this.toSpyValidationError(validation.reason ?? 'Spy mission cannot be started.');
      }

      const departureTime = new Date();
      const arrivalTime = new Date(departureTime.getTime() + context.travelTimeSeconds * 1000);
      const cooldownEndsAt = new Date(
        departureTime.getTime() + SPY_CONFIG.missionCooldownMinutes * 60 * 1000,
      );
      const cooldownKey = `${context.originCity.playerId}:${context.targetCity.id}`;

      await tx.citySpyState.update({
        where: { cityId: context.originCity.id },
        data: { spies: { decrement: 1 } },
      });

      const movement = await tx.movement.create({
        data: {
          worldId: context.originCity.worldId,
          playerId: context.originCity.playerId,
          originCityId: context.originCity.id,
          destinationCityId: context.targetCity.id,
          destinationIslandId: context.targetCity.islandId,
          destinationSlotIndex: context.targetCity.slotIndex,
          movementType: 'spy_mission',
          status: 'in_transit',
          departureTime,
          arrivalTime,
          payload: {
            missionType,
            originCityId: context.originCity.id,
            targetCityId: context.targetCity.id,
            spyCount: 1,
            travelTimeSeconds: context.travelTimeSeconds,
          },
        },
      });

      const mission = await tx.spyMission.create({
        data: {
          worldId: context.originCity.worldId,
          attackerPlayerId: context.originCity.playerId,
          originCityId: context.originCity.id,
          targetPlayerId: context.targetCity.playerId,
          targetCityId: context.targetCity.id,
          missionType,
          status: 'in_transit',
          movementId: movement.id,
          successChance: context.successChance,
          detectionChance: context.detectionChance,
          cooldownKey,
          startedAt: departureTime,
        },
      });

      await tx.movement.update({
        where: { id: movement.id },
        data: { payload: { ...(movement.payload as Record<string, unknown>), missionId: mission.id } },
      });

      await tx.spyCooldown.upsert({
        where: {
          attackerPlayerId_targetCityId: {
            attackerPlayerId: context.originCity.playerId,
            targetCityId: context.targetCity.id,
          },
        },
        create: {
          worldId: context.originCity.worldId,
          attackerPlayerId: context.originCity.playerId,
          targetCityId: context.targetCity.id,
          cooldownEndsAt,
        },
        update: { cooldownEndsAt },
      });

      return { mission, movement };
    });

    await this.enqueue(SPY_MISSION_ARRIVE_JOB, { movementId: result.movement.id }, result.movement.arrivalTime);
    await this.analyticsService?.track({
      worldId: result.mission.worldId,
      playerId: result.mission.attackerPlayerId,
      eventType: 'spy_mission_started',
      payload: {
        missionId: result.mission.id,
        movementId: result.movement.id,
        originCityId: result.mission.originCityId,
        targetCityId: result.mission.targetCityId,
        missionType: result.mission.missionType,
      },
    });

    return {
      mission: this.toMissionSummary(result.mission, result.movement),
    };
  }

  async getMyMissions(): Promise<SpyMissionListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDueSpyMissions();

    const missions = await this.db().spyMission.findMany({
      where: { attackerPlayerId: bootstrap.player.id },
      include: {
        originCity: true,
        targetCity: true,
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });

    const movementIds = missions.map((mission: any) => mission.returnMovementId ?? mission.movementId).filter(Boolean);
    const movements = await this.db().movement.findMany({
      where: { id: { in: movementIds } },
    });
    const movementById = new Map(movements.map((movement: any) => [movement.id, movement]));

    return {
      missions: missions.map((mission: any) =>
        this.toMissionSummary(mission, movementById.get(mission.returnMovementId ?? mission.movementId)),
      ),
    };
  }

  async shareReportWithAlliance(reportId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const report = await this.db().report.findUnique({ where: { id: reportId } });
    if (
      !report ||
      report.worldId !== bootstrap.world.id ||
      report.playerId !== bootstrap.player.id ||
      report.type !== 'spy_report'
    ) {
      throw new ApiErrorException('Spy report not found.', 'SPY_REPORT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const membership = await this.db().allianceMember.findUnique({
      where: { playerId: bootstrap.player.id },
      include: { alliance: true, player: true },
    });
    if (!membership || membership.alliance.status !== 'active') {
      throw new ApiErrorException(
        'Join an alliance before sharing spy reports.',
        'ALLIANCE_MEMBERSHIP_REQUIRED',
        HttpStatus.FORBIDDEN,
      );
    }

    const payload = (report.payload ?? {}) as Record<string, unknown>;
    await this.db().allianceActivityEntry.create({
      data: {
        worldId: report.worldId,
        allianceId: membership.allianceId,
        playerId: bootstrap.player.id,
        type: 'spy_report_shared',
        message: `${membership.player.name} shared a spy report about ${payload.targetCityName ?? 'a city'}.`,
        payload: {
          sensitive: true,
          reportId: report.id,
          title: report.title,
          message: report.message,
          reportPayload: payload,
        },
      },
    });

    return { success: true };
  }

  async completeDueSpyTraining(cityId?: string): Promise<number> {
    const dueJobs = await this.db().spyTrainingJob.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        status: 'training',
        finishesAt: { lte: new Date() },
      },
      select: { id: true },
    });

    let completed = 0;
    for (const job of dueJobs) {
      if (await this.completeSpyTrainingJob(job.id)) completed += 1;
    }

    return completed;
  }

  async completeSpyTrainingJob(jobId: string): Promise<boolean> {
    return this.db().$transaction(async (tx: Db) => {
      const job = await tx.spyTrainingJob.findUnique({
        where: { id: jobId },
        include: { city: true },
      });
      if (!job || job.status !== 'training' || job.finishesAt > new Date()) {
        return false;
      }

      const updateResult = await tx.spyTrainingJob.updateMany({
        where: { id: job.id, status: 'training' },
        data: { status: 'completed', completedAt: new Date() },
      });
      if (updateResult.count === 0) return false;

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
      await tx.gameAnalyticsEvent?.create({
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

  async completeDueSpyMissions(): Promise<number> {
    const now = new Date();
    const dueArrivals = await this.db().movement.findMany({
      where: { movementType: 'spy_mission', status: 'in_transit', arrivalTime: { lte: now } },
      select: { id: true },
    });
    const dueReturns = await this.db().movement.findMany({
      where: { movementType: 'spy_return', status: 'returning', arrivalTime: { lte: now } },
      select: { id: true },
    });

    let completed = 0;
    for (const movement of dueArrivals) {
      if (await this.completeSpyMissionArrival(movement.id)) completed += 1;
    }
    for (const movement of dueReturns) {
      if (await this.completeSpyReturn(movement.id)) completed += 1;
    }

    return completed;
  }

  async completeSpyMissionArrival(movementId: string): Promise<boolean> {
    const result = await this.db().$transaction(async (tx: Db) => {
      const movement = await tx.movement.findUnique({
        where: { id: movementId },
        include: {
          originCity: true,
          destinationCity: { include: { player: true, resources: true, buildings: true, units: true } },
        },
      });
      if (
        !movement ||
        movement.movementType !== 'spy_mission' ||
        movement.status !== 'in_transit' ||
        movement.arrivalTime > new Date() ||
        !movement.destinationCity
      ) {
        return { completed: false };
      }

      const mission = await tx.spyMission.findFirst({
        where: { movementId: movement.id, status: 'in_transit' },
      });
      if (!mission) return { completed: false };

      const wasSuccessful = Math.random() < mission.successChance;
      const wasDetected = Math.random() < mission.detectionChance;
      const spyLost = wasDetected && Math.random() < 0.5;
      const defenderSpyState = await tx.citySpyState.findUnique({
        where: { cityId: movement.destinationCity.id },
      });
      const buildings = movement.destinationCity.buildings.map((building: any) => ({
        buildingType: building.buildingType,
        name: BUILDING_CONFIG[building.buildingType as keyof typeof BUILDING_CONFIG]?.name ?? building.buildingType,
        level: building.level,
      }));
      const report = generateSpyReport({
        missionType: mission.missionType,
        targetCityName: movement.destinationCity.name,
        wasSuccessful,
        wasDetected,
        spyLost,
        resources: movement.destinationCity.resources ?? undefined,
        units: Object.fromEntries(
          movement.destinationCity.units.map((unit: any) => [unit.unitType, unit.quantity]),
        ),
        buildings,
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
        const travelTimeSeconds = Number((movement.payload as any)?.travelTimeSeconds ?? 60);
        const returnArrivalTime = new Date(Date.now() + travelTimeSeconds * 1000);
        returnMovement = await tx.movement.create({
          data: {
            worldId: mission.worldId,
            playerId: mission.attackerPlayerId,
            originCityId: mission.originCityId,
            destinationCityId: mission.targetCityId,
            destinationIslandId: movement.destinationIslandId,
            destinationSlotIndex: movement.destinationSlotIndex,
            movementType: 'spy_return',
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
      await tx.gameAnalyticsEvent?.create({
        data: {
          worldId: mission.worldId,
          playerId: mission.attackerPlayerId,
          eventType: 'spy_mission_resolved',
          payload: { missionId: mission.id, wasSuccessful, wasDetected, spyLost },
        },
      });

      return { completed: true, returnMovement };
    });

    if (result.completed && result.returnMovement) {
      await this.enqueue(SPY_RETURN_JOB, { movementId: result.returnMovement.id }, result.returnMovement.arrivalTime);
    }

    return result.completed;
  }

  async completeSpyReturn(movementId: string): Promise<boolean> {
    return this.db().$transaction(async (tx: Db) => {
      const movement = await tx.movement.findUnique({ where: { id: movementId } });
      if (
        !movement ||
        movement.movementType !== 'spy_return' ||
        movement.status !== 'returning' ||
        movement.arrivalTime > new Date()
      ) {
        return false;
      }

      const missionId = (movement.payload as any)?.missionId;
      const updateResult = await tx.movement.updateMany({
        where: { id: movement.id, status: 'returning' },
        data: { status: 'completed', completedAt: new Date() },
      });
      if (updateResult.count === 0) return false;

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
      if (missionId) {
        await tx.spyMission.updateMany({
          where: { id: missionId, status: 'returning' },
          data: { status: 'completed', completedAt: new Date() },
        });
      }

      return true;
    });
  }

  private async getMissionContext(
    bootstrap: { player: { id: string }; world: { id: string } },
    originCityId: string,
    targetCityId: string,
    client: Db = this.db(),
  ) {
    const [originCity, targetCity] = await Promise.all([
      client.city.findUnique({
        where: { id: originCityId },
        include: { island: true, world: true },
      }),
      client.city.findUnique({
        where: { id: targetCityId },
        include: { island: true, player: true },
      }),
    ]);

    if (!originCity || originCity.playerId !== bootstrap.player.id || originCity.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Origin city not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (!targetCity || targetCity.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Target city not found.', 'TARGET_CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (!originCity.island || !targetCity.island) {
      throw new ApiErrorException(
        'Both cities must be placed on the world map.',
        'CITY_NOT_PLACED_ON_MAP',
        HttpStatus.CONFLICT,
      );
    }

    const [originSpyAgency, defenderSpyAgency, originSpyState, defenderSpyState, cooldown] =
      await Promise.all([
        client.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: originCity.id, buildingType: BUILDING_TYPES.SPY_AGENCY } },
        }),
        client.cityBuilding.findUnique({
          where: { cityId_buildingType: { cityId: targetCity.id, buildingType: BUILDING_TYPES.SPY_AGENCY } },
        }),
        client.citySpyState.upsert({
          where: { cityId: originCity.id },
          create: { worldId: originCity.worldId, playerId: originCity.playerId, cityId: originCity.id },
          update: {},
        }),
        client.citySpyState.upsert({
          where: { cityId: targetCity.id },
          create: { worldId: targetCity.worldId, playerId: targetCity.playerId, cityId: targetCity.id },
          update: {},
        }),
        client.spyCooldown.findUnique({
          where: {
            attackerPlayerId_targetCityId: {
              attackerPlayerId: originCity.playerId,
              targetCityId: targetCity.id,
            },
          },
        }),
      ]);

    const distance = calculateMapDistance({
      from: { x: originCity.island.x, y: originCity.island.y },
      to: { x: targetCity.island.x, y: targetCity.island.y },
    });
    const normalTravelTimeSeconds = calculateTravelTimeSeconds({
      distance,
      baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
      worldSpeed: originCity.world.speedTravel,
    });
    const travelTimeSeconds = calculateSpyTravelTimeSeconds({
      normalTravelTimeSeconds,
      spyTravelMultiplier: SPY_CONFIG.spyTravelMultiplier,
      minSpyTravelTimeSeconds: SPY_CONFIG.minSpyTravelTimeSeconds,
    });
    const originSpyAgencyLevel = originSpyAgency?.level ?? 0;
    const defenderSpyAgencyLevel = defenderSpyAgency?.level ?? 0;

    return {
      originCity,
      targetCity,
      originSpyAgencyLevel,
      defenderSpyAgencyLevel,
      originSpyState,
      defenderSpyState,
      cooldown,
      travelTimeSeconds,
      successChance: calculateSpySuccessChance({
        attackerSpyAgencyLevel: originSpyAgencyLevel,
        defenderSpyAgencyLevel,
        defenderSpyCount: defenderSpyState.spies,
      }),
      detectionChance: calculateSpyDetectionChance({
        attackerSpyAgencyLevel: originSpyAgencyLevel,
        defenderSpyAgencyLevel,
        defenderSpyCount: defenderSpyState.spies,
      }),
      beginnerProtectionActive: this.hasBeginnerProtection(targetCity.player.createdAt),
    };
  }

  private async ensureCitySpyState(city: { id: string; worldId: string; playerId: string }) {
    return this.db().citySpyState.upsert({
      where: { cityId: city.id },
      create: { worldId: city.worldId, playerId: city.playerId, cityId: city.id, spies: 0 },
      update: {},
    });
  }

  private toTrainingJobSummary(job: any) {
    return {
      id: job.id,
      quantity: job.quantity,
      status: job.status,
      finishesAt: job.finishesAt.toISOString(),
      remainingSeconds: Math.max(0, Math.ceil((job.finishesAt.getTime() - Date.now()) / 1000)),
    };
  }

  private toMissionSummary(mission: any, movement?: any): SpyMissionSummary {
    const arrivalTime = movement?.arrivalTime ?? null;
    return {
      id: mission.id,
      missionType: mission.missionType,
      status: mission.status,
      successChance: mission.successChance,
      detectionChance: mission.detectionChance,
      arrivalTime: arrivalTime?.toISOString?.() ?? null,
      remainingSeconds: arrivalTime
        ? Math.max(0, Math.ceil((arrivalTime.getTime() - Date.now()) / 1000))
        : null,
      originCityName: mission.originCity?.name,
      targetCityName: mission.targetCity?.name,
      wasSuccessful: mission.wasSuccessful,
      wasDetected: mission.wasDetected,
      spyLost: mission.spyLost,
      reportId: mission.reportMessageId,
      createdAt: mission.createdAt?.toISOString?.(),
    };
  }

  private toSpyValidationError(reason: string): ApiErrorException {
    if (reason.includes('own city')) {
      return new ApiErrorException(reason, 'CANNOT_SPY_OWN_CITY', HttpStatus.BAD_REQUEST);
    }
    if (reason.includes('beginner protection')) {
      return new ApiErrorException(reason, 'TARGET_BEGINNER_PROTECTED', HttpStatus.BAD_REQUEST);
    }
    if (reason.includes('wait')) {
      return new ApiErrorException(reason, 'SPY_COOLDOWN_ACTIVE', HttpStatus.CONFLICT);
    }
    if (reason.includes('No spies')) {
      return new ApiErrorException(reason, 'NO_SPIES_AVAILABLE', HttpStatus.BAD_REQUEST);
    }
    if (reason.includes('Spy Agency')) {
      return new ApiErrorException(reason, 'SPY_AGENCY_REQUIRED', HttpStatus.BAD_REQUEST);
    }
    return new ApiErrorException(reason, 'SPY_MISSION_UNAVAILABLE', HttpStatus.BAD_REQUEST);
  }

  private hasBeginnerProtection(createdAt: Date): boolean {
    return createdAt.getTime() + 7 * 24 * 60 * 60 * 1000 > Date.now();
  }

  private async enqueue(jobName: string, payload: Record<string, unknown>, runAt: Date): Promise<void> {
    await this.queue.add(jobName, payload, {
      delay: Math.max(0, runAt.getTime() - Date.now()),
      removeOnComplete: true,
      removeOnFail: 100,
    });
  }

  private db(): Db {
    return this.prisma as unknown as Db;
  }
}
