import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { calculateResourceProduction } from '@island-empires/game-engine';
import {
  BUILDING_TYPES,
  LUXURY_PRODUCTION_BUILDINGS,
  RESOURCE_PRODUCTION_CONFIG,
} from '@island-empires/config';
import type {
  AssignWorkersResponse,
  CityBuildingSummary,
  CityOverview,
  CityPopulationResponse,
  CityProductionResponse,
  CityResourcesResponse,
  CitySummary,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { BuildingsService } from '../buildings/buildings.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { PopulationService } from '../population/population.service';
import { QuestsService } from '../quests/quests.service';
import { ResearchService } from '../research/research.service';
import { calculateCityProductionBoosts, ResourcesService } from '../resources/resources.service';
import { WorkersService } from '../workers/workers.service';
import type { AssignWorkersDto } from './dto/assign-workers.dto';

@Injectable()
export class CitiesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly analyticsService: AnalyticsService | undefined,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly buildingsService: BuildingsService,
    private readonly populationService: PopulationService,
    private readonly questsService: QuestsService,
    private readonly researchService: ResearchService,
    private readonly resourcesService: ResourcesService,
    private readonly workersService: WorkersService,
  ) {}

  async getPlayerCities(): Promise<CitySummary[]> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();

    const cities = await this.prisma.city.findMany({
      where: { playerId: bootstrap.player.id },
      include: { island: true },
      orderBy: { createdAt: 'asc' },
    });

    return cities.map((city) => ({
      id: city.id,
      name: city.name,
      level: city.level,
      population: city.population,
      populationCapacity: city.populationCapacity,
      happiness: city.happiness,
      island: city.island
        ? {
            id: city.island.id,
            name: city.island.name ?? `Island ${city.island.x}:${city.island.y}`,
            x: city.island.x,
            y: city.island.y,
            luxuryResource: city.island.luxuryResource,
          }
        : null,
    }));
  }

  async getCityOverview(cityId: string): Promise<CityOverview> {
    const playerId = await this.assertDevelopmentPlayerOwnsCity(cityId);

    await this.buildingsService.completeDueUpgrades(cityId);

    const { resources, production, storage } =
      await this.resourcesService.recalculateResources(cityId);
    const populationResponse = await this.populationService.recalculatePopulation(cityId);
    const city = await this.getCitySummaryOrThrow(cityId);

    const [buildings, activeConstruction, researchOverview] = await Promise.all([
      this.buildingsService.getCityBuildingSummaries(cityId),
      this.buildingsService.getActiveConstruction(cityId),
      this.researchService.getResearchOverview(playerId),
    ]);

    await this.questsService.handleQuestTrigger(playerId, 'city_dashboard_opened');
    await this.questsService.handleQuestTrigger(playerId, 'resources_viewed');

    return {
      city,
      population: populationResponse.population,
      happiness: populationResponse.happiness,
      citizens: populationResponse.citizens,
      resources,
      production,
      storage,
      research: {
        researchPoints: researchOverview.researchPoints,
        researchPointsPerHour: researchOverview.researchPointsPerHour,
        activeResearch: researchOverview.activeResearch,
      },
      workers: populationResponse.citizens,
      buildings,
      activeConstruction,
    };
  }

  async selectCity(cityId: string) {
    const playerId = await this.assertDevelopmentPlayerOwnsCity(cityId);
    await this.prisma.player.update({
      where: { id: playerId },
      data: { selectedCityId: cityId },
    });

    return { success: true, selectedCityId: cityId };
  }

  async getCityResources(cityId: string): Promise<CityResourcesResponse> {
    await this.assertDevelopmentPlayerOwnsCity(cityId);

    const { resources } = await this.resourcesService.recalculateResources(cityId);

    return resources;
  }

  async getCityBuildings(cityId: string): Promise<CityBuildingSummary[]> {
    await this.assertDevelopmentPlayerOwnsCity(cityId);

    return this.buildingsService.getCityBuildingSummaries(cityId);
  }

  async startBuildingUpgrade(cityId: string, buildingType: string) {
    const playerId = await this.assertDevelopmentPlayerOwnsCity(cityId);

    const result = await this.buildingsService.startUpgrade({ cityId, buildingType });
    const city = await this.prisma.city.findUniqueOrThrow({
      where: { id: cityId },
      select: { worldId: true },
    });
    await this.questsService.handleQuestTrigger(playerId, 'building_upgrade_started', {
      buildingType,
    });
    await this.analyticsService?.track({
      worldId: city.worldId,
      playerId,
      eventType: 'building_upgrade_started',
      payload: {
        cityId,
        buildingType,
        level: result.building.level,
        finishesAt: result.activeConstruction.finishesAt,
      },
    });

    return result;
  }

  async getCityProduction(cityId: string): Promise<CityProductionResponse> {
    await this.assertDevelopmentPlayerOwnsCity(cityId);

    const [{ production, storage }, workers] = await Promise.all([
      this.resourcesService.recalculateResources(cityId),
      this.workersService.getAssignment(cityId),
    ]);

    return { production, storage, workers };
  }

  async getCityPopulation(cityId: string): Promise<CityPopulationResponse> {
    await this.assertDevelopmentPlayerOwnsCity(cityId);
    await this.buildingsService.completeDueUpgrades(cityId);

    return this.populationService.getPopulationResponse(cityId);
  }

  async assignWorkers(cityId: string, dto: AssignWorkersDto): Promise<AssignWorkersResponse> {
    const playerId = await this.assertDevelopmentPlayerOwnsCity(cityId);

    await this.resourcesService.recalculateResources(cityId);
    const populationResponse = await this.populationService.recalculatePopulation(cityId);
    await this.populationService.assertWorkerAssignmentAllowed({
      population: populationResponse.population.current,
      woodWorkers: dto.woodWorkers,
      goldWorkers: dto.goldWorkers,
      luxuryWorkers: dto.luxuryWorkers,
      scientists: dto.scientists,
    });

    const workers = await this.workersService.assignWorkers(
      cityId,
      dto,
      populationResponse.population.current,
    );
    await this.questsService.handleQuestTrigger(playerId, 'worker_assignment_updated');
    if (workers.scientists > 0) {
      await this.questsService.handleQuestTrigger(playerId, 'scientists_assigned');
    }

    const citizens = this.populationService.toCitizenSummary({
      population: populationResponse.population.current,
      woodWorkers: workers.woodWorkers,
      goldWorkers: workers.goldWorkers,
      luxuryWorkers: workers.luxuryWorkers,
      scientists: workers.scientists,
    });

    const city = await this.prisma.city.findUniqueOrThrow({
      where: { id: cityId },
      include: { island: true },
    });
    const [luxuryExtractor, productionBoostBuildings] = await Promise.all([
      this.prisma.cityBuilding.findUnique({
        where: {
          cityId_buildingType: { cityId, buildingType: BUILDING_TYPES.LUXURY_EXTRACTOR },
        },
      }),
      this.prisma.cityBuilding.findMany({
        where: {
          cityId,
          buildingType: {
            in: [BUILDING_TYPES.FORESTERS_HOUSE, ...Object.values(LUXURY_PRODUCTION_BUILDINGS)],
          },
        },
        select: { buildingType: true, level: true },
      }),
    ]);
    const productionBoosts = calculateCityProductionBoosts({
      buildings: productionBoostBuildings,
      islandLuxuryResource: city.island?.luxuryResource ?? null,
    });
    const production = calculateResourceProduction({
      baseWoodPerHour: RESOURCE_PRODUCTION_CONFIG.baseWoodPerHour,
      baseGoldPerHour: RESOURCE_PRODUCTION_CONFIG.baseGoldPerHour,
      woodWorkers: workers.woodWorkers,
      goldWorkers: workers.goldWorkers,
      luxuryWorkers: workers.luxuryWorkers,
      woodPerWorkerPerHour: RESOURCE_PRODUCTION_CONFIG.woodPerWorkerPerHour,
      goldPerWorkerPerHour: RESOURCE_PRODUCTION_CONFIG.goldPerWorkerPerHour,
      luxuryPerWorkerPerHour: RESOURCE_PRODUCTION_CONFIG.luxuryPerWorkerPerHour,
      luxuryExtractorLevel: luxuryExtractor?.level ?? 0,
      islandLuxuryResource: city.island?.luxuryResource ?? null,
      ...productionBoosts,
    });

    const researchOverview = await this.researchService.getResearchOverview(playerId);

    return {
      workers: citizens,
      citizens,
      production,
      research: {
        researchPoints: researchOverview.researchPoints,
        researchPointsPerHour: researchOverview.researchPointsPerHour,
        activeResearch: researchOverview.activeResearch,
      },
    };
  }

  private async assertDevelopmentPlayerOwnsCity(cityId: string): Promise<string> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      select: { playerId: true },
    });

    if (!city) {
      throw new ApiErrorException('City not found', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    if (city.playerId !== bootstrap.player.id) {
      throw new ApiErrorException('City not found', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return bootstrap.player.id;
  }

  private async getCitySummaryOrThrow(cityId: string): Promise<CitySummary> {
    const city = await this.prisma.city.findUnique({ where: { id: cityId } });

    if (!city) {
      throw new ApiErrorException('City not found', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return {
      id: city.id,
      name: city.name,
      level: city.level,
      population: city.population,
      populationCapacity: city.populationCapacity,
      happiness: city.happiness,
    };
  }
}
