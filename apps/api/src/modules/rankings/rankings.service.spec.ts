import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { RankingsService } from './rankings.service';

function buildPrisma() {
  return {
    player: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'player-1',
          name: 'Founder',
          score: 0,
          cities: [
            {
              level: 5,
              population: 250,
              happiness: 95,
              resources: { gold: 900 },
              buildings: [
                { buildingType: 'city_hall', level: 5 },
                { buildingType: 'warehouse', level: 4 },
                { buildingType: 'port', level: 3 },
                { buildingType: 'academy', level: 2 },
              ],
              units: [{ unitType: 'militia', quantity: 10 }],
              fleet: { lightShip: 1, ramShip: 0, fireShip: 0 },
            },
          ],
          allianceMembership: { alliance: { id: 'alliance-1', name: 'Sea Wolves', tag: 'SEA' } },
          technologies: [{ technologyId: 'basic_training' }],
        },
        {
          id: 'player-2',
          name: 'Outpost Spammer',
          score: 0,
          cities: [
            {
              level: 1,
              population: 50,
              happiness: 80,
              resources: { gold: 100 },
              buildings: [{ buildingType: 'city_hall', level: 1 }],
              units: [],
              fleet: null,
            },
            {
              level: 1,
              population: 50,
              happiness: 80,
              resources: { gold: 100 },
              buildings: [{ buildingType: 'city_hall', level: 1 }],
              units: [],
              fleet: null,
            },
          ],
          allianceMembership: null,
          technologies: [],
        },
      ]),
    },
    alliance: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'alliance-1',
          name: 'Sea Wolves',
          tag: 'SEA',
          members: [
            {
              player: {
                score: 0,
                cities: [
                  {
                    level: 5,
                    population: 250,
                    happiness: 95,
                    resources: { gold: 900 },
                    buildings: [
                      { buildingType: 'city_hall', level: 5 },
                      { buildingType: 'warehouse', level: 4 },
                      { buildingType: 'port', level: 3 },
                      { buildingType: 'academy', level: 2 },
                    ],
                    units: [{ unitType: 'militia', quantity: 10 }],
                    fleet: { lightShip: 1, ramShip: 0, fireShip: 0 },
                  },
                ],
                technologies: [{ technologyId: 'basic_training' }],
              },
            },
          ],
          projects: [{ status: 'completed' }],
          projectContributions: [{ contributionScore: 250 }],
        },
      ]),
    },
  };
}

describe('RankingsService', () => {
  let service: RankingsService;

  beforeEach(async () => {
    const prisma = buildPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RankingsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: DevelopmentStateService,
          useValue: { ensureDevelopmentState: jest.fn().mockResolvedValue({ world: { id: 'world-1' } }) },
        },
      ],
    }).compile();
    service = moduleRef.get(RankingsService);
  });

  it('returns aggregate player gold rankings without city balances', async () => {
    const result = await service.getPlayerRankings({ type: 'gold', page: 1, pageSize: 50 });

    expect(result.rankings[0]).toMatchObject({
      rank: 1,
      playerName: 'Founder',
      score: 900,
      cityCount: 1,
    });
    expect(result.rankings[0]).not.toHaveProperty('resources');
  });

  it('rejects invalid ranking types', async () => {
    await expect(service.getPlayerRankings({ type: 'spies' })).rejects.toMatchObject({
      response: { code: 'INVALID_RANKING_TYPE' },
    });
  });

  it('returns alliance project score rankings', async () => {
    const result = await service.getAllianceRankings({ type: 'projects' });

    expect(result.rankings[0]).toMatchObject({ name: 'Sea Wolves', score: 1250, memberCount: 1 });
  });

  it('computes overall player rankings from live component scores', async () => {
    const result = await service.getPlayerRankings({ type: 'overall' });

    expect(result.rankings[0]).toMatchObject({
      playerName: 'Founder',
      cityCount: 1,
    });
    expect(result.rankings[0].score).toBeGreaterThan(0);
    expect(result.rankings[0].score).toBeGreaterThan(result.rankings[1].score);
  });

  it('computes overall alliance rankings from member component scores and project progress', async () => {
    const result = await service.getAllianceRankings({ type: 'overall' });

    expect(result.rankings[0]).toMatchObject({ name: 'Sea Wolves', memberCount: 1 });
    expect(result.rankings[0].score).toBeGreaterThan(0);
  });

  it('scores city rankings by development depth, not just city count', async () => {
    const result = await service.getPlayerRankings({ type: 'cities' });

    expect(result.rankings[0]).toMatchObject({
      playerName: 'Founder',
      cityCount: 1,
    });
    expect(result.rankings[1]).toMatchObject({
      playerName: 'Outpost Spammer',
      cityCount: 2,
    });
    expect(result.rankings[0].score).toBeGreaterThan(result.rankings[1].score);
  });
});
