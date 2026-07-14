import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { AdvancedSearchService } from './advanced-search.service';

describe('AdvancedSearchService', () => {
  let service: AdvancedSearchService;

  beforeEach(async () => {
    const prisma = {
      player: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'player-1',
            name: 'Founder',
            score: 2000,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            cities: [{ id: 'city-1' }, { id: 'city-2' }],
            allianceMembership: { alliance: { id: 'alliance-1', name: 'Sea Wolves', tag: 'SEA' } },
          },
        ]),
      },
      city: { findMany: jest.fn().mockResolvedValue([]) },
      cityBlockade: { findMany: jest.fn().mockResolvedValue([]) },
      alliance: { findMany: jest.fn().mockResolvedValue([]) },
      marketplaceOffer: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AdvancedSearchService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: DevelopmentStateService,
          useValue: {
            ensureDevelopmentState: jest.fn().mockResolvedValue({
              world: { id: 'world-1' },
              player: { id: 'player-current' },
            }),
          },
        },
      ],
    }).compile();
    service = moduleRef.get(AdvancedSearchService);
  });

  it('rejects one-character search text', async () => {
    await expect(service.searchPlayers({ name: 'f' })).rejects.toMatchObject({
      response: { code: 'SEARCH_QUERY_TOO_SHORT' },
    });
  });

  it('filters players by alliance tag and city count', async () => {
    const result = await service.searchPlayers({ allianceTag: 'SEA', minCities: '2' });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ playerName: 'Founder', cityCount: 2 });
  });
});
