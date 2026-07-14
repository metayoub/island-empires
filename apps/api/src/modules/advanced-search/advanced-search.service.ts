import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  AdvancedAllianceSearchResult,
  AdvancedCitySearchResult,
  AdvancedMarketplaceSearchResult,
  AdvancedPlayerSearchResult,
  ResourceBalance,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';

const RESOURCE_KEYS: Array<keyof ResourceBalance> = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'];
const BOOLEAN_TRUE = new Set(['true', '1', 'yes']);

@Injectable()
export class AdvancedSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
  ) {}

  async searchPlayers(query: Record<string, string>) {
    this.assertSearchLength(query.name, query.allianceTag);
    const pagination = this.pagination(query);
    const { world } = await this.developmentStateService.ensureDevelopmentState();
    const players = await (this.prisma as any).player.findMany({
      where: { worldId: world.id, ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}) },
      include: {
        cities: true,
        allianceMembership: { include: { alliance: true } },
      },
      orderBy: [{ score: 'desc' }, { name: 'asc' }],
    });
    const ranked: AdvancedPlayerSearchResult[] = players
      .map((player: any, index: number): AdvancedPlayerSearchResult => {
        const alliance = player.allianceMembership?.alliance ?? null;
        return {
          playerId: player.id,
          playerName: player.name,
          alliance: alliance ? { id: alliance.id, name: alliance.name, tag: alliance.tag } : null,
          score: player.score,
          cityCount: player.cities.length,
          rank: index + 1,
          beginnerProtected: Date.now() - new Date(player.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000,
        };
      })
      .filter((player: AdvancedPlayerSearchResult) => this.matchesPlayer(player, query));
    return this.page(ranked, pagination);
  }

  async searchCities(query: Record<string, string>) {
    this.assertSearchLength(query.name, query.ownerName, query.allianceTag);
    const pagination = this.pagination(query);
    const { world } = await this.developmentStateService.ensureDevelopmentState();
    const cities = await (this.prisma as any).city.findMany({
      where: {
        worldId: world.id,
        ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}),
        ...(query.ownerName ? { player: { name: { contains: query.ownerName, mode: 'insensitive' } } } : {}),
      },
      include: {
        island: true,
        player: { include: { allianceMembership: { include: { alliance: true } } } },
        buildings: true,
      },
      orderBy: [{ level: 'desc' }, { name: 'asc' }],
    });
    const blockades = await (this.prisma as any).cityBlockade.findMany({
      where: { worldId: world.id, status: 'active' },
      select: { targetCityId: true },
    });
    const blockadedCityIds = new Set(blockades.map((blockade: any) => blockade.targetCityId));
    const results: AdvancedCitySearchResult[] = cities
      .map((city: any): AdvancedCitySearchResult => {
        const buildingTypes = new Set(city.buildings.filter((building: any) => building.level > 0).map((building: any) => building.buildingType));
        return {
          cityId: city.id,
          cityName: city.name,
          ownerName: city.player.name,
          allianceTag: city.player.allianceMembership?.alliance?.tag ?? null,
          level: city.level,
          island: city.island
            ? { id: city.island.id, name: city.island.name, x: city.island.x, y: city.island.y }
            : null,
          hasPort: buildingTypes.has('port'),
          hasMarketplace: buildingTypes.has('marketplace') || buildingTypes.has('trading_post'),
          hasWall: buildingTypes.has('wall'),
          isBlockaded: blockadedCityIds.has(city.id),
          distance: null,
        };
      })
      .filter((city: AdvancedCitySearchResult) => this.matchesCity(city, query));
    return this.page(results, pagination);
  }

  async searchAlliances(query: Record<string, string>) {
    this.assertSearchLength(query.name, query.tag);
    const pagination = this.pagination(query);
    const { world } = await this.developmentStateService.ensureDevelopmentState();
    const alliances = await (this.prisma as any).alliance.findMany({
      where: {
        worldId: world.id,
        status: 'active',
        ...(query.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}),
        ...(query.tag ? { tag: { contains: query.tag, mode: 'insensitive' } } : {}),
      },
      include: {
        members: { include: { player: true } },
        projects: true,
      },
    });
    const ranked: AdvancedAllianceSearchResult[] = alliances
      .map((alliance: any): AdvancedAllianceSearchResult => {
        const score = alliance.members.reduce((sum: number, member: any) => sum + member.player.score, 0);
        return {
          allianceId: alliance.id,
          name: alliance.name,
          tag: alliance.tag,
          memberCount: alliance.members.length,
          score,
          completedProjects: alliance.projects.filter((project: any) => project.status === 'completed').length,
          recruiting: true,
          rank: 0,
        };
      })
      .sort((a: AdvancedAllianceSearchResult, b: AdvancedAllianceSearchResult) => b.score - a.score || a.name.localeCompare(b.name))
      .map((alliance: AdvancedAllianceSearchResult, index: number) => ({ ...alliance, rank: index + 1 }))
      .filter((alliance: AdvancedAllianceSearchResult) => this.matchesAlliance(alliance, query));
    return this.page(ranked, pagination);
  }

  async searchMarketplace(query: Record<string, string>) {
    const pagination = this.pagination(query);
    const { world, player } = await this.developmentStateService.ensureDevelopmentState();
    const where = {
      worldId: world.id,
      status: BOOLEAN_TRUE.has(query.notExpired ?? 'true') ? 'active' : undefined,
      ...(this.isResource(query.offeredResource) ? { offeredResource: query.offeredResource } : {}),
      ...(this.isResource(query.requestedResource) ? { requestedResource: query.requestedResource } : {}),
    };
    const offers = await (this.prisma as any).marketplaceOffer.findMany({
      where,
      include: {
        creatorPlayer: { include: { allianceMembership: { include: { alliance: true } } } },
        creatorCity: { include: { island: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const results: AdvancedMarketplaceSearchResult[] = offers
      .map((offer: any): AdvancedMarketplaceSearchResult => ({
        id: offer.id,
        offerType: offer.offerType,
        status: offer.status,
        offeredResource: offer.offeredResource,
        offeredAmount: offer.offeredAmount,
        requestedResource: offer.requestedResource,
        requestedAmount: offer.requestedAmount,
        creator: {
          playerId: offer.creatorPlayer.id,
          playerName: offer.creatorPlayer.name,
          allianceTag: offer.creatorPlayer.allianceMembership?.alliance?.tag ?? null,
        },
        creatorCity: {
          id: offer.creatorCity.id,
          name: offer.creatorCity.name,
          x: offer.creatorCity.island?.x ?? null,
          y: offer.creatorCity.island?.y ?? null,
        },
        isOwnOffer: offer.creatorPlayerId === player.id,
        acceptedByPlayerId: offer.acceptedByPlayerId,
        acceptedByCityId: offer.acceptedByCityId,
        expiresAt: offer.expiresAt.toISOString(),
        acceptedAt: offer.acceptedAt?.toISOString() ?? null,
        completedAt: offer.completedAt?.toISOString() ?? null,
        cancelledAt: offer.cancelledAt?.toISOString() ?? null,
        createdAt: offer.createdAt.toISOString(),
        ratio: offer.requestedAmount > 0 ? offer.offeredAmount / offer.requestedAmount : 0,
        distance: null,
        canAcceptNow: offer.creatorPlayerId !== player.id && offer.status === 'active' && offer.expiresAt > new Date(),
      }))
      .filter((offer: AdvancedMarketplaceSearchResult) => this.matchesMarketplace(offer, query))
      .sort((a: AdvancedMarketplaceSearchResult, b: AdvancedMarketplaceSearchResult) => (BOOLEAN_TRUE.has(query.bestRatio ?? '') ? b.ratio - a.ratio : 0));
    return this.page(results, pagination);
  }

  private matchesPlayer(player: AdvancedPlayerSearchResult, query: Record<string, string>): boolean {
    return (
      (!query.allianceTag || Boolean(player.alliance?.tag.toLowerCase().includes(query.allianceTag.toLowerCase()))) &&
      this.inRange(player.score, query.minScore, query.maxScore) &&
      this.inRange(player.cityCount, query.minCities, query.maxCities) &&
      (!query.hasAlliance || (BOOLEAN_TRUE.has(query.hasAlliance) ? Boolean(player.alliance) : !player.alliance)) &&
      (!query.beginnerProtected || player.beginnerProtected === BOOLEAN_TRUE.has(query.beginnerProtected)) &&
      this.inRange(player.rank, query.minRank, query.maxRank)
    );
  }

  private matchesCity(city: AdvancedCitySearchResult, query: Record<string, string>): boolean {
    return (
      (!query.allianceTag || Boolean(city.allianceTag?.toLowerCase().includes(query.allianceTag.toLowerCase()))) &&
      this.inRange(city.level, query.minLevel, query.maxLevel) &&
      (!query.x || city.island?.x === Number(query.x)) &&
      (!query.y || city.island?.y === Number(query.y)) &&
      (!query.hasPort || city.hasPort === BOOLEAN_TRUE.has(query.hasPort)) &&
      (!query.hasMarketplace || city.hasMarketplace === BOOLEAN_TRUE.has(query.hasMarketplace)) &&
      (!query.hasWall || city.hasWall === BOOLEAN_TRUE.has(query.hasWall)) &&
      (!query.isBlockaded || city.isBlockaded === BOOLEAN_TRUE.has(query.isBlockaded))
    );
  }

  private matchesAlliance(alliance: AdvancedAllianceSearchResult, query: Record<string, string>): boolean {
    return (
      this.inRange(alliance.memberCount, query.minMembers, query.maxMembers) &&
      this.inRange(alliance.score, query.minScore, query.maxScore) &&
      this.inRange(alliance.completedProjects, query.minCompletedProjects, undefined) &&
      this.inRange(alliance.rank, query.minRank, query.maxRank)
    );
  }

  private matchesMarketplace(offer: AdvancedMarketplaceSearchResult, query: Record<string, string>): boolean {
    return (
      (!query.sellerAlliance || Boolean(offer.creator.allianceTag?.toLowerCase().includes(query.sellerAlliance.toLowerCase()))) &&
      this.inRange(offer.offeredAmount, query.minAmount, query.maxAmount) &&
      (!query.canAcceptNow || offer.canAcceptNow === BOOLEAN_TRUE.has(query.canAcceptNow))
    );
  }

  private assertSearchLength(...values: Array<string | undefined>) {
    for (const value of values) {
      if (value && value.trim().length < 2) {
        throw new ApiErrorException('Search query is too short.', 'SEARCH_QUERY_TOO_SHORT', HttpStatus.BAD_REQUEST);
      }
    }
  }

  private isResource(value?: string): value is keyof ResourceBalance {
    return Boolean(value && RESOURCE_KEYS.includes(value as keyof ResourceBalance));
  }

  private inRange(value: number, min?: string, max?: string): boolean {
    return (!min || value >= Number(min)) && (!max || value <= Number(max));
  }

  private pagination(query: Record<string, string>) {
    const page = Number(query.page);
    const pageSize = Number(query.pageSize);
    return {
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 100) : 50,
    };
  }

  private page<T>(results: T[], pagination: { page: number; pageSize: number }) {
    return {
      results: results.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize),
      pagination: { ...pagination, total: results.length },
    };
  }
}
