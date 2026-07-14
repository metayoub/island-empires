import { Test } from '@nestjs/testing';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { QuestsService } from '../quests/quests.service';
import { MapService } from './map.service';

const WORLD_ID = 'world-1';
const PLAYER_ID = 'player-1';
const CITY_ID = 'city-1';
const ISLAND_ID = 'island-new-haven-atoll';

function buildMapPrisma() {
  const player = { id: PLAYER_ID, name: 'Founder' };
  const world = {
    id: WORLD_ID,
    name: 'First World',
    status: 'development',
    speedTravel: 1,
  };
  const selectedIsland = {
    id: ISLAND_ID,
    worldId: WORLD_ID,
    x: 500,
    y: 340,
    name: 'New Haven Atoll',
    mainResource: 'wood',
    luxuryResource: 'marble',
    maxSlots: 12,
  };
  const city = {
    id: CITY_ID,
    worldId: WORLD_ID,
    playerId: PLAYER_ID,
    islandId: ISLAND_ID,
    slotIndex: 0,
    name: 'New Haven',
    level: 1,
    island: selectedIsland,
    world,
    player,
    resources: {
      cityId: CITY_ID,
      wood: 1000,
      gold: 800,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
      lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  };
  const adjacentIsland = {
    id: 'island-amber-coast',
    worldId: WORLD_ID,
    x: 612,
    y: 456,
    name: 'Amber Coast',
    mainResource: 'wood',
    luxuryResource: 'wine',
    maxSlots: 12,
  };
  const islands = [
    { ...selectedIsland, cities: [city] },
    { ...adjacentIsland, cities: [] },
  ];

  const prisma = {
    island: {
      count: jest.fn().mockResolvedValue(25),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue(islands),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.id === ISLAND_ID) {
          return Promise.resolve({
            ...selectedIsland,
            world,
            cities: [city],
            pveCamps: [
              {
                id: 'camp-1',
                worldId: WORLD_ID,
                islandId: ISLAND_ID,
                name: 'New Haven Atoll Barbarian Village',
                level: 1,
                enemyStrength: 40,
                slotIndex: 11,
              },
            ],
          });
        }
        return Promise.resolve(null);
      }),
    },
    pveCamp: {
      upsert: jest.fn().mockResolvedValue({
        id: 'camp-1',
        worldId: WORLD_ID,
        islandId: ISLAND_ID,
        name: 'New Haven Atoll Barbarian Village',
        level: 1,
        enemyStrength: 40,
        slotIndex: 11,
      }),
    },
    playerPveCampProgress: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    city: {
      findUnique: jest.fn().mockResolvedValue(city),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue({
        id: 'city-2',
        worldId: WORLD_ID,
        playerId: PLAYER_ID,
        islandId: ISLAND_ID,
        slotIndex: 1,
        name: 'New Haven Atoll Colony',
        level: 1,
        population: 30,
        populationCapacity: 100,
        happiness: 100,
      }),
    },
    cityResource: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(city.resources),
      update: jest.fn().mockResolvedValue({
        ...city.resources,
        wood: 200,
        gold: 300,
      }),
      create: jest.fn().mockResolvedValue({}),
    },
    cityBuilding: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'palace-1',
        cityId: CITY_ID,
        buildingType: 'palace',
        level: 1,
        slotIndex: 6,
        status: 'idle',
      }),
      create: jest.fn().mockResolvedValue({}),
    },
    playerTechnology: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'tech-basic-navigation',
        playerId: PLAYER_ID,
        worldId: WORLD_ID,
        technologyId: 'basic_navigation',
        status: 'completed',
      }),
    },
    resourceTransaction: {
      create: jest.fn().mockResolvedValue({}),
    },
    report: {
      create: jest.fn().mockResolvedValue({}),
    },
    cityWorkerAssignment: {
      create: jest.fn().mockResolvedValue({}),
    },
    citySpyState: {
      create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  );

  return { prisma, world, player };
}

