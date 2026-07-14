import { HttpStatus, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  calculateBuildingUpgradeCost,
  calculateBuildingUpgradeDurationSeconds,
  calculateLevelPercentBonus,
  calculateStorageCapacity,
  canUpgradeBuilding,
} from '@island-empires/game-engine';
import {
  BUILDING_CONFIG,
  BUILDING_MILESTONE_CONFIG,
  BUILDING_TYPES,
  BUILDING_UPGRADE_CONFIG,
  CONDITION_TYPES,
  RESOURCE_LABELS,
  STORAGE_CONFIG,
  TECHNOLOGY_CONFIG,
  type BuildingType,
  type UnlockCondition,
} from '@island-empires/config';
import type {
  ActiveConstructionSummary,
  CityBuildingSummary,
  CityResourcesResponse,
  ConditionSummary,
  ResourceBalance,
  StartBuildingUpgradeResponse,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { ResourcesService } from '../resources/resources.service';

const UPGRADE_JOB_NAME = 'building.upgrade.complete';
const QUEUE_NAME = 'island-empires-default';
const RESOURCE_KEYS: Array<keyof ResourceBalance> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];

type BuildingConditionContext = {
  city: {
    population: number;
    happiness: number;
    island?: { luxuryResource: string } | null;
  };
  resources?: ResourceBalance | null;
  buildings: Array<{ buildingType: string; level: number }>;
  completedTechnologyIds: Set<string>;
};

type MilestoneConditionState = {
  canUpgrade: boolean;
  reason?: string;
  summariesByMilestoneLevel: Map<number, ConditionSummary[]>;
};

