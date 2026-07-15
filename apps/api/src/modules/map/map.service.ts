import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import {
  BUILDING_TYPES,
  COLONIZATION_CONFIG,
  LUXURY_PRODUCTION_BUILDINGS,
  MAP_CONFIG,
  PVE_CONFIG,
  RESEARCH_TYPES,
  getPveCampLevelConfig,
} from '@island-empires/config';
import {
  calculateCityLimit,
  calculateColonizationCost,
  calculateColonyShipCount,
  calculateMapDistance,
  calculateTransportTravelTimeSeconds,
  calculateTravelTimeSeconds,
  canColonize,
} from '@island-empires/game-engine';
import type {
  IslandDetailResponse,
  IslandSlotSummary,
  SettleCityResponse,
  WorldMapResponse,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { QuestsService } from '../quests/quests.service';
import { ensureWorldMapGenerated, getWorldMapDimensions } from './world-map-generation';

const DEFAULT_WOOD_WORKERS = 5;
const DEFAULT_GOLD_WORKERS = 5;

const DEFAULT_BUILDINGS = [
  { buildingType: BUILDING_TYPES.CITY_HALL, level: 1, slotIndex: 0 },
  { buildingType: BUILDING_TYPES.WAREHOUSE, level: 1, slotIndex: 1 },
  { buildingType: BUILDING_TYPES.ACADEMY, level: 0, slotIndex: 2 },
  { buildingType: BUILDING_TYPES.BARRACKS, level: 0, slotIndex: 3 },
  { buildingType: BUILDING_TYPES.PORT, level: 0, slotIndex: 4 },
  { buildingType: BUILDING_TYPES.TAVERN, level: 0, slotIndex: 5 },
  { buildingType: BUILDING_TYPES.LUXURY_EXTRACTOR, level: 0, slotIndex: 6 },
  { buildingType: BUILDING_TYPES.FORESTERS_HOUSE, level: 0, slotIndex: 7 },
  { buildingType: BUILDING_TYPES.TRADING_POST, level: 0, slotIndex: 9 },
  { buildingType: BUILDING_TYPES.HOSPITAL, level: 0, slotIndex: 10 },
  { buildingType: BUILDING_TYPES.SHIPYARD, level: 0, slotIndex: 11 },
  { buildingType: BUILDING_TYPES.BUILDERS_GUILD, level: 0, slotIndex: 12 },
  { buildingType: BUILDING_TYPES.WORKSHOP, level: 0, slotIndex: 13 },
  { buildingType: BUILDING_TYPES.PALACE, level: 0, slotIndex: 14 },
  { buildingType: BUILDING_TYPES.WALL, level: 0, slotIndex: 15 },
  { buildingType: BUILDING_TYPES.SPY_AGENCY, level: 0, slotIndex: 16 },
] as const;
const RESOURCE_KEYS = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;

type DefaultBuilding = {
  buildingType: string;
  level: number;
  slotIndex: number;
};

function getColonyDefaultBuildings(luxuryResource?: string | null): DefaultBuilding[] {
  const luxuryBuildingType =
    luxuryResource && luxuryResource in LUXURY_PRODUCTION_BUILDINGS
      ? LUXURY_PRODUCTION_BUILDINGS[luxuryResource as keyof typeof LUXURY_PRODUCTION_BUILDINGS]
      : null;
  const colonyBuildings = DEFAULT_BUILDINGS.map((building) =>
    building.buildingType === BUILDING_TYPES.PALACE
      ? { ...building, buildingType: BUILDING_TYPES.GOVERNOR_RESIDENCY }
      : building,
  );

  return [
    ...colonyBuildings.slice(0, 8),
    ...(luxuryBuildingType ? [{ buildingType: luxuryBuildingType, level: 0, slotIndex: 8 }] : []),
    ...colonyBuildings.slice(8),
  ];
}

@Injectable()
export class MapService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly analyticsService: AnalyticsService | undefined,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly questsService: QuestsService,
  ) {}

  async getWorldMap(worldId: string): Promise<WorldMapResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    if (bootstrap.world.id !== worldId) {
      throw new ApiErrorException('World not found.', 'WORLD_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    await ensureWorldMapGenerated(this.prisma, worldId);

    const selectedCity = await this.getSelectedCityOrThrow(bootstrap.selectedCityId);
    const islands = await this.prisma.island.findMany({
      where: { worldId },
      include: {
        cities: {
          include: { player: true },
          orderBy: { slotIndex: 'asc' },
        },
      },
      orderBy: [{ y: 'asc' }, { x: 'asc' }],
    });

    if (islands.length === 0) {
      throw new ApiErrorException(
        'World map has not been generated yet.',
        'MAP_NOT_GENERATED',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.questsService.handleQuestTrigger(bootstrap.player.id, 'world_map_opened');

    const mapDimensions = getWorldMapDimensions();

    return {
      world: {
        id: bootstrap.world.id,
        name: bootstrap.world.name,
      },
      map: {
        width: mapDimensions.width,
        height: mapDimensions.height,
      },
      selectedCity: {
        id: selectedCity.id,
        name: selectedCity.name,
        islandId: selectedCity.islandId,
        x: selectedCity.island.x,
        y: selectedCity.island.y,
      },
      islands: islands.map((island) => {
        const distance = calculateMapDistance({
          from: { x: selectedCity.island.x, y: selectedCity.island.y },
          to: { x: island.x, y: island.y },
        });

        return {
          id: island.id,
          name: island.name ?? `Island ${island.x}:${island.y}`,
          x: island.x,
          y: island.y,
          mainResource: island.mainResource,
          luxuryResource: island.luxuryResource,
          occupiedSlots: island.cities.length,
          maxSlots: island.maxSlots,
          hasPlayerCity: island.cities.some((city) => city.playerId === bootstrap.player.id),
          distanceFromSelectedCity: distance,
          travelTimeSeconds: calculateTravelTimeSeconds({
            distance,
            baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
            worldSpeed: selectedCity.world.speedTravel,
          }),
          cities: island.cities.map((city) => ({
            id: city.id,
            name: city.name,
            level: city.level,
            slotIndex: city.slotIndex,
            playerId: city.playerId,
            playerName: city.player.name,
            allianceTag: null,
            isOwnedByCurrentPlayer: city.playerId === bootstrap.player.id,
          })),
        };
      }),
    };
  }

  async getIslandDetail(islandId: string): Promise<IslandDetailResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const selectedCity = await this.getSelectedCityOrThrow(bootstrap.selectedCityId);
    const island = await this.prisma.island.findUnique({
      where: { id: islandId },
      include: {
        cities: {
          include: { player: true, workerAssignment: true },
          orderBy: { slotIndex: 'asc' },
        },
        pveCamps: true,
        world: true,
      },
    });

    if (!island || island.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Island not found.', 'ISLAND_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const distance = calculateMapDistance({
      from: { x: selectedCity.island.x, y: selectedCity.island.y },
      to: { x: island.x, y: island.y },
    });
    const travelTimeSeconds = calculateTravelTimeSeconds({
      distance,
      baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
      worldSpeed: selectedCity.world.speedTravel,
    });
    const colonizationContext = await this.getColonizationContext({
      playerId: bootstrap.player.id,
      originCityId: selectedCity.id,
      travelTimeSeconds,
    });
    const barbarianVillage =
      island.pveCamps[0] ?? (await this.ensureBarbarianVillageForIsland(island));
    const barbarianVillageSummary = await this.toBarbarianVillageSummary({
      camp: barbarianVillage,
      island,
      selectedCity,
      playerId: bootstrap.player.id,
    });

    return {
      island: {
        id: island.id,
        name: island.name ?? `Island ${island.x}:${island.y}`,
        x: island.x,
        y: island.y,
        mainResource: island.mainResource,
        luxuryResource: island.luxuryResource,
        maxSlots: island.maxSlots,
      },
      distanceFromSelectedCity: distance,
      travelTimeSeconds,
      slots: this.buildIslandSlots({
        maxSlots: island.maxSlots,
        cities: island.cities,
        playerId: bootstrap.player.id,
        barbarianVillage: barbarianVillageSummary,
        colonizationContext: {
          ...colonizationContext,
          travelTimeSeconds,
        },
      }),
      barbarianVillage: barbarianVillageSummary,
    };
  }

  async settleCity(input: { islandId: string; slotIndex: number }): Promise<SettleCityResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();

    if (!Number.isInteger(input.slotIndex) || input.slotIndex < 0) {
      throw new ApiErrorException(
        'Invalid city slot.',
        'INVALID_CITY_SLOT',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const selectedCity = await tx.city.findUnique({
        where: { id: bootstrap.selectedCityId },
        include: { resources: true },
      });
      if (
        !selectedCity ||
        selectedCity.playerId !== bootstrap.player.id ||
        !selectedCity.resources
      ) {
        throw new ApiErrorException(
          'Origin city not found.',
          'CITY_NOT_FOUND',
          HttpStatus.NOT_FOUND,
        );
      }
      const originResources = selectedCity.resources;

      const island = await tx.island.findUnique({
        where: { id: input.islandId },
        include: {
          cities: true,
        },
      });

      if (!island || island.worldId !== bootstrap.world.id) {
        throw new ApiErrorException('Island not found.', 'ISLAND_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      if (input.slotIndex >= island.maxSlots) {
        throw new ApiErrorException(
          'City slot is locked.',
          'CITY_SLOT_LOCKED',
          HttpStatus.CONFLICT,
        );
      }
      if (input.slotIndex === PVE_CONFIG.villageSlotIndex) {
        throw new ApiErrorException(
          'The Barbarian Village occupies this island slot.',
          'CITY_SLOT_OCCUPIED',
          HttpStatus.CONFLICT,
        );
      }

      const occupiedSlot = island.cities.find((city) => city.slotIndex === input.slotIndex);
      const [palace, cityCount, navigationTechnology] = await Promise.all([
        tx.cityBuilding.findUnique({
          where: {
            cityId_buildingType: {
              cityId: selectedCity.id,
              buildingType: BUILDING_TYPES.PALACE,
            },
          },
        }),
        tx.city.count({ where: { playerId: bootstrap.player.id } }),
        tx.playerTechnology.findUnique({
          where: {
            playerId_technologyId: {
              playerId: bootstrap.player.id,
              technologyId: RESEARCH_TYPES.BASIC_NAVIGATION,
            },
          },
        }),
      ]);
      const cost = calculateColonizationCost({
        currentCityCount: cityCount,
        baseCost: COLONIZATION_CONFIG.baseCost,
      });
      const hasEnoughResources = RESOURCE_KEYS.every(
        (resourceType) => originResources[resourceType] >= cost[resourceType],
      );
      const palaceLevel = palace?.level ?? 0;
      const cityLimit = calculateCityLimit({ palaceLevel });
      const colonyShipCount = calculateColonyShipCount({
        baseColonyShips: COLONIZATION_CONFIG.baseColonyShips,
        colonyShipsPerPalaceLevel: COLONIZATION_CONFIG.colonyShipsPerPalaceLevel,
        palaceLevel,
      });
      const colonizationState = canColonize({
        hasRequiredResearch: navigationTechnology?.status === 'completed',
        hasColonyShip: colonyShipCount > 0,
        palaceLevel,
        cityCount,
        cityLimit,
        targetSlotIsEmpty: !occupiedSlot,
        hasEnoughResources,
      });

      if (!colonizationState.canColonize) {
        throw new ApiErrorException(
          colonizationState.reason ?? 'City cannot be founded here.',
          'COLONIZATION_UNAVAILABLE',
          HttpStatus.BAD_REQUEST,
        );
      }

      const cityName = await this.getAvailableCityName({
        playerId: bootstrap.player.id,
        baseName: `${island.name ?? `Island ${island.x}:${island.y}`} Colony`,
      });

      const city = await tx.city.create({
        data: {
          worldId: bootstrap.world.id,
          playerId: bootstrap.player.id,
          name: cityName,
          level: COLONIZATION_CONFIG.defaultCityLevel,
          population: COLONIZATION_CONFIG.basePopulation,
          populationCapacity: 100,
          happiness: COLONIZATION_CONFIG.baseHappiness,
          islandId: island.id,
          slotIndex: input.slotIndex,
        },
      });

      const updatedOriginResources = await tx.cityResource.update({
        where: { cityId: selectedCity.id },
        data: Object.fromEntries(
          RESOURCE_KEYS.map((resourceType) => [
            resourceType,
            originResources[resourceType] - cost[resourceType],
          ]),
        ),
      });

      await Promise.all(
        RESOURCE_KEYS.filter((resourceType) => cost[resourceType] > 0).map((resourceType) =>
          tx.resourceTransaction.create({
            data: {
              worldId: bootstrap.world.id,
              cityId: selectedCity.id,
              playerId: bootstrap.player.id,
              transactionType: 'colonization_cost',
              resourceType,
              amount: -cost[resourceType],
              balanceAfter: updatedOriginResources[resourceType],
              referenceType: 'city',
              referenceId: city.id,
            },
          }),
        ),
      );

      await tx.cityResource.create({
        data: {
          cityId: city.id,
          ...COLONIZATION_CONFIG.startingResources,
        },
      });

      await Promise.all(
        getColonyDefaultBuildings(island.luxuryResource).map((building) =>
          tx.cityBuilding.create({
            data: {
              cityId: city.id,
              buildingType: building.buildingType,
              level: building.level,
              slotIndex: building.slotIndex,
              status: 'idle',
            },
          }),
        ),
      );

      await tx.cityWorkerAssignment.create({
        data: {
          cityId: city.id,
          woodWorkers: DEFAULT_WOOD_WORKERS,
          goldWorkers: DEFAULT_GOLD_WORKERS,
          luxuryWorkers: 0,
          scientists: 0,
          idleCitizens: city.population - DEFAULT_WOOD_WORKERS - DEFAULT_GOLD_WORKERS,
        },
      });

      await (tx as any).citySpyState.create({
        data: {
          worldId: bootstrap.world.id,
          playerId: bootstrap.player.id,
          cityId: city.id,
        },
      });

      await tx.report.create({
        data: {
          worldId: bootstrap.world.id,
          playerId: bootstrap.player.id,
          cityId: city.id,
          type: 'city_founded',
          title: 'New city founded',
          message: `${city.name} has been founded on ${island.name ?? `Island ${island.x}:${island.y}`}.`,
          payload: {
            cityId: city.id,
            islandId: island.id,
            slotIndex: input.slotIndex,
            cost,
          },
        },
      });
      await tx.gameAnalyticsEvent?.create({
        data: {
          worldId: bootstrap.world.id,
          playerId: bootstrap.player.id,
          eventType: 'colonization_started',
          payload: {
            originCityId: selectedCity.id,
            cityId: city.id,
            islandId: island.id,
            slotIndex: input.slotIndex,
            cost,
          },
        },
      });
      await tx.gameAnalyticsEvent?.create({
        data: {
          worldId: bootstrap.world.id,
          playerId: bootstrap.player.id,
          eventType: 'colonization_completed',
          payload: {
            originCityId: selectedCity.id,
            cityId: city.id,
            islandId: island.id,
            slotIndex: input.slotIndex,
          },
        },
      });

      return {
        city: {
          id: city.id,
          name: city.name,
          level: city.level,
          population: city.population,
          populationCapacity: city.populationCapacity,
          happiness: city.happiness,
          islandId: island.id,
          slotIndex: input.slotIndex,
        },
        resources: {
          wood: updatedOriginResources.wood,
          gold: updatedOriginResources.gold,
          marble: updatedOriginResources.marble,
          wine: updatedOriginResources.wine,
          crystal: updatedOriginResources.crystal,
          sulfur: updatedOriginResources.sulfur,
          lastCalculatedAt: updatedOriginResources.lastCalculatedAt.toISOString(),
        },
      };
    });
  }

  private async getColonizationContext(input: {
    playerId: string;
    originCityId: string;
    travelTimeSeconds: number;
  }) {
    const [originResources, palace, cityCount, navigationTechnology] = await Promise.all([
      this.prisma.cityResource.findUniqueOrThrow({ where: { cityId: input.originCityId } }),
      this.prisma.cityBuilding.findUnique({
        where: {
          cityId_buildingType: {
            cityId: input.originCityId,
            buildingType: BUILDING_TYPES.PALACE,
          },
        },
      }),
      this.prisma.city.count({ where: { playerId: input.playerId } }),
      this.prisma.playerTechnology.findUnique({
        where: {
          playerId_technologyId: {
            playerId: input.playerId,
            technologyId: RESEARCH_TYPES.BASIC_NAVIGATION,
          },
        },
      }),
    ]);
    const palaceLevel = palace?.level ?? 0;
    const cityLimit = calculateCityLimit({ palaceLevel });
    const colonyShipCount = calculateColonyShipCount({
      baseColonyShips: COLONIZATION_CONFIG.baseColonyShips,
      colonyShipsPerPalaceLevel: COLONIZATION_CONFIG.colonyShipsPerPalaceLevel,
      palaceLevel,
    });
    const cost = calculateColonizationCost({
      currentCityCount: cityCount,
      baseCost: COLONIZATION_CONFIG.baseCost,
    });
    const hasEnoughResources = RESOURCE_KEYS.every(
      (resourceType) => originResources[resourceType] >= cost[resourceType],
    );

    return {
      cost,
      palaceLevel,
      cityCount,
      cityLimit,
      hasEnoughResources,
      hasRequiredResearch: navigationTechnology?.status === 'completed',
      hasColonyShip: colonyShipCount > 0,
      travelTimeSeconds: input.travelTimeSeconds,
    };
  }

  private async getSelectedCityOrThrow(cityId: string) {
    const city = await this.prisma.city.findUnique({
      where: { id: cityId },
      include: {
        island: true,
        world: true,
      },
    });

    if (!city || !city.islandId || !city.island) {
      throw new ApiErrorException(
        'Selected city is not placed on the world map.',
        'CITY_NOT_PLACED_ON_MAP',
        HttpStatus.CONFLICT,
      );
    }

    return {
      ...city,
      islandId: city.islandId,
      island: city.island,
    };
  }

  private async getAvailableCityName(input: {
    playerId: string;
    baseName: string;
  }): Promise<string> {
    const existingCities = await this.prisma.city.findMany({
      where: {
        playerId: input.playerId,
        name: {
          startsWith: input.baseName,
        },
      },
      select: { name: true },
    });
    const existingNames = new Set(existingCities.map((city) => city.name));

    if (!existingNames.has(input.baseName)) {
      return input.baseName;
    }

    for (let suffix = 2; suffix < 100; suffix += 1) {
      const candidate = `${input.baseName} ${suffix}`;
      if (!existingNames.has(candidate)) {
        return candidate;
      }
    }

    return `${input.baseName} ${Date.now()}`;
  }

  private buildIslandSlots(input: {
    maxSlots: number;
    cities: Array<{
      id: string;
      name: string;
      level: number;
      population: number;
      populationCapacity: number;
      playerId: string;
      slotIndex: number | null;
      player: { id: string; name: string };
      workerAssignment: {
        woodWorkers: number;
        goldWorkers: number;
        luxuryWorkers: number;
        scientists: number;
        idleCitizens: number;
      } | null;
    }>;
    playerId: string;
    barbarianVillage?: IslandDetailResponse['barbarianVillage'];
    colonizationContext?: {
      cost: Record<(typeof RESOURCE_KEYS)[number], number>;
      palaceLevel: number;
      cityCount: number;
      cityLimit: number;
      hasEnoughResources: boolean;
      hasRequiredResearch: boolean;
      hasColonyShip: boolean;
      travelTimeSeconds: number;
    };
  }): IslandSlotSummary[] {
    const citiesBySlot = new Map(
      input.cities
        .filter((city) => city.slotIndex !== null)
        .map((city) => [city.slotIndex as number, city]),
    );

    return Array.from({ length: input.maxSlots }, (_, slotIndex) => {
      if (input.barbarianVillage && slotIndex === input.barbarianVillage.slotIndex) {
        return {
          slotIndex,
          status: 'barbarian_village',
          city: null,
          barbarianVillage: {
            id: input.barbarianVillage.id,
            name: input.barbarianVillage.name,
            level: input.barbarianVillage.level,
            enemyStrength: input.barbarianVillage.enemyStrength,
            strengthLabel: input.barbarianVillage.strengthLabel,
            rewards: input.barbarianVillage.rewards,
          },
        };
      }

      const city = citiesBySlot.get(slotIndex);
      if (!city) {
        const colonizationState = input.colonizationContext
          ? canColonize({
              hasRequiredResearch: input.colonizationContext.hasRequiredResearch,
              hasColonyShip: input.colonizationContext.hasColonyShip,
              palaceLevel: input.colonizationContext.palaceLevel,
              cityCount: input.colonizationContext.cityCount,
              cityLimit: input.colonizationContext.cityLimit,
              targetSlotIsEmpty: true,
              hasEnoughResources: input.colonizationContext.hasEnoughResources,
            })
          : null;

        return {
          slotIndex,
          status: 'empty',
          city: null,
          colonization: input.colonizationContext
            ? {
                canColonize: Boolean(colonizationState?.canColonize),
                disabledReason: colonizationState?.reason ?? null,
                cost: input.colonizationContext.cost,
                travelTimeSeconds: input.colonizationContext.travelTimeSeconds,
              }
            : undefined,
        };
      }

      return {
        slotIndex,
        status: 'occupied',
        city: {
          id: city.id,
          name: city.name,
          level: city.level,
          playerId: city.player.id,
          playerName: city.player.name,
          allianceTag: null,
          isOwnedByCurrentPlayer: city.playerId === input.playerId,
          ...(city.playerId === input.playerId
            ? {
                population: {
                  current: city.population,
                  capacity: city.populationCapacity,
                },
                workers: city.workerAssignment
                  ? {
                      woodWorkers: city.workerAssignment.woodWorkers,
                      goldWorkers: city.workerAssignment.goldWorkers,
                      luxuryWorkers: city.workerAssignment.luxuryWorkers,
                      scientists: city.workerAssignment.scientists,
                      idleCitizens: city.workerAssignment.idleCitizens,
                    }
                  : {
                      woodWorkers: DEFAULT_WOOD_WORKERS,
                      goldWorkers: DEFAULT_GOLD_WORKERS,
                      luxuryWorkers: 0,
                      scientists: 0,
                      idleCitizens: Math.max(
                        0,
                        city.population - DEFAULT_WOOD_WORKERS - DEFAULT_GOLD_WORKERS,
                      ),
                    },
              }
            : {}),
        },
      };
    });
  }

  private async ensureBarbarianVillageForIsland(island: {
    id: string;
    worldId: string;
    x: number;
    y: number;
    name: string | null;
  }) {
    const levelConfig = getPveCampLevelConfig(1);

    return this.prisma.pveCamp.upsert({
      where: { islandId: island.id },
      update: {},
      create: {
        worldId: island.worldId,
        islandId: island.id,
        name: `${island.name ?? `Island ${island.x}:${island.y}`} Barbarian Village`,
        level: 1,
        enemyStrength: levelConfig.enemyStrength,
        slotIndex: PVE_CONFIG.villageSlotIndex,
      },
    });
  }

  private async toBarbarianVillageSummary(input: {
    camp: {
      id: string;
      name: string;
      islandId: string;
      level: number;
      enemyStrength: number;
      slotIndex: number;
    };
    island: { id: string; name: string | null; x: number; y: number };
    selectedCity: { island: { x: number; y: number }; world: { speedTravel: number } };
    playerId: string;
  }): Promise<NonNullable<IslandDetailResponse['barbarianVillage']>> {
    const progress = await this.prisma.playerPveCampProgress.findUnique({
      where: { playerId_pveCampId: { playerId: input.playerId, pveCampId: input.camp.id } },
      select: { victoryCount: true },
    });
    const level = Math.min(PVE_CONFIG.maxVillageLevel, 1 + (progress?.victoryCount ?? 0));
    const levelConfig = getPveCampLevelConfig(level);
    const distance = calculateMapDistance({
      from: { x: input.selectedCity.island.x, y: input.selectedCity.island.y },
      to: { x: input.island.x, y: input.island.y },
    });
    const normalTravelTimeSeconds = calculateTravelTimeSeconds({
      distance,
      baseSecondsPerDistance: MAP_CONFIG.baseSecondsPerDistance,
      worldSpeed: input.selectedCity.world.speedTravel,
    });

    return {
      id: input.camp.id,
      name: input.camp.name,
      level,
      slotIndex: input.camp.slotIndex,
      island: {
        id: input.island.id,
        name: input.island.name ?? `Island ${input.island.x}:${input.island.y}`,
        x: input.island.x,
        y: input.island.y,
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
}