describe('MapService', () => {
  async function createService(prisma: unknown, bootstrapWorldId = WORLD_ID): Promise<MapService> {
    const developmentStateService = {
      ensureDevelopmentState: jest.fn().mockResolvedValue({
        player: { id: PLAYER_ID, name: 'Founder', score: 0 },
        world: { id: bootstrapWorldId, name: 'First World', status: 'development' },
        selectedCityId: CITY_ID,
        onboarding: { hasCompletedTutorial: false, currentQuestId: 'welcome_city' },
      }),
    };
    const questsService = {
      handleQuestTrigger: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        MapService,
        { provide: PrismaService, useValue: prisma },
        { provide: DevelopmentStateService, useValue: developmentStateService },
        { provide: QuestsService, useValue: questsService },
      ],
    }).compile();

    return moduleRef.get(MapService);
  }

  it('returns islands with selected city location, distance, and travel time', async () => {
    const { prisma } = buildMapPrisma();
    const service = await createService(prisma);

    const response = await service.getWorldMap(WORLD_ID);

    expect(response.islands).toHaveLength(2);
    expect(response.selectedCity).toMatchObject({
      id: CITY_ID,
      islandId: ISLAND_ID,
      x: 500,
      y: 340,
    });
    expect(response.islands[0]).toMatchObject({
      hasPlayerCity: true,
      distanceFromSelectedCity: 0,
      travelTimeSeconds: 0,
    });
    expect(response.islands[1]).toMatchObject({
      distanceFromSelectedCity: 161.25,
      travelTimeSeconds: 645,
    });
  });

  it('returns occupied and empty island slots', async () => {
    const { prisma } = buildMapPrisma();
    const service = await createService(prisma);

    const response = await service.getIslandDetail(ISLAND_ID);

    expect(response.slots).toHaveLength(12);
    expect(response.slots[0]).toMatchObject({
      slotIndex: 0,
      status: 'occupied',
      city: { name: 'New Haven', playerName: 'Founder', isOwnedByCurrentPlayer: true },
    });
    expect(response.slots[1]).toMatchObject({
      slotIndex: 1,
      status: 'empty',
      city: null,
      colonization: {
        canColonize: true,
        cost: { wood: 800, gold: 500, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
      },
    });
    expect(response.slots[11]).toMatchObject({
      slotIndex: 11,
      status: 'barbarian_village',
      barbarianVillage: { name: 'New Haven Atoll Barbarian Village', level: 1 },
    });
  });

  it('rejects worlds outside the current player world', async () => {
    const { prisma } = buildMapPrisma();
    const service = await createService(prisma, 'other-world');

    await expect(service.getWorldMap(WORLD_ID)).rejects.toThrow(ApiErrorException);
  });

  it('rejects islands outside the current player world', async () => {
    const { prisma } = buildMapPrisma();
    prisma.island.findUnique.mockResolvedValueOnce({
      id: 'other-island',
      worldId: 'other-world',
      x: 0,
      y: 0,
      name: 'Other Island',
      mainResource: 'wood',
      luxuryResource: 'wine',
      maxSlots: 12,
      world: { id: 'other-world', speedTravel: 1 },
      cities: [],
      pveCamps: [],
    });
    const service = await createService(prisma);

    await expect(service.getIslandDetail('other-island')).rejects.toThrow(ApiErrorException);
  });

  it('settles a new city in an empty island slot', async () => {
    const { prisma } = buildMapPrisma();
    const service = await createService(prisma);

    const response = await service.settleCity({ islandId: ISLAND_ID, slotIndex: 1 });

    expect(prisma.city.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        worldId: WORLD_ID,
        playerId: PLAYER_ID,
        islandId: ISLAND_ID,
        slotIndex: 1,
        name: 'New Haven Atoll Colony',
      }),
    });
    expect(prisma.cityResource.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ cityId: 'city-2', wood: 200, gold: 100 }),
    });
    expect(prisma.cityBuilding.create).toHaveBeenCalledTimes(17);
    expect(prisma.cityBuilding.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cityId: 'city-2',
        buildingType: 'marble_mason',
        slotIndex: 8,
      }),
    });
    expect(prisma.resourceTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionType: 'colonization_cost',
        resourceType: 'wood',
        amount: -800,
      }),
    });
    expect(prisma.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'city_founded',
        cityId: 'city-2',
      }),
    });
    expect(prisma.cityWorkerAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ cityId: 'city-2', woodWorkers: 5, goldWorkers: 5 }),
    });
    expect(response.city).toMatchObject({
      id: 'city-2',
      islandId: ISLAND_ID,
      slotIndex: 1,
      name: 'New Haven Atoll Colony',
    });
  });

  it('rejects settlement in an occupied island slot', async () => {
    const { prisma } = buildMapPrisma();
    const service = await createService(prisma);

    await expect(service.settleCity({ islandId: ISLAND_ID, slotIndex: 0 })).rejects.toThrow(
      ApiErrorException,
    );
    expect(prisma.city.create).not.toHaveBeenCalled();
  });
});
