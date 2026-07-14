import { Test } from '@nestjs/testing';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { WorldsService } from './worlds.service';

const WORLD_ID = 'world-1';
const OTHER_WORLD_ID = 'world-2';

function buildWorldsPrisma() {
  const createdAt = new Date(Date.now() - 60 * 60 * 1000);
  const island = {
    id: 'island-1',
    name: 'New Haven Atoll',
    x: 500,
    y: 340,
    luxuryResource: 'marble',
  };
  const players = [
    {
      id: 'player-1',
      worldId: WORLD_ID,
      name: 'Founder',
      score: 125,
      createdAt,
      cities: [
        {
          id: 'city-1',
          name: 'New Haven',
          level: 2,
          population: 80,
          player: { id: 'player-1', name: 'Founder' },
          island,
          createdAt,
        },
      ],
    },
    {
      id: 'player-2',
      worldId: WORLD_ID,
      name: 'Scholar',
      score: 95,
      createdAt: new Date(createdAt.getTime() + 1000),
      cities: [
        {
          id: 'city-2',
          name: 'Scholar Bay',
          level: 1,
          population: 50,
          player: { id: 'player-2', name: 'Scholar' },
          island,
          createdAt,
        },
      ],
    },
  ];
  const prisma = {
    player: {
      findMany: jest.fn().mockResolvedValue(players),
      findUnique: jest.fn().mockResolvedValue({
        ...players[0],
        world: { id: WORLD_ID, name: 'First World' },
      }),
      count: jest.fn().mockImplementation(({ where }) => Promise.resolve(where?.OR ? 0 : 2)),
    },
    city: {
      findMany: jest.fn().mockResolvedValue(players.flatMap((player) => player.cities)),
      count: jest.fn().mockResolvedValue(2),
      aggregate: jest.fn().mockResolvedValue({ _sum: { population: 130 } }),
    },
  };

  return { prisma };
}

describe('WorldsService', () => {
  async function createService(bootstrapWorldId = WORLD_ID) {
    const { prisma } = buildWorldsPrisma();
    const developmentStateService = {
      ensureDevelopmentState: jest.fn().mockResolvedValue({
        player: { id: 'player-1', name: 'Founder', score: 125 },
        world: { id: bootstrapWorldId, name: 'First World', status: 'development' },
        selectedCityId: 'city-1',
        onboarding: { hasCompletedTutorial: false, currentQuestId: 'welcome_city' },
      }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WorldsService,
        { provide: PrismaService, useValue: prisma },
        { provide: DevelopmentStateService, useValue: developmentStateService },
      ],
    }).compile();

    return { service: moduleRef.get(WorldsService), prisma };
  }

  it('returns world rankings with city count and population', async () => {
    const { service } = await createService();

    const response = await service.getRankings(WORLD_ID);

    expect(response.rankings[0]).toMatchObject({
      rank: 1,
      playerId: 'player-1',
      playerName: 'Founder',
      allianceTag: null,
      cityCount: 1,
      population: 80,
    });
  });

  it('returns world population stats', async () => {
    const { service } = await createService();

    const response = await service.getPopulationStats(WORLD_ID);

    expect(response).toMatchObject({
      players: 2,
      cities: 2,
      population: 130,
      averagePopulationPerPlayer: 65,
    });
  });

  it('searches public cities by name', async () => {
    const { service } = await createService();

    const response = await service.searchCities({ worldId: WORLD_ID, query: 'haven' });

    expect(response.cities[0]).toMatchObject({
      id: 'city-1',
      name: 'New Haven',
      player: { id: 'player-1', name: 'Founder', allianceTag: null },
      island: { x: 500, y: 340 },
    });
  });

  it('returns a public player profile', async () => {
    const { service } = await createService();

    const response = await service.getPlayerProfile('player-1');

    expect(response).toMatchObject({
      id: 'player-1',
      name: 'Founder',
      allianceTag: null,
      rank: 1,
      cities: [{ name: 'New Haven' }],
    });
    expect(response.beginnerProtectionEndsAt).toEqual(expect.any(String));
  });

  it('rejects access to another world', async () => {
    const { service } = await createService(OTHER_WORLD_ID);

    await expect(service.getRankings(WORLD_ID)).rejects.toThrow(ApiErrorException);
  });
});
