import { HttpStatus, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  BUILDING_TYPES,
  NAVAL_SHIP_TYPES,
  TECHNOLOGY_CONFIG,
  TRAINING_CONFIG,
  UNIT_CONFIG,
  type UnitType,
} from '@island-empires/config';
import {
  calculateWorkshopTrainingBonus,
  calculateTrainingOrderCapacity,
  calculateUnitTrainingCost,
  calculateUnitTrainingDurationSeconds,
  canTrainUnits,
} from '@island-empires/game-engine';
import type {
  ActiveTrainingSummary,
  ArmyUnits,
  BarracksOverviewResponse,
  CityResourcesResponse,
  ConditionSummary,
  TrainUnitsRequest,
  TrainUnitsResponse,
  UnitTrainingOption,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesService } from '../resources/resources.service';

const QUEUE_NAME = 'island-empires-default';
const TRAINING_COMPLETE_JOB = 'unit.training.complete';
const UNIT_TYPE_KEYS = Object.keys(UNIT_CONFIG) as UnitType[];
const RESOURCE_KEYS = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;
const BUILDING_NAMES: Record<string, string> = {
  [BUILDING_TYPES.BARRACKS]: 'Barracks',
  [BUILDING_TYPES.SHIPYARD]: 'Shipyard',
  [BUILDING_TYPES.TRADING_POST]: 'Trading Post',
  [BUILDING_TYPES.WORKSHOP]: 'Workshop',
};

@Injectable()
export class BarracksService implements OnModuleDestroy {
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

  async getBarracksOverview(cityId: string): Promise<BarracksOverviewResponse> {
    return this.getTrainingOverview(cityId, BUILDING_TYPES.BARRACKS);
  }

  async getShipyardOverview(cityId: string): Promise<BarracksOverviewResponse> {
    return this.getTrainingOverview(cityId, BUILDING_TYPES.SHIPYARD);
  }

