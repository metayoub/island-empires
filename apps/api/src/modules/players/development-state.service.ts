import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import {
  BUILDING_TYPES,
  LUXURY_PRODUCTION_BUILDINGS,
  MAP_CONFIG,
  TUTORIAL_QUESTS,
} from '@island-empires/config';
import type { BootstrapResponse } from '@island-empires/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { AuthContextService } from '../auth/auth-context.service';
import { authRequiredError } from '../auth/auth.errors';
import { ensureWorldMapGenerated } from '../map/world-map-generation';

const DEVELOPMENT_USER_EMAIL = 'dev@island-empires.local';
const DEFAULT_WORLD_NAME = 'First World';
const DEFAULT_PLAYER_NAME = 'Founder';
const DEFAULT_CITY_NAME = 'New Haven';
const DEFAULT_WOOD_WORKERS = 5;
const DEFAULT_GOLD_WORKERS = 5;
const BEGINNER_AREA_RADIUS = 260;
const SPRINT_11_TEST_ACCOUNTS = [
  {
    playerName: 'Sprint 11 Fresh Player',
    cityName: 'Fresh Harbor',
    slotIndex: 1,
    resources: { wood: 500, gold: 300, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
    buildings: { city_hall: 1, warehouse: 1 },
    workers: { woodWorkers: 5, goldWorkers: 5, luxuryWorkers: 0, scientists: 0 },
    researchPoints: 0,
    technologies: [] as string[],
    units: {} as Record<string, number>,
  },
  {
    playerName: 'Sprint 11 Economy Player',
    cityName: 'Scholar Bay',
    slotIndex: 2,
    resources: { wood: 420, gold: 260, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
    buildings: { city_hall: 2, warehouse: 2, academy: 1, tavern: 1 },
    workers: { woodWorkers: 7, goldWorkers: 5, luxuryWorkers: 0, scientists: 5 },
    researchPoints: 35,
    technologies: [] as string[],
    units: {} as Record<string, number>,
    activeResearch: 'improved_woodcutting',
  },
  {
    playerName: 'Sprint 11 Military Player',
    cityName: 'Spearwatch',
    slotIndex: 3,
    resources: { wood: 520, gold: 340, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
    buildings: { city_hall: 2, warehouse: 2, academy: 1, barracks: 1, tavern: 1 },
    workers: { woodWorkers: 8, goldWorkers: 6, luxuryWorkers: 0, scientists: 4 },
    researchPoints: 25,
    technologies: ['improved_woodcutting', 'basic_training'] as string[],
    units: { spearman: 8 },
  },
  {
    playerName: 'Sprint 11 Expansion Player',
    cityName: 'Crownreach',
    slotIndex: 4,
    resources: { wood: 950, gold: 650, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
    buildings: { city_hall: 3, warehouse: 3, academy: 2, barracks: 2, tavern: 2, palace: 1 },
    workers: { woodWorkers: 10, goldWorkers: 7, luxuryWorkers: 0, scientists: 6 },
    researchPoints: 80,
    technologies: [
      'improved_woodcutting',
      'basic_storage',
      'basic_navigation',
      'basic_training',
    ] as string[],
    units: { spearman: 12, archer: 4 },
  },
] as const;

const DEFAULT_BUILDINGS = [
  { buildingType: BUILDING_TYPES.CITY_HALL, level: 1, slotIndex: 0 },
  { buildingType: BUILDING_TYPES.WAREHOUSE, level: 1, slotIndex: 1 },
  { buildingType: BUILDING_TYPES.ACADEMY, level: 0, slotIndex: 2 },
  { buildingType: BUILDING_TYPES.BARRACKS, level: 0, slotIndex: 3 },
  { buildingType: BUILDING_TYPES.PORT, level: 0, slotIndex: 4 },
  { buildingType: BUILDING_TYPES.TAVERN, level: 0, slotIndex: 5 },
  { buildingType: BUILDING_TYPES.LUXURY_EXTRACTOR, level: 0, slotIndex: 6 },
  { buildingType: BUILDING_TYPES.FORESTERS_HOUSE, level: 0, slotIndex: 7 },
  { buildingType: BUILDING_TYPES.MARKETPLACE, level: 0, slotIndex: 8 },
  { buildingType: BUILDING_TYPES.TRADING_POST, level: 0, slotIndex: 9 },
  { buildingType: BUILDING_TYPES.HOSPITAL, level: 0, slotIndex: 10 },
  { buildingType: BUILDING_TYPES.SHIPYARD, level: 0, slotIndex: 11 },
  { buildingType: BUILDING_TYPES.BUILDERS_GUILD, level: 0, slotIndex: 12 },
  { buildingType: BUILDING_TYPES.WORKSHOP, level: 0, slotIndex: 13 },
  { buildingType: BUILDING_TYPES.PALACE, level: 0, slotIndex: 14 },
  { buildingType: BUILDING_TYPES.WALL, level: 0, slotIndex: 15 },
  { buildingType: BUILDING_TYPES.SPY_AGENCY, level: 0, slotIndex: 16 },
] as const;

type DefaultBuilding = {
  buildingType: string;
  level: number;
  slotIndex: number;
};

function getDefaultBuildings(input: {
  luxuryResource?: string | null;
  isColony: boolean;
}): DefaultBuilding[] {
  const luxuryBuildingType =
    input.luxuryResource && input.luxuryResource in LUXURY_PRODUCTION_BUILDINGS
      ? LUXURY_PRODUCTION_BUILDINGS[
          input.luxuryResource as keyof typeof LUXURY_PRODUCTION_BUILDINGS
        ]
      : null;
  const baseBuildings = DEFAULT_BUILDINGS.map((building) =>
    input.isColony && building.buildingType === BUILDING_TYPES.PALACE
      ? { ...building, buildingType: BUILDING_TYPES.GOVERNOR_RESIDENCY }
      : building,
  );

  return [
    ...baseBuildings.slice(0, 8),
    ...(luxuryBuildingType ? [{ buildingType: luxuryBuildingType, level: 0, slotIndex: 8 }] : []),
    ...baseBuildings.slice(8),
  ];
}

@Injectable()
export class DevelopmentStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional() private readonly authContextService?: AuthContextService,
  ) {}

  async ensureDevelopmentState(): Promise<BootstrapResponse> {
    const auth = this.authContextService?.get();
    if (auth) {
      return this.getBootstrapForPlayer(auth.playerId);
    }
    if (!this.configService.get<boolean>('auth.devMode', false)) {
      throw authRequiredError();
    }

    return this.prisma.$transaction(async (tx) => {
      const existingWorld = await tx.world.findFirst({
        where: { name: DEFAULT_WORLD_NAME },
      });
      const world =
        existingWorld ??
        (await tx.world.create({
          data: {
            name: DEFAULT_WORLD_NAME,
            status: 'development',
            speedBuilding: 1,
            speedResearch: 1,
            speedResource: 1,
            speedTravel: 1,
          },
        }));

      const user = await (tx as any).user.upsert({
        where: { email: DEVELOPMENT_USER_EMAIL },
        update: { isAdmin: true },
        create: {
          email: DEVELOPMENT_USER_EMAIL,
          passwordHash: 'dev-disabled',
          displayName: DEFAULT_PLAYER_NAME,
          isAdmin: true,
          termsAcceptedAt: new Date(),
          privacyAcceptedAt: new Date(),
        },
      });

      const player = await tx.player.upsert({
        where: {
          worldId_name: {
            worldId: world.id,
            name: DEFAULT_PLAYER_NAME,
          },
        },
        update: {},
        create: {
          userId: user.id,
          worldId: world.id,
          name: DEFAULT_PLAYER_NAME,
          score: 0,
        },
      });

      await ensureWorldMapGenerated(tx, world.id);
      const startingIsland = await tx.island.findUniqueOrThrow({
        where: {
          worldId_x_y: {
            worldId: world.id,
            x: MAP_CONFIG.startingIsland.x,
            y: MAP_CONFIG.startingIsland.y,
          },
        },
      });

      const existingCity = await tx.city.findFirst({
        where: {
          playerId: player.id,
          name: DEFAULT_CITY_NAME,
        },
      });
      const city =
        existingCity ??
        (await tx.city.create({
          data: {
            worldId: world.id,
            playerId: player.id,
            name: DEFAULT_CITY_NAME,
            level: 1,
            population: 50,
            populationCapacity: 100,
            happiness: 100,
            islandId: startingIsland.id,
            slotIndex: MAP_CONFIG.startingSlotIndex,
          },
        }));

      const placedCity =
        city.islandId === startingIsland.id && city.slotIndex === MAP_CONFIG.startingSlotIndex
          ? city
          : await tx.city.update({
              where: { id: city.id },
              data: {
                islandId: startingIsland.id,
                slotIndex: MAP_CONFIG.startingSlotIndex,
              },
            });

      await tx.cityResource.upsert({
        where: { cityId: placedCity.id },
        update: {},
        create: {
          cityId: placedCity.id,
          wood: 500,
          gold: 300,
          marble: 0,
          wine: 0,
          crystal: 0,
          sulfur: 0,
        },
      });

      await this.ensureDefaultBuildingsForCity(
        tx,
        placedCity.id,
        getDefaultBuildings({ luxuryResource: startingIsland.luxuryResource, isColony: false }),
      );
      await this.ensureSpyStateForCity(tx, placedCity);

      const playerCities = await tx.city.findMany({
        where: { playerId: player.id },
        select: { id: true, worldId: true, playerId: true, island: { select: { luxuryResource: true } } },
        orderBy: { createdAt: 'asc' },
      });

      await Promise.all(
        playerCities
          .filter((playerCity) => playerCity.id !== placedCity.id)
          .map(async (playerCity) => {
            await this.ensureDefaultBuildingsForCity(
              tx,
              playerCity.id,
              getDefaultBuildings({
                luxuryResource: playerCity.island?.luxuryResource ?? null,
                isColony: true,
              }),
            );
            await this.ensureSpyStateForCity(tx, playerCity);
          }),
      );

      await tx.cityWorkerAssignment.upsert({
        where: { cityId: placedCity.id },
        update: {
          idleCitizens: Math.max(
            0,
            placedCity.population - DEFAULT_WOOD_WORKERS - DEFAULT_GOLD_WORKERS,
          ),
        },
        create: {
          cityId: placedCity.id,
          woodWorkers: DEFAULT_WOOD_WORKERS,
          goldWorkers: DEFAULT_GOLD_WORKERS,
          luxuryWorkers: 0,
          scientists: 0,
          idleCitizens: placedCity.population - DEFAULT_WOOD_WORKERS - DEFAULT_GOLD_WORKERS,
        },
      });

      await tx.playerResearchState.upsert({
        where: { playerId: player.id },
        update: {},
        create: {
          playerId: player.id,
          worldId: world.id,
          researchPoints: 0,
          researchLastCalculatedAt: new Date(),
        },
      });
      await this.ensureSprint11TestAccounts(tx, {
        userId: user.id,
        worldId: world.id,
        startingIslandId: startingIsland.id,
        luxuryResource: startingIsland.luxuryResource,
      });

      const firstQuest = TUTORIAL_QUESTS[0];
      await tx.playerQuestProgress.upsert({
        where: { playerId_questId: { playerId: player.id, questId: firstQuest.id } },
        update: {},
        create: {
          worldId: world.id,
          playerId: player.id,
          questId: firstQuest.id,
          status: 'active',
          progress: 0,
          target: firstQuest.target,
        },
      });

      const onboardingState = await tx.playerOnboardingState.upsert({
        where: { playerId: player.id },
        update: {},
        create: {
          playerId: player.id,
          worldId: world.id,
          hasCompletedTutorial: false,
          currentQuestId: firstQuest.id,
          guideDismissed: false,
        },
      });

      return {
        player: {
          id: player.id,
          name: player.name,
          score: player.score,
          beginnerProtectionEndsAt: this.getBeginnerProtectionEndsAt(player.createdAt),
        },
        world: {
          id: world.id,
          name: world.name,
          status: world.status,
        },
        selectedCityId: player.selectedCityId ?? placedCity.id,
        onboarding: {
          hasCompletedTutorial: onboardingState.hasCompletedTutorial,
          currentQuestId: onboardingState.currentQuestId,
        },
      };
    });
  }

  async ensureStateForUser(input: {
    userId: string;
    playerName: string;
    worldName?: string;
    worldStatus?: string;
  }): Promise<BootstrapResponse> {
    return this.prisma.$transaction(async (tx) => {
      const worldName = input.worldName ?? DEFAULT_WORLD_NAME;
      const existingWorld = await tx.world.findFirst({
        where: { name: worldName },
      });
      const world =
        existingWorld ??
        (await tx.world.create({
          data: {
            name: worldName,
            status: input.worldStatus ?? 'development',
            speedBuilding: 1,
            speedResearch: 1,
            speedResource: 1,
            speedTravel: 1,
          },
        }));

      await ensureWorldMapGenerated(tx, world.id);
      const existingPlayer = await tx.player.findFirst({
        where: { userId: input.userId, worldId: world.id },
        orderBy: { createdAt: 'asc' },
      });
      const player =
        existingPlayer ??
        (await tx.player.create({
          data: {
            userId: input.userId,
            worldId: world.id,
            name: await this.getAvailablePlayerName(tx, world.id, input.playerName),
            score: 0,
          },
        }));

      const existingCity = await tx.city.findFirst({
        where: { playerId: player.id },
        orderBy: { createdAt: 'asc' },
      });
      let city = existingCity;
      let cityIsland: { luxuryResource: string } | null = city?.islandId
        ? await tx.island.findUniqueOrThrow({ where: { id: city.islandId } })
        : null;
      if (!city) {
        const placement = await this.getBeginnerCityPlacement(tx, world.id);
        city = await tx.city.create({
          data: {
            worldId: world.id,
            playerId: player.id,
            name: 'New Haven',
            level: 1,
            population: 50,
            populationCapacity: 100,
            happiness: 100,
            islandId: placement.island.id,
            slotIndex: placement.slotIndex,
          },
        });
        cityIsland = placement.island;
      }
      if (!cityIsland) {
        throw new Error(`City ${city.id} is not placed on a world island.`);
      }

      await tx.player.update({
        where: { id: player.id },
        data: { selectedCityId: player.selectedCityId ?? city.id },
      });

      await tx.cityResource.upsert({
        where: { cityId: city.id },
        update: {},
        create: {
          cityId: city.id,
          wood: 500,
          gold: 300,
          marble: 0,
          wine: 0,
          crystal: 0,
          sulfur: 0,
        },
      });
      await this.ensureDefaultBuildingsForCity(
        tx,
        city.id,
        getDefaultBuildings({ luxuryResource: cityIsland.luxuryResource, isColony: false }),
      );
      await this.ensureSpyStateForCity(tx, city);
      await tx.cityWorkerAssignment.upsert({
        where: { cityId: city.id },
        update: {
          idleCitizens: Math.max(0, city.population - DEFAULT_WOOD_WORKERS - DEFAULT_GOLD_WORKERS),
        },
        create: {
          cityId: city.id,
          woodWorkers: DEFAULT_WOOD_WORKERS,
          goldWorkers: DEFAULT_GOLD_WORKERS,
          luxuryWorkers: 0,
          scientists: 0,
          idleCitizens: city.population - DEFAULT_WOOD_WORKERS - DEFAULT_GOLD_WORKERS,
        },
      });
      await tx.playerResearchState.upsert({
        where: { playerId: player.id },
        update: {},
        create: {
          playerId: player.id,
          worldId: world.id,
          researchPoints: 0,
          researchLastCalculatedAt: new Date(),
        },
      });
      const firstQuest = TUTORIAL_QUESTS[0];
      await tx.playerQuestProgress.upsert({
        where: { playerId_questId: { playerId: player.id, questId: firstQuest.id } },
        update: {},
        create: {
          worldId: world.id,
          playerId: player.id,
          questId: firstQuest.id,
          status: 'active',
          progress: 0,
          target: firstQuest.target,
        },
      });
      const onboardingState = await tx.playerOnboardingState.upsert({
        where: { playerId: player.id },
        update: {},
        create: {
          playerId: player.id,
          worldId: world.id,
          hasCompletedTutorial: false,
          currentQuestId: firstQuest.id,
          guideDismissed: false,
        },
      });

      return {
        player: {
          id: player.id,
          name: player.name,
          score: player.score,
          beginnerProtectionEndsAt: this.getBeginnerProtectionEndsAt(player.createdAt),
        },
        world: { id: world.id, name: world.name, status: world.status },
        selectedCityId: player.selectedCityId ?? city.id,
        onboarding: {
          hasCompletedTutorial: onboardingState.hasCompletedTutorial,
          currentQuestId: onboardingState.currentQuestId,
        },
      };
    });
  }

  private async getBootstrapForPlayer(playerId: string): Promise<BootstrapResponse> {
    const player = await this.prisma.player.findUniqueOrThrow({
      where: { id: playerId },
      include: {
        world: true,
        cities: { orderBy: { createdAt: 'asc' }, take: 1 },
        onboardingState: true,
      },
    });
    const selectedCityId = player.selectedCityId ?? player.cities[0]?.id;
    if (!selectedCityId) {
      return this.ensureStateForUser({ userId: player.userId, playerName: player.name });
    }

    return {
      player: {
        id: player.id,
        name: player.name,
        score: player.score,
        beginnerProtectionEndsAt: this.getBeginnerProtectionEndsAt(player.createdAt),
      },
      world: { id: player.world.id, name: player.world.name, status: player.world.status },
      selectedCityId,
      onboarding: {
        hasCompletedTutorial: player.onboardingState?.hasCompletedTutorial ?? false,
        currentQuestId: player.onboardingState?.currentQuestId ?? TUTORIAL_QUESTS[0]?.id ?? null,
      },
    };
  }

  private async ensureDefaultBuildingsForCity(
    tx: Prisma.TransactionClient,
    cityId: string,
    buildings: readonly DefaultBuilding[],
  ): Promise<void> {
    const existingBuildings = await tx.cityBuilding.findMany({
      where: { cityId },
      select: { buildingType: true, slotIndex: true },
    });
    const existingTypes = new Set(existingBuildings.map((building) => building.buildingType));
    const usedSlots = new Set(existingBuildings.map((building) => building.slotIndex));
    let nextSlotIndex =
      Math.max(-1, ...existingBuildings.map((building) => building.slotIndex)) + 1;

    for (const building of buildings) {
      if (existingTypes.has(building.buildingType)) {
        continue;
      }

      let slotIndex = building.slotIndex;
      if (usedSlots.has(slotIndex)) {
        while (usedSlots.has(nextSlotIndex)) {
          nextSlotIndex += 1;
        }
        slotIndex = nextSlotIndex;
      }

      await tx.cityBuilding.create({
        data: {
          cityId,
          buildingType: building.buildingType,
          level: building.level,
          slotIndex,
          status: 'idle',
        },
      });
      usedSlots.add(slotIndex);
      existingTypes.add(building.buildingType);
    }
  }

  private async ensureSpyStateForCity(
    tx: Prisma.TransactionClient,
    city: { id: string; worldId: string; playerId: string },
  ): Promise<void> {
    await (tx as any).citySpyState.upsert({
      where: { cityId: city.id },
      create: {
        worldId: city.worldId,
        playerId: city.playerId,
        cityId: city.id,
      },
      update: {},
    });
  }

  private async ensureSprint11TestAccounts(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      worldId: string;
      startingIslandId: string;
      luxuryResource: string;
    },
  ): Promise<void> {
    for (const account of SPRINT_11_TEST_ACCOUNTS) {
      const player = await tx.player.upsert({
        where: { worldId_name: { worldId: input.worldId, name: account.playerName } },
        update: {},
        create: {
          userId: input.userId,
          worldId: input.worldId,
          name: account.playerName,
          score: 0,
        },
      });
      const existingCity = await tx.city.findFirst({
        where: { playerId: player.id, name: account.cityName },
      });
      const slotIndex =
        existingCity?.slotIndex ??
        (await this.getAvailableSlotIndex(tx, input.startingIslandId, account.slotIndex));
      const city =
        existingCity ??
        (await tx.city.create({
          data: {
            worldId: input.worldId,
            playerId: player.id,
            name: account.cityName,
            level: 1,
            population: 50,
            populationCapacity: 100,
            happiness: 100,
            islandId: input.startingIslandId,
            slotIndex,
          },
        }));

      await tx.cityResource.upsert({
        where: { cityId: city.id },
        update: account.resources,
        create: { cityId: city.id, ...account.resources },
      });
      await this.ensureDefaultBuildingsForCity(
        tx,
        city.id,
        getDefaultBuildings({ luxuryResource: input.luxuryResource, isColony: false }),
      );
      await this.ensureSpyStateForCity(tx, city);
      await Promise.all(
        Object.entries(account.buildings).map(([buildingType, level]) =>
          tx.cityBuilding.update({
            where: { cityId_buildingType: { cityId: city.id, buildingType } },
            data: { level, status: 'idle', upgradeStartedAt: null, upgradeFinishesAt: null },
          }),
        ),
      );
      await tx.cityWorkerAssignment.upsert({
        where: { cityId: city.id },
        update: {
          ...account.workers,
          idleCitizens: Math.max(
            0,
            city.population -
              account.workers.woodWorkers -
              account.workers.goldWorkers -
              account.workers.luxuryWorkers -
              account.workers.scientists,
          ),
        },
        create: {
          cityId: city.id,
          ...account.workers,
          idleCitizens:
            city.population -
            account.workers.woodWorkers -
            account.workers.goldWorkers -
            account.workers.luxuryWorkers -
            account.workers.scientists,
        },
      });
      await tx.playerResearchState.upsert({
        where: { playerId: player.id },
        update: { researchPoints: account.researchPoints },
        create: {
          playerId: player.id,
          worldId: input.worldId,
          researchPoints: account.researchPoints,
          researchLastCalculatedAt: new Date(),
        },
      });
      await Promise.all(
        account.technologies.map((technologyId) =>
          tx.playerTechnology.upsert({
            where: { playerId_technologyId: { playerId: player.id, technologyId } },
            update: {},
            create: { playerId: player.id, worldId: input.worldId, technologyId },
          }),
        ),
      );
      if ('activeResearch' in account && account.activeResearch) {
        const existingActiveResearch = await tx.researchJob.findFirst({
          where: { playerId: player.id, status: 'active' },
        });
        if (!existingActiveResearch) {
          const startedAt = new Date(Date.now() - 30 * 60 * 1000);
          await tx.researchJob.create({
            data: {
              worldId: input.worldId,
              playerId: player.id,
              technologyId: account.activeResearch,
              status: 'active',
              startedAt,
              finishesAt: new Date(startedAt.getTime() + 90 * 60 * 1000),
            },
          });
        }
      }
      await Promise.all(
        Object.entries(account.units).map(([unitType, quantity]) =>
          tx.cityUnit.upsert({
            where: { cityId_unitType: { cityId: city.id, unitType } },
            update: { quantity },
            create: { cityId: city.id, unitType, quantity },
          }),
        ),
      );
    }
  }

  private async getAvailableSlotIndex(
    tx: Prisma.TransactionClient,
    islandId: string,
    preferredSlotIndex: number,
  ): Promise<number> {
    const occupiedCities = await tx.city.findMany({
      where: { islandId },
      select: { slotIndex: true },
    });
    const occupiedSlots = new Set(
      occupiedCities
        .map((city) => city.slotIndex)
        .filter((slotIndex): slotIndex is number => slotIndex !== null),
    );
    if (!occupiedSlots.has(preferredSlotIndex)) {
      return preferredSlotIndex;
    }
    for (let slotIndex = 1; slotIndex < MAP_CONFIG.defaultIslandSlots; slotIndex += 1) {
      if (!occupiedSlots.has(slotIndex) && slotIndex !== MAP_CONFIG.startingSlotIndex) {
        return slotIndex;
      }
    }

    throw new Error(`No available city slots remain on island ${islandId}.`);
  }

  private async getBeginnerCityPlacement(
    tx: Prisma.TransactionClient,
    worldId: string,
  ): Promise<{
    island: {
      id: string;
      luxuryResource: string;
    };
    slotIndex: number;
  }> {
    const islands = await tx.island.findMany({
      where: { worldId },
      include: { cities: { select: { slotIndex: true } } },
      orderBy: [{ y: 'asc' }, { x: 'asc' }],
    });
    const sortedIslands = islands
      .map((island) => ({
        island,
        distanceFromStart: this.getDistanceFromStartingIsland(island.x, island.y),
      }))
      .sort((left, right) => {
        const leftIsBeginner = left.distanceFromStart <= BEGINNER_AREA_RADIUS;
        const rightIsBeginner = right.distanceFromStart <= BEGINNER_AREA_RADIUS;
        if (leftIsBeginner !== rightIsBeginner) {
          return leftIsBeginner ? -1 : 1;
        }
        const occupiedDelta = left.island.cities.length - right.island.cities.length;
        if (occupiedDelta !== 0) {
          return occupiedDelta;
        }
        return left.distanceFromStart - right.distanceFromStart;
      });

    for (const { island } of sortedIslands) {
      const slotIndex = this.findOpenSlotIndex(
        island.cities.map((city) => city.slotIndex).filter((slot): slot is number => slot !== null),
      );
      if (slotIndex !== null) {
        return {
          island: {
            id: island.id,
            luxuryResource: island.luxuryResource,
          },
          slotIndex,
        };
      }
    }

    throw new Error('No available beginner city placement found.');
  }

  private findOpenSlotIndex(occupiedSlotList: number[]): number | null {
    const occupiedSlots = new Set(occupiedSlotList);
    if (!occupiedSlots.has(MAP_CONFIG.startingSlotIndex)) {
      return MAP_CONFIG.startingSlotIndex;
    }

    for (let slotIndex = 1; slotIndex < MAP_CONFIG.defaultIslandSlots; slotIndex += 1) {
      if (!occupiedSlots.has(slotIndex)) {
        return slotIndex;
      }
    }

    return null;
  }

  private getDistanceFromStartingIsland(x: number, y: number): number {
    const deltaX = x - MAP_CONFIG.startingIsland.x;
    const deltaY = y - MAP_CONFIG.startingIsland.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private getBeginnerProtectionEndsAt(createdAt: Date): string | null {
    const endsAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    return endsAt > new Date() ? endsAt.toISOString() : null;
  }

  private async getAvailablePlayerName(
    tx: Prisma.TransactionClient,
    worldId: string,
    preferredName: string,
  ): Promise<string> {
    const baseName = preferredName.trim().slice(0, 30) || DEFAULT_PLAYER_NAME;
    const existing = await tx.player.findUnique({
      where: { worldId_name: { worldId, name: baseName } },
      select: { id: true },
    });
    if (!existing) {
      return baseName;
    }

    for (let suffix = 2; suffix < 1000; suffix += 1) {
      const suffixText = ` ${suffix}`;
      const candidate = `${baseName.slice(0, 30 - suffixText.length)}${suffixText}`;
      const conflict = await tx.player.findUnique({
        where: { worldId_name: { worldId, name: candidate } },
        select: { id: true },
      });
      if (!conflict) {
        return candidate;
      }
    }

    throw new Error('No available player name found for account.');
  }
}
