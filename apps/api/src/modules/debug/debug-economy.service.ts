import { Injectable } from '@nestjs/common';
import {
  BUILDING_CONFIG,
  BUILDING_UPGRADE_CONFIG,
  PVE_CAMP_LEVEL_CONFIG,
  TUTORIAL_QUESTS,
  TECHNOLOGY_CONFIG,
  UNIT_CONFIG,
  type BuildingType,
  type UnitType,
} from '@island-empires/config';
import {
  calculateBuildingUpgradeCost,
  calculateBuildingUpgradeDurationSeconds,
} from '@island-empires/game-engine';
import type {
  DebugEconomyDashboardResponse,
  DebugEconomyUnit,
  EconomyProgressionBlocker,
  QuestReward,
  ResourceBalance,
} from '@island-empires/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResearchService } from '../research/research.service';
import { ResourcesService } from '../resources/resources.service';

const RESOURCE_KEYS: Array<keyof ResourceBalance> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];

@Injectable()
export class DebugEconomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly resourcesService: ResourcesService,
    private readonly researchService: ResearchService,
  ) {}

  async getDashboard(): Promise<DebugEconomyDashboardResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const city = await this.prisma.city.findUniqueOrThrow({
      where: { id: bootstrap.selectedCityId },
      include: { island: true },
    });
    const [{ resources, production, storage }, researchOverview] = await Promise.all([
      this.resourcesService.recalculateResources(city.id),
      this.researchService.getResearchOverview(bootstrap.player.id),
    ]);
    const [buildings, units, claimedQuests, analytics] = await Promise.all([
      this.prisma.cityBuilding.findMany({ where: { cityId: city.id }, orderBy: { slotIndex: 'asc' } }),
      this.prisma.cityUnit.findMany({ where: { cityId: city.id } }),
      this.prisma.playerQuestProgress.findMany({
        where: { playerId: bootstrap.player.id, status: 'claimed' },
        select: { questId: true },
      }),
      this.prisma.gameAnalyticsEvent.groupBy({
        by: ['eventType'],
        where: { playerId: bootstrap.player.id },
        _count: { eventType: true },
        orderBy: { eventType: 'asc' },
      }),
    ]);
    const unitCountByType = new Map(units.map((unit) => [unit.unitType, unit.quantity]));
    const blockerContext = { buildings, resources, researchOverview, units: unitCountByType };
    const blockers = this.evaluateBlockers(blockerContext);

    return {
      player: {
        id: bootstrap.player.id,
        name: bootstrap.player.name,
        accountAgeHours: Math.max(0, Math.floor((Date.now() - city.createdAt.getTime()) / 3600000)),
      },
      city: {
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
      },
      resources,
      production,
      storage,
      buildings: buildings.map((building) => {
        const definition =
          BUILDING_UPGRADE_CONFIG[building.buildingType as keyof typeof BUILDING_UPGRADE_CONFIG];
        return {
          type: building.buildingType,
          name: BUILDING_CONFIG[building.buildingType as BuildingType]?.name ?? building.buildingType,
          level: building.level,
          status: building.status,
          upgradeCost: calculateBuildingUpgradeCost({
            currentLevel: building.level,
            definition,
          }),
          upgradeDurationSeconds: calculateBuildingUpgradeDurationSeconds({
            currentLevel: building.level,
            definition,
            worldSpeed: 1,
          }),
        };
      }),
      research: {
        researchPoints: researchOverview.researchPoints,
        researchPointsPerHour: researchOverview.researchPointsPerHour,
        activeResearch: researchOverview.activeResearch,
      },
      units: (Object.keys(UNIT_CONFIG) as UnitType[]).map<DebugEconomyUnit>((unitType) => {
        const unit = UNIT_CONFIG[unitType];
        return {
          type: unitType,
          category: unit.category,
          name: unit.name,
          description: unit.description,
          cost: unit.cost,
          trainingSecondsPerUnit: unit.trainingSecondsPerUnit,
          attack: unit.attack,
          defense: unit.defense,
          health: unit.health,
          speed: unit.speed,
          capacity: unit.capacity,
          owned: unitCountByType.get(unitType) ?? 0,
        };
      }),
      pveCampRewards: Object.values(PVE_CAMP_LEVEL_CONFIG).map((camp) => ({
        level: camp.level,
        enemyStrength: camp.enemyStrength,
        victoryLossPercent: camp.victoryLossPercent,
        rewards: camp.rewards,
      })),
      claimedQuestRewards: claimedQuests.map<QuestReward>((claim) => {
        const quest = TUTORIAL_QUESTS.find((candidate) => candidate.id === claim.questId);
        return (quest?.rewards ?? {}) as QuestReward;
      }),
      analytics: analytics.map((event) => ({
        eventType: event.eventType,
        count: event._count.eventType,
      })),
      estimatedNextMeaningfulAction: this.estimateNextAction(blockerContext),
      progressionBlockers: blockers,
    };
  }

  async getProgressionBlockers(): Promise<EconomyProgressionBlocker[]> {
    const dashboard = await this.getDashboard();
    return dashboard.progressionBlockers;
  }

  private evaluateBlockers(input: {
    buildings: Array<{ buildingType: string; level: number; status: string }>;
    resources: ResourceBalance;
    researchOverview: { researchPoints: number; activeResearch: unknown };
    units: Map<string, number>;
  }): EconomyProgressionBlocker[] {
    const level = (buildingType: string) =>
      input.buildings.find((building) => building.buildingType === buildingType)?.level ?? 0;
    const blockers: EconomyProgressionBlocker[] = [];

    if (level('academy') < 1 && input.researchOverview.researchPoints < TECHNOLOGY_CONFIG.improved_woodcutting.cost) {
      blockers.push({
        id: 'academy-not-built',
        severity: 'blocked',
        title: 'Research is blocked',
        description: 'The Academy is not built, so scientists cannot generate research points.',
        recommendation: 'Build Academy level 1 and assign at least 3 scientists.',
      });
    }
    if (level('barracks') < 1) {
      blockers.push({
        id: 'barracks-not-built',
        severity: 'warning',
        title: 'PvE is blocked',
        description: 'No Barracks exists, so the player cannot train Spearmen for Barbarian camps.',
        recommendation: 'Build Barracks level 1 by Day 3.',
      });
    }
    if (level('palace') < 1 && input.resources.wood < 300 && input.resources.gold < 200) {
      blockers.push({
        id: 'palace-too-expensive',
        severity: 'info',
        title: 'Expansion is not ready',
        description: 'Palace level 1 is still out of reach for current resources.',
        recommendation: 'Keep Palace as the Day 5-6 resource goal.',
      });
    }
    if (input.units.get('spearman') === 0 && level('barracks') >= 1) {
      blockers.push({
        id: 'no-pve-army',
        severity: 'warning',
        title: 'No army for first camp',
        description: 'Barracks is built but no Spearmen are trained.',
        recommendation: 'Train 5-8 Spearmen before attacking a level 1 Barbarian Village.',
      });
    }
    for (const resourceType of RESOURCE_KEYS) {
      if (input.resources[resourceType] >= 3000) {
        blockers.push({
          id: `${resourceType}-storage-full`,
          severity: 'warning',
          title: `${resourceType} may be capped`,
          description: 'The resource balance is at or near early Warehouse capacity.',
          recommendation: 'Spend resources or upgrade Warehouse before production is wasted.',
        });
      }
    }

    return blockers;
  }

  private estimateNextAction(input: {
    buildings: Array<{ buildingType: string; level: number; status: string }>;
    resources: ResourceBalance;
    researchOverview: { activeResearch: unknown };
    units: Map<string, number>;
  }): string {
    const level = (buildingType: string) =>
      input.buildings.find((building) => building.buildingType === buildingType)?.level ?? 0;

    if (input.buildings.some((building) => building.status === 'upgrading')) return 'Wait for the active building upgrade to finish.';
    if (level('academy') < 1) return 'Build Academy level 1 to unlock research production.';
    if (!input.researchOverview.activeResearch) return 'Assign scientists and start a tier 1 research.';
    if (level('barracks') < 1) return 'Build Barracks level 1 and prepare the first Spearmen.';
    if ((input.units.get('spearman') ?? 0) < 6) return 'Train Spearmen until the city has at least 6.';
    if (level('palace') < 1) return 'Save wood and gold for Palace level 1.';
    return 'Choose a second city location and prepare colonization resources.';
  }
}
