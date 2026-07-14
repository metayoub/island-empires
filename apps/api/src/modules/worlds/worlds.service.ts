import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  CitySearchResponse,
  PlayerProfileResponse,
  PlayerSearchResponse,
  PublicCitySummary,
  WorldPopulationStatsResponse,
  WorldRankingResponse,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';

const BEGINNER_PROTECTION_DAYS = 7;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

@Injectable()
export class WorldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
  ) {}

  async getRankings(worldId: string, limitInput?: number): Promise<WorldRankingResponse> {
    const bootstrap = await this.assertCurrentWorld(worldId);
    const limit = this.normalizeLimit(limitInput);
    const players = await this.prisma.player.findMany({
      where: { worldId: bootstrap.world.id },
      include: { cities: true },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });

    return {
      world: {
        id: bootstrap.world.id,
        name: bootstrap.world.name,
      },
      rankings: players.map((player, index) => ({
        rank: index + 1,
        playerId: player.id,
        playerName: player.name,
        allianceTag: null,
        score: player.score,
        cityCount: player.cities.length,
        population: player.cities.reduce((total, city) => total + city.population, 0),
      })),
    };
  }

  async getPopulationStats(worldId: string): Promise<WorldPopulationStatsResponse> {
    const bootstrap = await this.assertCurrentWorld(worldId);
    const [playerCount, cityCount, population] = await Promise.all([
      this.prisma.player.count({ where: { worldId: bootstrap.world.id } }),
      this.prisma.city.count({ where: { worldId: bootstrap.world.id } }),
      this.prisma.city.aggregate({
        where: { worldId: bootstrap.world.id },
        _sum: { population: true },
      }),
    ]);
    const totalPopulation = population._sum.population ?? 0;

    return {
      world: {
        id: bootstrap.world.id,
        name: bootstrap.world.name,
      },
      players: playerCount,
      cities: cityCount,
      population: totalPopulation,
      averagePopulationPerPlayer:
        playerCount === 0 ? 0 : Math.round((totalPopulation / playerCount) * 100) / 100,
    };
  }

  async searchPlayers(input: {
    worldId: string;
    query?: string;
    limit?: number;
  }): Promise<PlayerSearchResponse> {
    const bootstrap = await this.assertCurrentWorld(input.worldId);
    const query = input.query?.trim();
    if (!query) {
      return { players: [] };
    }

    const players = await this.prisma.player.findMany({
      where: {
        worldId: bootstrap.world.id,
        name: { contains: query, mode: 'insensitive' },
      },
      include: { cities: true },
      orderBy: [{ score: 'desc' }, { name: 'asc' }],
      take: this.normalizeLimit(input.limit),
    });

    return {
      players: players.map((player) => ({
        id: player.id,
        name: player.name,
        allianceTag: null,
        score: player.score,
        cityCount: player.cities.length,
        population: player.cities.reduce((total, city) => total + city.population, 0),
      })),
    };
  }

  async searchCities(input: {
    worldId: string;
    query?: string;
    limit?: number;
  }): Promise<CitySearchResponse> {
    const bootstrap = await this.assertCurrentWorld(input.worldId);
    const query = input.query?.trim();
    if (!query) {
      return { cities: [] };
    }

    const cities = await this.prisma.city.findMany({
      where: {
        worldId: bootstrap.world.id,
        name: { contains: query, mode: 'insensitive' },
      },
      include: { player: true, island: true },
      orderBy: [{ population: 'desc' }, { name: 'asc' }],
      take: this.normalizeLimit(input.limit),
    });

    return { cities: cities.map((city) => this.toPublicCitySummary(city)) };
  }

  async getPlayerProfile(playerId: string): Promise<PlayerProfileResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: {
        world: true,
        cities: { include: { player: true, island: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!player || player.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Player not found.', 'PLAYER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const betterRankedPlayers = await this.prisma.player.count({
      where: {
        worldId: player.worldId,
        OR: [
          { score: { gt: player.score } },
          { score: player.score, createdAt: { lt: player.createdAt } },
        ],
      },
    });

    return {
      id: player.id,
      name: player.name,
      score: player.score,
      rank: betterRankedPlayers + 1,
      allianceTag: null,
      world: {
        id: player.world.id,
        name: player.world.name,
      },
      beginnerProtectionEndsAt: this.getBeginnerProtectionEndsAt(player.createdAt),
      cities: player.cities.map((city) => this.toPublicCitySummary(city)),
      createdAt: player.createdAt.toISOString(),
    };
  }

  private async assertCurrentWorld(worldId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    if (bootstrap.world.id !== worldId) {
      throw new ApiErrorException('World not found.', 'WORLD_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return bootstrap;
  }

  private normalizeLimit(limitInput?: number): number {
    if (!Number.isFinite(limitInput) || !limitInput) {
      return DEFAULT_LIMIT;
    }

    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limitInput)));
  }

  private getBeginnerProtectionEndsAt(createdAt: Date): string | null {
    const endsAt = new Date(createdAt.getTime() + BEGINNER_PROTECTION_DAYS * 24 * 60 * 60 * 1000);
    return endsAt > new Date() ? endsAt.toISOString() : null;
  }

  private toPublicCitySummary(city: {
    id: string;
    name: string;
    level: number;
    population: number;
    player: { id: string; name: string };
    island: {
      id: string;
      name: string | null;
      x: number;
      y: number;
      luxuryResource: string;
    } | null;
  }): PublicCitySummary {
    return {
      id: city.id,
      name: city.name,
      level: city.level,
      population: city.population,
      player: {
        id: city.player.id,
        name: city.player.name,
        allianceTag: null,
      },
      island: city.island
        ? {
            id: city.island.id,
            name: city.island.name ?? `Island ${city.island.x}:${city.island.y}`,
            x: city.island.x,
            y: city.island.y,
            luxuryResource: city.island.luxuryResource,
          }
        : null,
    };
  }
}