@Injectable()
export class BuildingsService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(
    private readonly prisma: PrismaService,
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

  async getCityBuildingSummaries(cityId: string): Promise<CityBuildingSummary[]> {
    await this.completeDueUpgrades(cityId);

    const city = await this.prisma.city.findUniqueOrThrow({
      where: { id: cityId },
      include: { world: true, island: true, resources: true },
    });
    const buildings = await this.prisma.cityBuilding.findMany({
      where: { cityId },
      orderBy: { slotIndex: 'asc' },
    });
    const completedTechnologies = await this.prisma.playerTechnology.findMany({
      where: {
        playerId: city.playerId,
        status: 'completed',
      },
      select: { technologyId: true },
    });
    const activeConstruction = buildings.find((building) => building.status === 'upgrading');
    const buildersGuildLevel =
      buildings.find((building) => building.buildingType === 'builders_guild')?.level ?? 0;
    const conditionContext: BuildingConditionContext = {
      city,
      resources: city.resources,
      buildings,
      completedTechnologyIds: new Set(
        completedTechnologies.map((technology) => technology.technologyId),
      ),
    };

    return buildings.map((building) =>
      this.toBuildingSummary({
        building,
        worldSpeed: city.world.speedBuilding,
        constructionBusy: Boolean(activeConstruction && activeConstruction.id !== building.id),
        buildersGuildLevel,
        conditionContext,
      }),
    );
  }

  async getActiveConstruction(cityId: string): Promise<ActiveConstructionSummary | null> {
    await this.completeDueUpgrades(cityId);

    const building = await this.prisma.cityBuilding.findFirst({
      where: { cityId, status: 'upgrading' },
      orderBy: { upgradeFinishesAt: 'asc' },
    });

    return building ? this.toActiveConstruction(building) : null;
  }

  async startUpgrade(input: {
    cityId: string;
    buildingType: string;
  }): Promise<StartBuildingUpgradeResponse> {
    await this.completeDueUpgrades(input.cityId);
    await this.resourcesService.recalculateResources(input.cityId);

    const result = await this.prisma.$transaction(async (tx) => {
      const city = await tx.city.findUniqueOrThrow({
        where: { id: input.cityId },
        include: { world: true, island: true },
      });
      const building = await tx.cityBuilding.findUnique({
        where: {
          cityId_buildingType: {
            cityId: input.cityId,
            buildingType: input.buildingType,
          },
        },
      });

      if (!building) {
        throw new ApiErrorException(
          'Building not found',
          'BUILDING_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        );
      }

      const definition =
        BUILDING_UPGRADE_CONFIG[input.buildingType as keyof typeof BUILDING_UPGRADE_CONFIG];
      const displayConfig = BUILDING_CONFIG[input.buildingType as BuildingType];
      const upgradeState = canUpgradeBuilding({
        currentLevel: building.level,
        maxLevel: definition?.maxLevel ?? 0,
        isEnabled: Boolean(definition && displayConfig?.enabledInSprint3),
      });

      if (!upgradeState.canUpgrade) {
        throw new ApiErrorException(
          upgradeState.reason ?? 'Building cannot be upgraded',
          'BUILDING_UPGRADE_UNAVAILABLE',
          HttpStatus.BAD_REQUEST,
        );
      }

      const [activeConstruction, buildersGuild, allBuildings, completedTechnologies] =
        await Promise.all([
          tx.cityBuilding.findFirst({
            where: { cityId: input.cityId, status: 'upgrading' },
          }),
          tx.cityBuilding.findUnique({
            where: {
              cityId_buildingType: {
                cityId: input.cityId,
                buildingType: BUILDING_TYPES.BUILDERS_GUILD,
              },
            },
          }),
          tx.cityBuilding.findMany({
            where: { cityId: input.cityId },
            select: { buildingType: true, level: true },
          }),
          tx.playerTechnology.findMany({
            where: {
              playerId: city.playerId,
              status: 'completed',
            },
            select: { technologyId: true },
          }),
        ]);
      if (activeConstruction) {
        throw new ApiErrorException(
          'This city already has an active construction.',
          'CONSTRUCTION_QUEUE_BUSY',
          HttpStatus.CONFLICT,
        );
      }

      const resources = await tx.cityResource.findUniqueOrThrow({
        where: { cityId: input.cityId },
      });
      const milestoneConditionState = this.evaluateNextMilestoneConditions({
        buildingType: building.buildingType,
        currentLevel: building.level,
        context: {
          city,
          resources,
          buildings: allBuildings,
          completedTechnologyIds: new Set(
            completedTechnologies.map((technology) => technology.technologyId),
          ),
        },
      });

      if (!milestoneConditionState.canUpgrade) {
        throw new ApiErrorException(
          milestoneConditionState.reason ?? 'Building milestone condition is not met.',
          'BUILDING_MILESTONE_CONDITION_UNMET',
          HttpStatus.BAD_REQUEST,
        );
      }

      const cost = calculateBuildingUpgradeCost({
        currentLevel: building.level,
        definition,
      });
      const missingResource = RESOURCE_KEYS.find(
        (resourceType) => resources[resourceType] < cost[resourceType],
      );

      if (missingResource) {
        throw new ApiErrorException(
          'Not enough resources to start this upgrade.',
          'INSUFFICIENT_RESOURCES',
          HttpStatus.BAD_REQUEST,
        );
      }

      const startedAt = new Date();
      const durationSeconds = calculateBuildingUpgradeDurationSeconds({
        currentLevel: building.level,
        definition,
        worldSpeed: city.world.speedBuilding,
        timeReductionPercent: this.getConstructionTimeReductionPercent(buildersGuild?.level ?? 0),
      });
      const finishesAt = new Date(startedAt.getTime() + durationSeconds * 1000);
      const updatedResources = await tx.cityResource.update({
        where: { cityId: input.cityId },
        data: Object.fromEntries(
          RESOURCE_KEYS.map((resourceType) => [
            resourceType,
            resources[resourceType] - cost[resourceType],
          ]),
        ),
      });

      await Promise.all(
        RESOURCE_KEYS.filter((resourceType) => cost[resourceType] > 0).map((resourceType) =>
          tx.resourceTransaction.create({
            data: {
              worldId: city.worldId,
              cityId: city.id,
              playerId: city.playerId,
              transactionType: 'building_upgrade_cost',
              resourceType,
              amount: -cost[resourceType],
              balanceAfter: updatedResources[resourceType],
              referenceType: 'building',
              referenceId: building.id,
            },
          }),
        ),
      );

      const updatedBuilding = await tx.cityBuilding.update({
        where: { id: building.id },
        data: {
          status: 'upgrading',
          upgradeStartedAt: startedAt,
          upgradeFinishesAt: finishesAt,
        },
      });

      return {
        city,
        building: updatedBuilding,
        buildersGuildLevel: buildersGuild?.level ?? 0,
        resources: this.toResourcesResponse(updatedResources),
      };
    });

    await this.enqueueCompletionJob({
      cityId: result.city.id,
      buildingId: result.building.id,
      buildingType: result.building.buildingType,
      finishesAt: result.building.upgradeFinishesAt ?? new Date(),
    });

    return {
      building: this.toBuildingSummary({
        building: result.building,
        worldSpeed: result.city.world.speedBuilding,
        constructionBusy: false,
        buildersGuildLevel: result.buildersGuildLevel,
      }),
      resources: result.resources,
      activeConstruction: this.toActiveConstruction(result.building),
    };
  }

  async completeDueUpgrades(cityId?: string): Promise<void> {
    const dueBuildings = await this.prisma.cityBuilding.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        status: 'upgrading',
        upgradeFinishesAt: { lte: new Date() },
      },
      select: { id: true },
    });

    for (const building of dueBuildings) {
      await this.completeUpgrade(building.id);
    }
  }

  async completeUpgrade(buildingId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
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
      const displayConfig = BUILDING_CONFIG[building.buildingType as BuildingType];

      await tx.report.create({
        data: {
          worldId: building.city.worldId,
          playerId: building.city.playerId,
          cityId: building.cityId,
          type: 'building_completed',
          title: 'Construction completed',
          message: `${displayConfig?.name ?? building.buildingType} has reached level ${updatedBuilding.level}.`,
          payload: {
            buildingId: building.id,
            buildingType: building.buildingType,
            level: updatedBuilding.level,
          },
        },
      });
      await tx.gameAnalyticsEvent?.create({
        data: {
          worldId: building.city.worldId,
          playerId: building.city.playerId,
          eventType: 'building_upgrade_completed',
          payload: {
            cityId: building.cityId,
            buildingId: building.id,
            buildingType: building.buildingType,
            level: updatedBuilding.level,
          },
        },
      });

      return true;
    });
  }

  private async enqueueCompletionJob(input: {
    cityId: string;
    buildingId: string;
    buildingType: string;
    finishesAt: Date;
  }): Promise<void> {
    const delay = Math.max(0, input.finishesAt.getTime() - Date.now());

    await this.queue.add(
      UPGRADE_JOB_NAME,
      {
        cityId: input.cityId,
        buildingId: input.buildingId,
        buildingType: input.buildingType,
      },
      {
        delay,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  private toBuildingSummary(input: {
    building: {
      id: string;
      buildingType: string;
      level: number;
      slotIndex: number;
      status: string;
      upgradeStartedAt: Date | null;
      upgradeFinishesAt: Date | null;
    };
    worldSpeed: number;
    constructionBusy: boolean;
    buildersGuildLevel?: number;
    conditionContext?: BuildingConditionContext;
  }): CityBuildingSummary {
    const displayConfig = BUILDING_CONFIG[input.building.buildingType as BuildingType];
    const definition =
      BUILDING_UPGRADE_CONFIG[input.building.buildingType as keyof typeof BUILDING_UPGRADE_CONFIG];
    const upgradeState = canUpgradeBuilding({
      currentLevel: input.building.level,
      maxLevel: definition?.maxLevel ?? 0,
      isEnabled: Boolean(definition && displayConfig?.enabledInSprint3),
    });
    const milestoneConditionState = input.conditionContext
      ? this.evaluateNextMilestoneConditions({
          buildingType: input.building.buildingType,
          currentLevel: input.building.level,
          context: input.conditionContext,
        })
      : { canUpgrade: true, summariesByMilestoneLevel: new Map<number, ConditionSummary[]>() };
    const canStartUpgrade =
      upgradeState.canUpgrade &&
      milestoneConditionState.canUpgrade &&
      input.building.status === 'idle' &&
      !input.constructionBusy;
    const disabledReason =
      input.building.status === 'upgrading'
        ? 'Upgrading...'
        : input.constructionBusy
          ? 'Construction busy'
          : (upgradeState.reason ?? milestoneConditionState.reason);
    const milestones = this.toBuildingMilestones({
      buildingType: input.building.buildingType,
      currentLevel: input.building.level,
      summariesByMilestoneLevel: milestoneConditionState.summariesByMilestoneLevel,
    });

    return {
      id: input.building.id,
      type: input.building.buildingType,
      name: displayConfig?.name ?? input.building.buildingType,
      description: displayConfig?.description ?? 'City building.',
      level: input.building.level,
      slotIndex: input.building.slotIndex,
      status: input.building.status,
      canUpgrade: canStartUpgrade,
      disabledReason,
      upgradeCost: definition
        ? calculateBuildingUpgradeCost({
            currentLevel: input.building.level,
            definition,
          })
        : undefined,
      upgradeDurationSeconds: definition
        ? calculateBuildingUpgradeDurationSeconds({
            currentLevel: input.building.level,
            definition,
            worldSpeed: input.worldSpeed,
            timeReductionPercent: this.getConstructionTimeReductionPercent(
              input.buildersGuildLevel ?? 0,
            ),
          })
        : undefined,
      upgradeStartedAt: input.building.upgradeStartedAt?.toISOString() ?? null,
      upgradeFinishesAt: input.building.upgradeFinishesAt?.toISOString() ?? null,
      maxLevel: definition?.maxLevel,
      milestones,
      nextMilestone: milestones.find((milestone) => !milestone.isReached) ?? null,
    };
  }

  private getConstructionTimeReductionPercent(buildersGuildLevel: number): number {
    return calculateLevelPercentBonus({
      level: buildersGuildLevel,
      percentPerLevel: 1,
      maxPercent: 50,
    });
  }

  private toBuildingMilestones(input: {
    buildingType: string;
    currentLevel: number;
    summariesByMilestoneLevel?: Map<number, ConditionSummary[]>;
  }) {
    const milestones = BUILDING_MILESTONE_CONFIG[input.buildingType as BuildingType] ?? [];

    return milestones
      .slice()
      .sort((a, b) => a.level - b.level)
      .map((milestone) => ({
        level: milestone.level,
        title: milestone.title,
        description: milestone.description,
        isReached: input.currentLevel >= milestone.level,
        conditions:
          input.summariesByMilestoneLevel?.get(milestone.level) ??
          milestone.conditions?.map((condition) => this.toConditionSummary(condition)),
      }));
  }

  private evaluateNextMilestoneConditions(input: {
    buildingType: string;
    currentLevel: number;
    context: BuildingConditionContext;
  }): MilestoneConditionState {
    const targetLevel = input.currentLevel + 1;
    const milestones = (BUILDING_MILESTONE_CONFIG[input.buildingType as BuildingType] ?? []).filter(
      (milestone) => milestone.level === targetLevel && milestone.conditions?.length,
    );
    const summariesByMilestoneLevel = new Map<number, ConditionSummary[]>();

    if (milestones.length === 0) {
      return { canUpgrade: true, summariesByMilestoneLevel };
    }

    let reason: string | undefined;

    for (const milestone of milestones) {
      const summaries =
        milestone.conditions?.map((condition) => {
          const summary = this.evaluateCondition(condition, input.context);

          if (!summary.condition.met && !reason) {
            reason = summary.blockingReason;
          }

          return summary.condition;
        }) ?? [];

      summariesByMilestoneLevel.set(milestone.level, summaries);
    }

    return {
      canUpgrade: !reason,
      reason,
      summariesByMilestoneLevel,
    };
  }

  private evaluateCondition(
    condition: UnlockCondition,
    context: BuildingConditionContext,
  ): { condition: ConditionSummary; blockingReason?: string } {
    const resourceValue = (resourceType: keyof ResourceBalance) =>
      context.resources?.[resourceType] ?? 0;
    const buildingLevel = (buildingType: string) =>
      context.buildings.find((building) => building.buildingType === buildingType)?.level ?? 0;
    const warehouseCapacity = calculateStorageCapacity({
      baseStorage: STORAGE_CONFIG.baseStorage,
      warehouseLevel: buildingLevel(BUILDING_TYPES.WAREHOUSE),
      storagePerWarehouseLevel: STORAGE_CONFIG.storagePerWarehouseLevel,
    });
    let met = true;
    let current: number | string | undefined;
    let blockingReason: string | undefined;

    switch (condition.type) {
      case CONDITION_TYPES.RESEARCH_REQUIRED: {
        met = context.completedTechnologyIds.has(condition.technologyId);
        current = met ? 'completed' : 'missing';
        blockingReason = `Requires research: ${this.getTechnologyName(condition.technologyId)}.`;
        break;
      }
      case CONDITION_TYPES.RESOURCE_REQUIRED: {
        current = resourceValue(condition.resourceType);
        met = current >= condition.amount;
        blockingReason = `Requires ${condition.amount} ${this.getResourceName(condition.resourceType)}.`;
        break;
      }
      case CONDITION_TYPES.BUILDING_LEVEL_REQUIRED: {
        current = buildingLevel(condition.buildingType);
        met = current >= condition.level;
        blockingReason = `Requires ${this.getBuildingName(condition.buildingType)} level ${condition.level}.`;
        break;
      }
      case CONDITION_TYPES.CITY_POPULATION_REQUIRED: {
        current = context.city.population;
        met = current >= condition.population;
        blockingReason = `Requires population ${condition.population}.`;
        break;
      }
      case CONDITION_TYPES.CITY_HAPPINESS_REQUIRED: {
        current = context.city.happiness;
        met = current >= condition.happiness;
        blockingReason = `Requires happiness ${condition.happiness}.`;
        break;
      }
      case CONDITION_TYPES.ISLAND_RESOURCE_REQUIRED: {
        current = context.city.island?.luxuryResource ?? 'none';
        met = current === condition.resourceType;
        blockingReason = `Requires ${this.getResourceName(condition.resourceType)} island.`;
        break;
      }
      case CONDITION_TYPES.WAREHOUSE_CAPACITY_REQUIRED: {
        current = warehouseCapacity;
        met = current >= condition.capacity;
        blockingReason = `Requires warehouse capacity ${condition.capacity}.`;
        break;
      }
      case CONDITION_TYPES.PREVIOUS_UNIT_REQUIRED: {
        current = 'not enforced for buildings';
        met = true;
        break;
      }
      default: {
        met = true;
      }
    }

    return {
      condition: {
        ...this.toConditionSummary(condition),
        met,
        current,
      },
      blockingReason: met ? undefined : blockingReason,
    };
  }

  private getTechnologyName(technologyId: string): string {
    return TECHNOLOGY_CONFIG[technologyId as keyof typeof TECHNOLOGY_CONFIG]?.name ?? technologyId;
  }

  private getBuildingName(buildingType: string): string {
    return BUILDING_CONFIG[buildingType as BuildingType]?.name ?? buildingType;
  }

  private getResourceName(resourceType: keyof ResourceBalance): string {
    return RESOURCE_LABELS[resourceType] ?? resourceType;
  }

  private toConditionSummary(condition: {
    type: string;
    resourceType?: string;
    amount?: number;
    buildingType?: string;
    level?: number;
    technologyId?: string;
    population?: number;
    happiness?: number;
    capacity?: number;
    unitType?: string;
    quantity?: number;
  }): ConditionSummary {
    const label = (() => {
      if (condition.type === 'resource_required') {
        return `${condition.amount ?? 0} ${condition.resourceType}`;
      }
      if (condition.type === 'building_level_required') {
        return `${condition.buildingType} level ${condition.level}`;
      }
      if (condition.type === 'research_required') {
        return `Research: ${condition.technologyId}`;
      }
      if (condition.type === 'city_population_required') {
        return `Population ${condition.population}`;
      }
      if (condition.type === 'city_happiness_required') {
        return `Happiness ${condition.happiness}`;
      }
      if (condition.type === 'island_resource_required') {
        return `Island resource: ${condition.resourceType}`;
      }
      if (condition.type === 'warehouse_capacity_required') {
        return `Warehouse capacity ${condition.capacity}`;
      }
      if (condition.type === 'previous_unit_required') {
        return `${condition.quantity} ${condition.unitType}`;
      }

      return condition.type;
    })();

    return {
      ...condition,
      type: condition.type as ConditionSummary['type'],
      resourceType: condition.resourceType as ConditionSummary['resourceType'],
      label,
    };
  }

  private toActiveConstruction(building: {
    id: string;
    buildingType: string;
    level: number;
    upgradeStartedAt: Date | null;
    upgradeFinishesAt: Date | null;
  }): ActiveConstructionSummary {
    const now = Date.now();
    const finishesAt = building.upgradeFinishesAt ?? new Date(now);
    const displayConfig = BUILDING_CONFIG[building.buildingType as BuildingType];

    return {
      buildingId: building.id,
      buildingType: building.buildingType,
      buildingName: displayConfig?.name ?? building.buildingType,
      fromLevel: building.level,
      toLevel: building.level + 1,
      startedAt: (building.upgradeStartedAt ?? new Date(now)).toISOString(),
      finishesAt: finishesAt.toISOString(),
      remainingSeconds: Math.max(0, Math.ceil((finishesAt.getTime() - now) / 1000)),
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