  private async getTrainingOverview(
    cityId: string,
    buildingType: string,
  ): Promise<BarracksOverviewResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.completeDueTrainingOrders(cityId);
    await this.resourcesService.recalculateResources(cityId);

    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      include: { world: true },
    });
    if (!city || city.playerId !== bootstrap.player.id || city.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const [trainingBuilding, supportBuildings, resources, cityUnits, activeOrders, completedTechnologies] = await Promise.all([
      this.prisma.cityBuilding.findUnique({
        where: { cityId_buildingType: { cityId, buildingType } },
      }),
      this.prisma.cityBuilding.findMany({ where: { cityId } }),
      this.prisma.cityResource.findUniqueOrThrow({ where: { cityId } }),
      this.prisma.cityUnit.findMany({ where: { cityId } }),
      this.prisma.unitTrainingOrder.findMany({
        where: { cityId, status: 'active' },
        orderBy: { finishesAt: 'asc' },
      }),
      this.prisma.playerTechnology.findMany({
        where: { playerId: city.playerId, status: 'completed' },
        select: { technologyId: true },
      }),
    ]);

    const buildingLevel = trainingBuilding?.level ?? 0;
    const buildingLevels = this.toBuildingLevels(supportBuildings);
    const workshopLevel = buildingLevels[BUILDING_TYPES.WORKSHOP] ?? 0;
    const workshopBonus = calculateWorkshopTrainingBonus({ workshopLevel });
    const maxQuantityPerOrder = this.calculateMaxQuantityPerOrder(buildingLevel);
    const completedTechnologyIds = completedTechnologies.map((technology) => technology.technologyId);
    const activeOrder = activeOrders.find((order) => {
      const definition = UNIT_CONFIG[order.unitType as UnitType];
      return definition?.requiredBuildingType === buildingType;
    });
    const trainingBusy = Boolean(activeOrder);
    const units: UnitTrainingOption[] = UNIT_TYPE_KEYS.filter(
      (unitType) => UNIT_CONFIG[unitType].requiredBuildingType === buildingType,
    ).map((unitType) => {
      const definition = UNIT_CONFIG[unitType];
      const requirements = this.getRequirementSummaries(definition, buildingLevels, buildingLevel);
      const unlockConditions = this.getUnlockConditionSummaries(definition, completedTechnologyIds);
      const hasRequiredBuildings =
        requirements.every((requirement) => requirement.met) &&
        unlockConditions.every((requirement) => requirement.met !== false);
      const discountedCost = calculateUnitTrainingCost({
        unitCost: definition.cost,
        quantity: 1,
        costReductionPercent: workshopBonus.costReductionPercent,
      });
      const trainingSecondsPerUnit = calculateUnitTrainingDurationSeconds({
        trainingSecondsPerUnit: definition.trainingSecondsPerUnit,
        quantity: 1,
        worldSpeed: 1,
        timeReductionPercent: workshopBonus.timeReductionPercent,
      });
      const maxAffordable = this.calculateMaxAffordable(resources, discountedCost, maxQuantityPerOrder);
      const trainingState = canTrainUnits({
        buildingLevel,
        requiredBuildingLevel: definition.requiredBuildingLevel,
        quantity: 1,
        maxQuantityPerOrder,
        trainingBusy,
        hasEnoughResources: maxAffordable >= 1,
        hasRequiredBuildings,
      });

      return {
        type: unitType,
        category: definition.category,
        name: definition.name,
        description: definition.description,
        cost: discountedCost,
        upkeep: definition.upkeep,
        trainingSecondsPerUnit,
        attack: definition.attack,
        defense: definition.defense,
        health: definition.health,
        speed: definition.speed,
        capacity: definition.capacity,
        requirements,
        unlockConditions,
        canTrain: trainingState.canTrain,
        disabledReason: trainingState.reason ?? null,
        maxAffordable: Math.max(0, maxAffordable),
      };
    });

    return {
      cityId: city.id,
      cityName: city.name,
      barracksLevel: buildingType === BUILDING_TYPES.BARRACKS ? buildingLevel : 0,
      buildingType,
      buildingName: BUILDING_NAMES[buildingType] ?? buildingType,
      buildingLevel,
      maxQuantityPerOrder,
      resources: this.toResourcesResponse(resources),
      trainingBonus: {
        sourceBuildingType: BUILDING_TYPES.WORKSHOP,
        sourceBuildingName: BUILDING_NAMES[BUILDING_TYPES.WORKSHOP],
        sourceBuildingLevel: workshopLevel,
        costReductionPercent: workshopBonus.costReductionPercent,
        timeReductionPercent: workshopBonus.timeReductionPercent,
      },
      units,
      army: this.toArmyUnits(cityUnits),
      activeTraining: activeOrder ? this.toActiveTrainingSummary(activeOrder) : null,
    };
  }

  async trainUnits(cityId: string, input: TrainUnitsRequest): Promise<TrainUnitsResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const unitType = input.unitType as UnitType;
    const definition = UNIT_CONFIG[unitType];
    if (!definition) {
      throw new ApiErrorException('Unknown unit type.', 'UNKNOWN_UNIT_TYPE', HttpStatus.BAD_REQUEST);
    }

    const quantity = Number(input.quantity);
    await this.completeDueTrainingOrders(cityId);
    await this.resourcesService.recalculateResources(cityId);

    const result = await this.prisma.$transaction(async (tx) => {
      const city = await tx.city.findUnique({
        where: { id: cityId },
        include: { world: true },
      });
      if (!city || city.playerId !== bootstrap.player.id || city.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      const [trainingBuilding, supportBuildings, resources, activeOrders, completedTechnologies] = await Promise.all([
        tx.cityBuilding.findUnique({
          where: {
            cityId_buildingType: {
              cityId,
              buildingType: definition.requiredBuildingType,
            },
          },
        }),
        tx.cityBuilding.findMany({ where: { cityId } }),
        tx.cityResource.findUniqueOrThrow({ where: { cityId } }),
        tx.unitTrainingOrder.findMany({ where: { cityId, status: 'active' } }),
        tx.playerTechnology.findMany({
          where: { playerId: city.playerId, status: 'completed' },
          select: { technologyId: true },
        }),
      ]);

      const buildingLevels = this.toBuildingLevels(supportBuildings);
      const workshopBonus = calculateWorkshopTrainingBonus({
        workshopLevel: buildingLevels[BUILDING_TYPES.WORKSHOP] ?? 0,
      });
      const cost = calculateUnitTrainingCost({
        unitCost: definition.cost,
        quantity,
        costReductionPercent: workshopBonus.costReductionPercent,
      });
      const activeOrder = activeOrders.find((order) => {
        const activeDefinition = UNIT_CONFIG[order.unitType as UnitType];
        return activeDefinition?.requiredBuildingType === definition.requiredBuildingType;
      });
      const buildingLevel = trainingBuilding?.level ?? 0;
      const maxQuantityPerOrder = this.calculateMaxQuantityPerOrder(buildingLevel);
      const requirements = this.getRequirementSummaries(
        definition,
        buildingLevels,
        buildingLevel,
      );
      const unlockConditions = this.getUnlockConditionSummaries(
        definition,
        completedTechnologies.map((technology) => technology.technologyId),
      );
      const trainingState = canTrainUnits({
        buildingLevel,
        requiredBuildingLevel: definition.requiredBuildingLevel,
        quantity,
        maxQuantityPerOrder,
        trainingBusy: Boolean(activeOrder),
        hasEnoughResources: RESOURCE_KEYS.every((resourceType) => resources[resourceType] >= cost[resourceType]),
        hasRequiredBuildings:
          requirements.every((requirement) => requirement.met) &&
          unlockConditions.every((requirement) => requirement.met !== false),
      });
      if (!trainingState.canTrain) {
        throw new ApiErrorException(
          trainingState.reason ?? 'Units cannot be trained right now.',
          'TRAINING_UNAVAILABLE',
          HttpStatus.BAD_REQUEST,
        );
      }

      const startedAt = new Date();
      const durationSeconds = calculateUnitTrainingDurationSeconds({
        trainingSecondsPerUnit: definition.trainingSecondsPerUnit,
        quantity,
        worldSpeed: city.world.speedBuilding,
        timeReductionPercent: workshopBonus.timeReductionPercent,
      });
      const finishesAt = new Date(startedAt.getTime() + durationSeconds * 1000);

      const updatedResources = await tx.cityResource.update({
        where: { cityId },
        data: Object.fromEntries(
          RESOURCE_KEYS.map((resourceType) => [resourceType, resources[resourceType] - cost[resourceType]]),
        ),
      });

      const order = await tx.unitTrainingOrder.create({
        data: {
          worldId: city.worldId,
          playerId: city.playerId,
          cityId: city.id,
          unitType,
          quantity,
          status: 'active',
          startedAt,
          finishesAt,
        },
      });

      await Promise.all(
        RESOURCE_KEYS
          .filter((resourceType) => cost[resourceType] > 0)
          .map((resourceType) =>
            tx.resourceTransaction.create({
              data: {
                worldId: city.worldId,
                cityId: city.id,
                playerId: city.playerId,
                transactionType: 'unit_training_cost',
                resourceType,
                amount: -cost[resourceType],
                balanceAfter: updatedResources[resourceType],
                referenceType: 'unit_training_order',
                referenceId: order.id,
              },
            }),
          ),
      );

      return { order, resources: this.toResourcesResponse(updatedResources) };
    });

    await this.enqueueTrainingCompletion(result.order.id, result.order.finishesAt);
    await this.analyticsService?.track({
      worldId: result.order.worldId,
      playerId: result.order.playerId,
      eventType: 'unit_training_started',
      payload: {
        cityId,
        trainingOrderId: result.order.id,
        unitType: result.order.unitType,
        quantity: result.order.quantity,
        finishesAt: result.order.finishesAt.toISOString(),
      },
    });

    return {
      activeTraining: this.toActiveTrainingSummary(result.order),
      resources: result.resources,
    };
  }

  async completeDueTrainingOrders(cityId?: string): Promise<number> {
    const dueOrders = await this.prisma.unitTrainingOrder.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        status: 'active',
        finishesAt: { lte: new Date() },
      },
      select: { id: true },
    });

    let completed = 0;
    for (const order of dueOrders) {
      if (await this.completeTrainingOrder(order.id)) {
        completed += 1;
      }
    }

    return completed;
  }

  async completeTrainingOrder(orderId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.unitTrainingOrder.findUnique({
        where: { id: orderId },
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
      if (Object.values(NAVAL_SHIP_TYPES).includes(order.unitType as any)) {
        const field =
          order.unitType === NAVAL_SHIP_TYPES.LIGHT_SHIP
            ? 'lightShip'
            : order.unitType === NAVAL_SHIP_TYPES.RAM_SHIP
              ? 'ramShip'
              : 'fireShip';
        await (tx as any).cityFleet.upsert({
          where: { cityId: order.cityId },
          update: { [field]: { increment: order.quantity } },
          create: {
            worldId: order.worldId,
            playerId: order.playerId,
            cityId: order.cityId,
            [field]: order.quantity,
          },
        });
      }

      const definition = UNIT_CONFIG[order.unitType as UnitType];
      const unitLabel =
        order.quantity === 1
          ? definition?.name ?? order.unitType
          : definition?.pluralName ?? order.unitType;
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
      await tx.gameAnalyticsEvent?.create({
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

  private async enqueueTrainingCompletion(orderId: string, finishesAt: Date): Promise<void> {
    await this.queue.add(
      TRAINING_COMPLETE_JOB,
      { trainingOrderId: orderId },
      { delay: Math.max(0, finishesAt.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 100 },
    );
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

  private toActiveTrainingSummary(order: {
    id: string;
    unitType: string;
    quantity: number;
    startedAt: Date;
    finishesAt: Date;
  }): ActiveTrainingSummary {
    return {
      id: order.id,
      unitType: order.unitType as UnitType,
      unitName: UNIT_CONFIG[order.unitType as UnitType]?.name ?? order.unitType,
      quantity: order.quantity,
      startedAt: order.startedAt.toISOString(),
      finishesAt: order.finishesAt.toISOString(),
      remainingSeconds: Math.max(0, Math.ceil((order.finishesAt.getTime() - Date.now()) / 1000)),
    };
  }

  private toBuildingLevels(buildings: Array<{ buildingType: string; level: number }>): Record<string, number> {
    return Object.fromEntries(buildings.map((building) => [building.buildingType, building.level]));
  }

  private getRequirementSummaries(
    definition: (typeof UNIT_CONFIG)[UnitType],
    buildingLevels: Record<string, number>,
    primaryBuildingLevel: number,
  ) {
    const primaryRequirement = {
      buildingType: definition.requiredBuildingType,
      buildingName: BUILDING_NAMES[definition.requiredBuildingType] ?? definition.requiredBuildingType,
      requiredLevel: definition.requiredBuildingLevel,
      currentLevel: primaryBuildingLevel,
      met: primaryBuildingLevel >= definition.requiredBuildingLevel,
    };
    const supportRequirements = (definition.requiredBuildings ?? []).map((requirement) => {
      const currentLevel = buildingLevels[requirement.buildingType] ?? 0;
      return {
        buildingType: requirement.buildingType,
        buildingName: BUILDING_NAMES[requirement.buildingType] ?? requirement.buildingType,
        requiredLevel: requirement.level,
        currentLevel,
        met: currentLevel >= requirement.level,
      };
    });

    return [primaryRequirement, ...supportRequirements];
  }

  private getUnlockConditionSummaries(
    definition: (typeof UNIT_CONFIG)[UnitType],
    completedTechnologyIds: string[],
  ): ConditionSummary[] {
    return (definition.unlockConditions ?? []).map((condition) => {
      if (condition.type === 'research_required') {
        const technologyName = condition.technologyId
          ? TECHNOLOGY_CONFIG[condition.technologyId as keyof typeof TECHNOLOGY_CONFIG]?.name ?? condition.technologyId
          : 'Unknown technology';
        return {
          ...condition,
          type: condition.type,
          label: `Research: ${technologyName}`,
          met: completedTechnologyIds.includes(condition.technologyId),
        };
      }

      return {
        ...condition,
        type: condition.type,
        label: condition.type,
      };
    });
  }

  private calculateMaxAffordable(
    resources: Record<(typeof RESOURCE_KEYS)[number], number>,
    cost: Record<(typeof RESOURCE_KEYS)[number], number>,
    maxQuantityPerOrder: number,
  ): number {
    const limits = RESOURCE_KEYS.filter((resourceType) => cost[resourceType] > 0).map((resourceType) =>
      Math.floor(resources[resourceType] / cost[resourceType]),
    );

    return Math.min(maxQuantityPerOrder, ...(limits.length > 0 ? limits : [maxQuantityPerOrder]));
  }

  private calculateMaxQuantityPerOrder(buildingLevel: number): number {
    return calculateTrainingOrderCapacity({
      buildingLevel,
      baseQuantityPerOrder: TRAINING_CONFIG.baseQuantityPerOrder,
      quantityPerBuildingLevel: TRAINING_CONFIG.quantityPerBuildingLevel,
    });
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
