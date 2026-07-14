import { HttpStatus, Injectable } from '@nestjs/common';
import { TECHNOLOGY_CONFIG, UNIT_CONFIG } from '@island-empires/config';
import type {
  AllianceRankingRow,
  AllianceRankingType,
  PlayerRankingRow,
  PlayerRankingType,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';

const PLAYER_TYPES: PlayerRankingType[] = ['overall', 'gold', 'army', 'research', 'cities'];
const ALLIANCE_TYPES: AllianceRankingType[] = [
  'overall',
  'gold',
  'army',
  'research',
  'members',
  'projects',
];

const FLEET_POWER = {
  lightShip: 18,
  ramShip: 34,
  fireShip: 42,
} as const;

const CITY_BUILDING_WEIGHTS: Record<string, number> = {
  city_hall: 34,
  palace: 30,
  governor_residency: 28,
  warehouse: 20,
  port: 22,
  trading_post: 22,
  marketplace: 22,
  academy: 24,
  barracks: 22,
  shipyard: 22,
  wall: 18,
  tavern: 18,
  hospital: 16,
  spy_agency: 16,
  builders_guild: 18,
  workshop: 18,
  foresters_house: 14,
  luxury_extractor: 14,
  marble_mason: 14,
  vineyard_estate: 14,
  crystal_lensworks: 14,
  sulfur_refinery: 14,
};

const CITY_INFRASTRUCTURE_GROUPS = [
  ['city_hall', 'warehouse', 'tavern'],
  ['port', 'trading_post', 'marketplace'],
  ['academy'],
  ['barracks', 'shipyard', 'wall'],
  ['foresters_house', 'luxury_extractor', 'marble_mason', 'vineyard_estate', 'crystal_lensworks', 'sulfur_refinery'],
  ['palace', 'governor_residency'],
] as const;

type PageInput = { type?: string; page?: number; pageSize?: number };

@Injectable()
export class RankingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
  ) {}

  async getPlayerRankings(input: PageInput) {
    const type = this.parsePlayerType(input.type);
    const pagination = this.pagination(input);
    const { world } = await this.developmentStateService.ensureDevelopmentState();
    const players = await (this.prisma as any).player.findMany({
      where: { worldId: world.id },
      include: {
        cities: {
          include: {
            resources: true,
            buildings: true,
            units: true,
            fleet: true,
          },
        },
        allianceMembership: { include: { alliance: true } },
        technologies: { where: { status: 'completed' } },
      },
    });

    const ranked: PlayerRankingRow[] = players
      .map((player: any) => this.toPlayerRow(player, type))
      .sort((a: PlayerRankingRow, b: PlayerRankingRow) => b.score - a.score || b.cityCount - a.cityCount || a.playerName.localeCompare(b.playerName))
      .map((row: PlayerRankingRow, index: number) => ({ ...row, rank: index + 1 }));

    return {
      rankings: ranked.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize),
      pagination: { ...pagination, total: ranked.length },
    };
  }

  async getAllianceRankings(input: PageInput) {
    const type = this.parseAllianceType(input.type);
    const pagination = this.pagination(input);
    const { world } = await this.developmentStateService.ensureDevelopmentState();
    const alliances = await (this.prisma as any).alliance.findMany({
      where: { worldId: world.id, status: 'active' },
      include: {
        members: {
          include: {
            player: {
              include: {
                cities: { include: { resources: true, buildings: true, units: true, fleet: true } },
                technologies: { where: { status: 'completed' } },
              },
            },
          },
        },
        projects: true,
        projectContributions: true,
      },
    });

    const ranked: AllianceRankingRow[] = alliances
      .map((alliance: any) => this.toAllianceRow(alliance, type))
      .sort((a: AllianceRankingRow, b: AllianceRankingRow) => b.score - a.score || b.memberCount - a.memberCount || a.name.localeCompare(b.name))
      .map((row: AllianceRankingRow, index: number) => ({ ...row, rank: index + 1 }));

    return {
      rankings: ranked.slice((pagination.page - 1) * pagination.pageSize, pagination.page * pagination.pageSize),
      pagination: { ...pagination, total: ranked.length },
    };
  }

  private toPlayerRow(player: any, type: PlayerRankingType): PlayerRankingRow {
    const scoreByType: Record<PlayerRankingType, number> = {
      overall: this.overallPlayerScore(player),
      gold: this.goldScore(player),
      army: this.armyScore(player),
      research: this.researchScore(player),
      cities: this.cityScore(player),
    };
    const alliance = player.allianceMembership?.alliance;
    return {
      rank: 0,
      playerId: player.id,
      playerName: player.name,
      alliance: alliance ? { id: alliance.id, name: alliance.name, tag: alliance.tag } : null,
      score: scoreByType[type],
      cityCount: player.cities.length,
      completedTechs: player.technologies.length,
    };
  }

  private toAllianceRow(alliance: any, type: AllianceRankingType): AllianceRankingRow {
    const completedProjects = alliance.projects.filter((project: any) => project.status === 'completed').length;
    const contributionScore = alliance.projectContributions.reduce(
      (sum: number, contribution: any) => sum + contribution.contributionScore,
      0,
    );
    const scoreByType: Record<AllianceRankingType, number> = {
      overall:
        alliance.members.reduce((sum: number, member: any) => sum + this.overallPlayerScore(member.player), 0) +
        completedProjects * 500 +
        Math.floor(contributionScore * 0.5),
      gold: alliance.members.reduce((sum: number, member: any) => sum + this.goldScore(member.player), 0),
      army: alliance.members.reduce((sum: number, member: any) => sum + this.armyScore(member.player), 0),
      research: alliance.members.reduce((sum: number, member: any) => sum + this.researchScore(member.player), 0),
      members: alliance.members.length,
      projects: completedProjects * 1000 + contributionScore,
    };
    return {
      rank: 0,
      allianceId: alliance.id,
      name: alliance.name,
      tag: alliance.tag,
      memberCount: alliance.members.length,
      score: scoreByType[type],
    };
  }

  private overallPlayerScore(player: any): number {
    const cityScore = this.cityScore(player);
    const researchScore = this.researchScore(player);
    const armyScore = this.armyScore(player);
    const economyScore = this.economyScore(player);

    return Math.round(
      cityScore * 1.0 +
        researchScore * 1.15 +
        armyScore * 0.9 +
        economyScore,
    );
  }

  private economyScore(player: any): number {
    const gold = this.goldScore(player);
    return Math.floor(Math.sqrt(Math.max(0, gold)) * 12);
  }

  private goldScore(player: any): number {
    return player.cities.reduce((sum: number, city: any) => sum + (city.resources?.gold ?? 0), 0);
  }

  private armyScore(player: any): number {
    return player.cities.reduce((sum: number, city: any) => {
      const land = city.units.reduce((unitSum: number, unit: any) => {
        const config = (UNIT_CONFIG as any)[unit.unitType];
        return unitSum + unit.quantity * ((config?.attack ?? 0) + (config?.defense ?? 0));
      }, 0);
      const fleet = city.fleet
        ? city.fleet.lightShip * FLEET_POWER.lightShip +
          city.fleet.ramShip * FLEET_POWER.ramShip +
          city.fleet.fireShip * FLEET_POWER.fireShip
        : 0;
      return sum + land + fleet;
    }, 0);
  }

  private researchScore(player: any): number {
    return player.technologies.reduce((sum: number, technology: any) => {
      const cost = (TECHNOLOGY_CONFIG as any)[technology.technologyId]?.cost ?? 0;
      return sum + 100 + cost;
    }, 0);
  }

  private cityScore(player: any): number {
    const cityDevelopment = player.cities.reduce(
      (sum: number, city: any) => sum + this.singleCityDevelopmentScore(city),
      0,
    );
    const expansionBonus = player.cities.length * 300;
    const balancedEmpireBonus = Math.min(player.cities.length, 6) * 100;

    return Math.round(cityDevelopment + expansionBonus + balancedEmpireBonus);
  }

  private singleCityDevelopmentScore(city: any): number {
    const levelScore = city.level * 120;
    const populationScore = Math.floor((city.population ?? 0) * 1.5);
    const happinessScore = Math.max(0, city.happiness ?? 0);
    const buildings = city.buildings ?? [];
    const buildingScore = buildings.reduce((sum: number, building: any) => {
      const level = Math.max(0, building.level ?? 0);
      const weight = CITY_BUILDING_WEIGHTS[building.buildingType] ?? 10;
      return sum + level * weight + this.buildingMilestoneBonus(level);
    }, 0);
    const infrastructureBonus = CITY_INFRASTRUCTURE_GROUPS.reduce((sum, group) => {
      const hasGroup = group.some((buildingType) =>
        buildings.some((building: any) => building.buildingType === buildingType && building.level > 0),
      );
      return sum + (hasGroup ? 75 : 0);
    }, 0);
    const specializationBonus = buildings.filter((building: any) => (building.level ?? 0) >= 10).length * 35;

    return levelScore + populationScore + happinessScore + buildingScore + infrastructureBonus + specializationBonus;
  }

  private buildingMilestoneBonus(level: number): number {
    return (
      (level >= 5 ? 40 : 0) +
      (level >= 10 ? 90 : 0) +
      (level >= 20 ? 180 : 0) +
      (level >= 30 ? 300 : 0) +
      (level >= 40 ? 450 : 0)
    );
  }

  private parsePlayerType(value?: string): PlayerRankingType {
    const type = (value ?? 'overall') as PlayerRankingType;
    if (!PLAYER_TYPES.includes(type)) {
      throw new ApiErrorException('Invalid ranking type.', 'INVALID_RANKING_TYPE', HttpStatus.BAD_REQUEST);
    }
    return type;
  }

  private parseAllianceType(value?: string): AllianceRankingType {
    const type = (value ?? 'overall') as AllianceRankingType;
    if (!ALLIANCE_TYPES.includes(type)) {
      throw new ApiErrorException('Invalid ranking type.', 'INVALID_RANKING_TYPE', HttpStatus.BAD_REQUEST);
    }
    return type;
  }

  private pagination(input: PageInput) {
    return {
      page: Number.isFinite(input.page) && input.page && input.page > 0 ? Math.floor(input.page) : 1,
      pageSize:
        Number.isFinite(input.pageSize) && input.pageSize && input.pageSize > 0
          ? Math.min(Math.floor(input.pageSize), 100)
          : 50,
    };
  }
}
