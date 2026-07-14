import {
  BUILDING_DISPLAY_CONFIG,
  BUILDING_UPGRADE_CONFIG,
  HAPPINESS_CONFIG,
  HOSPITAL_HEALTH_CONFIG,
  MARKETPLACE_CONFIG,
  POPULATION_CONFIG,
  RESEARCH_PRODUCTION_CONFIG,
  STORAGE_CONFIG,
  TRANSPORT_CONFIG,
  WALL_COMBAT_CONFIG,
} from '@island-empires/config';
import {
  calculatePopulationCapacity,
  calculateStorageCapacity,
  calculateTownWallStats,
} from '@island-empires/game-engine';
import type {
  ActiveConstructionSummary,
  BuildingEffectSummary,
  BuildingVisualState,
  CityBuildingSummary,
  CityViewBuilding,
  ResourceBalance,
  ResourceCost,
} from '@island-empires/shared-types';
import { CITY_LAYOUT } from './city-layout.config';
import type { UpgradeButtonState } from './city-view.types';

const RESOURCE_KEYS: Array<keyof ResourceBalance> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];

const FUTURE_SPRINT_REASON = 'Available in future sprint';
const MAX_LEVEL_REASON = 'Max level reached';
const DEFAULT_TRANSPORT_CAPACITY_PER_PORT_LEVEL = 500;

function getMaxLevel(buildingType: string): number | undefined {
  const upgradeConfig = BUILDING_UPGRADE_CONFIG as Partial<Record<string, { maxLevel: number }>>;
  return upgradeConfig[buildingType]?.maxLevel;
}

export function isFutureBuilding(buildingType: string): boolean {
  const displayConfig = BUILDING_DISPLAY_CONFIG as Partial<
    Record<string, { enabledInSprint3: boolean }>
  >;
  return displayConfig[buildingType]?.enabledInSprint3 === false;
}

export function deriveBuildingVisualState(building: CityBuildingSummary): BuildingVisualState {
  if (building.status === 'upgrading') {
    return 'upgrading';
  }

  if (isFutureBuilding(building.type) || building.disabledReason === FUTURE_SPRINT_REASON) {
    return 'disabled';
  }

  if (building.level === 0) {
    return building.canUpgrade ? 'not_built' : 'disabled';
  }

  const maxLevel = getMaxLevel(building.type);
  if (
    (maxLevel !== undefined && building.level >= maxLevel) ||
    building.disabledReason === MAX_LEVEL_REASON
  ) {
    return 'max_level';
  }

  return building.canUpgrade ? 'upgrade_available' : 'idle';
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

export function getBuildingEffectSummaries(building: CityBuildingSummary): BuildingEffectSummary[] {
  const maxLevel = getMaxLevel(building.type);
  const hasNextLevel = maxLevel !== undefined && building.level < maxLevel;
  const milestoneEffect: BuildingEffectSummary[] = building.nextMilestone
    ? [
        {
          label: `Next milestone: Lv ${building.nextMilestone.level}`,
          current: building.nextMilestone.title,
          note: building.nextMilestone.description,
        },
      ]
    : [];

  switch (building.type) {
    case 'warehouse': {
      const capacityAtLevel = (level: number) =>
        calculateStorageCapacity({
          baseStorage: STORAGE_CONFIG.baseStorage,
          warehouseLevel: level,
          storagePerWarehouseLevel: STORAGE_CONFIG.storagePerWarehouseLevel,
        });
      return [
        {
          label: 'Storage capacity',
          current: `${formatNumber(capacityAtLevel(building.level))} per resource`,
          next: hasNextLevel
            ? `${formatNumber(capacityAtLevel(building.level + 1))} per resource`
            : undefined,
        },
        ...milestoneEffect,
      ];
    }
    case 'city_hall': {
      const capacityAtLevel = (level: number) =>
        calculatePopulationCapacity({
          cityHallLevel: level,
          basePopulationCapacity: POPULATION_CONFIG.basePopulationCapacity,
          populationCapacityPerCityHallLevel: POPULATION_CONFIG.populationCapacityPerCityHallLevel,
        });
      return [
        {
          label: 'Population capacity',
          current: formatNumber(capacityAtLevel(building.level)),
          next: hasNextLevel ? formatNumber(capacityAtLevel(building.level + 1)) : undefined,
        },
        ...milestoneEffect,
      ];
    }
    case 'tavern': {
      const bonusAtLevel = (level: number) => level * HAPPINESS_CONFIG.tavernHappinessPerLevel;
      return [
        {
          label: 'Happiness bonus',
          current: `+${bonusAtLevel(building.level)}`,
          next: hasNextLevel ? `+${bonusAtLevel(building.level + 1)}` : undefined,
        },
      ];
    }
    case 'academy': {
      if (building.level === 0) {
        return [
          {
            label: 'Research',
            current: 'Disabled',
            note: 'Build this to assign scientists and generate research points.',
          },
        ];
      }
      const bonusAtLevel = (level: number) =>
        Math.round((level - 1) * RESEARCH_PRODUCTION_CONFIG.academyBonusPerLevelAboveOne * 100);
      return [
        {
          label: 'Research',
          current: `Scientists enabled, +${bonusAtLevel(building.level)}% output`,
          next: hasNextLevel ? `+${bonusAtLevel(building.level + 1)}% output` : undefined,
        },
      ];
    }
    case 'barracks': {
      if (building.level === 0) {
        return [
          {
            label: 'Unit training',
            current: 'Disabled',
            note: 'Build this to train land troops for Barbarian Village attacks.',
          },
        ];
      }
      return [
        {
          label: 'Unit training',
          current: 'Land troop roster available',
          note: 'Higher Barracks levels unlock stronger troops and siege units.',
        },
      ];
    }
    case 'port': {
      const shipCapacity =
        TRANSPORT_CONFIG.shipCapacity ?? DEFAULT_TRANSPORT_CAPACITY_PER_PORT_LEVEL;
      const shipsAtLevel = (level: number) =>
        Math.max(0, Math.floor(level)) * Math.max(0, TRANSPORT_CONFIG.shipsPerPortLevel ?? 1);
      const capacityAtLevel = (level: number) => shipsAtLevel(level) * shipCapacity;
      return [
        {
          label: 'Trade ships',
          current:
            building.level > 0
              ? `${formatNumber(shipsAtLevel(building.level))} ship(s), ${formatNumber(capacityAtLevel(building.level))} capacity`
              : 'Disabled',
          next: hasNextLevel
            ? `${formatNumber(shipsAtLevel(building.level + 1))} ship(s), ${formatNumber(capacityAtLevel(building.level + 1))} capacity`
            : undefined,
          note:
            building.level > 0
              ? 'Allows resource transport between your cities.'
              : 'Build this to unlock transport.',
        },
      ];
    }
    case 'luxury_extractor': {
      const productionAtLevel = (level: number) =>
        level > 0
          ? `${formatNumber(Math.floor(4 * (1 + (level - 1) * 0.1)))} per worker / h`
          : 'Disabled';
      return [
        {
          label: 'Luxury production',
          current: productionAtLevel(building.level),
          next: hasNextLevel ? productionAtLevel(building.level + 1) : undefined,
          note: 'Workers harvest this island resource: Marble, Wine, Crystal, or Sulfur.',
        },
      ];
    }
    case 'foresters_house': {
      const bonusAtLevel = (level: number) => `+${formatNumber(Math.min(100, level * 2))}%`;
      return [
        {
          label: 'Wood production',
          current: building.level > 0 ? bonusAtLevel(building.level) : 'Disabled',
          next: hasNextLevel ? bonusAtLevel(building.level + 1) : undefined,
          note: 'Increases wood production by 2% per level in this city only.',
        },
        ...milestoneEffect,
      ];
    }
    case 'marble_mason':
    case 'vineyard_estate':
    case 'crystal_lensworks':
    case 'sulfur_refinery': {
      const resourceByBuilding: Record<string, string> = {
        marble_mason: 'Marble',
        vineyard_estate: 'Wine',
        crystal_lensworks: 'Crystal',
        sulfur_refinery: 'Sulfur',
      };
      const bonusAtLevel = (level: number) => `+${formatNumber(Math.min(100, level * 2))}%`;
      const resourceName = resourceByBuilding[building.type] ?? 'Luxury resource';

      return [
        {
          label: `${resourceName} production`,
          current: building.level > 0 ? bonusAtLevel(building.level) : 'Disabled',
          next: hasNextLevel ? bonusAtLevel(building.level + 1) : undefined,
          note: `Increases local ${resourceName.toLowerCase()} production by 2% per level in this city only.`,
        },
        ...milestoneEffect,
      ];
    }
    case 'trading_post': {
      const tradeBonusAtLevel = (level: number) =>
        level > 0 ? `+${formatNumber(level * 5)}% market efficiency` : 'Disabled';
      return [
        {
          label: 'Commerce',
          current: tradeBonusAtLevel(building.level),
          next: hasNextLevel ? tradeBonusAtLevel(building.level + 1) : undefined,
          note: 'Prepares the city for improved trade and market systems.',
        },
      ];
    }
    case 'marketplace': {
      const capacityAtLevel = (level: number) =>
        Math.max(0, level) * MARKETPLACE_CONFIG.capacityPerMarketplaceLevel;
      return [
        {
          label: 'Offer capacity',
          current:
            building.level > 0
              ? `${formatNumber(capacityAtLevel(building.level))} resources per offer`
              : 'Disabled',
          next: hasNextLevel
            ? `${formatNumber(capacityAtLevel(building.level + 1))} resources per offer`
            : undefined,
          note: 'Build this to create and accept player marketplace offers.',
        },
      ];
    }
    case 'hospital': {
      const healthAtLevel = (level: number) =>
        level > 0
          ? `+${formatNumber(level * HOSPITAL_HEALTH_CONFIG.healthSupportPerLevel)} health support`
          : 'Disabled';
      const pressureReliefAtLevel = (level: number) =>
        `-${formatNumber(
          Math.min(
            HOSPITAL_HEALTH_CONFIG.maxPopulationPressureRelief,
            Math.max(0, level) * HOSPITAL_HEALTH_CONFIG.populationPressureReliefPerLevel,
          ),
        )} population pressure`;
      const growthBonusAtLevel = (level: number) =>
        `+${formatNumber(
          Math.min(
            HOSPITAL_HEALTH_CONFIG.maxGrowthBonusPercent,
            Math.max(0, level) * HOSPITAL_HEALTH_CONFIG.growthBonusPercentPerLevel,
          ),
        )}% population growth`;
      return [
        {
          label: 'Public health',
          current: healthAtLevel(building.level),
          next: hasNextLevel ? healthAtLevel(building.level + 1) : undefined,
          note: 'Makes the city more resilient by supporting population recovery and stability.',
        },
        {
          label: 'City resilience',
          current: building.level > 0 ? pressureReliefAtLevel(building.level) : 'Disabled',
          next: hasNextLevel ? pressureReliefAtLevel(building.level + 1) : undefined,
          note: 'Reduces the crowding pressure that lowers happiness in high-population cities.',
        },
        {
          label: 'Population recovery',
          current: building.level > 0 ? growthBonusAtLevel(building.level) : 'Disabled',
          next: hasNextLevel ? growthBonusAtLevel(building.level + 1) : undefined,
          note: 'Increases population growth before capacity is reached.',
        },
      ];
    }
    case 'shipyard': {
      const shipbuildingAtLevel = (level: number) =>
        level > 0 ? `+${formatNumber(level * 5)}% ship construction speed` : 'Disabled';
      return [
        {
          label: 'Ship construction',
          current: shipbuildingAtLevel(building.level),
          next: hasNextLevel ? shipbuildingAtLevel(building.level + 1) : undefined,
          note: 'Build ships and unlock stronger boats with Shipyard upgrades.',
        },
      ];
    }
    case 'spy_agency': {
      return [
        {
          label: 'Scouting',
          current: building.level > 0 ? 'Spy training and missions enabled' : 'Disabled',
          next: hasNextLevel ? 'Higher success and stealth from agency upgrades' : undefined,
          note: 'Trains spies and improves scouting success before player conflict.',
        },
        {
          label: 'Counter-spy defense',
          current:
            building.level > 0 ? `Level ${building.level} defensive office` : 'No defense office',
          next: hasNextLevel ? `Level ${building.level + 1} defensive office` : undefined,
        },
        ...milestoneEffect,
      ];
    }
    case 'builders_guild': {
      const reductionAtLevel = (level: number) =>
        `-${formatNumber(Math.min(50, Math.max(0, level)))}% building upgrade time`;
      return [
        {
          label: 'Construction acceleration',
          current: building.level > 0 ? reductionAtLevel(building.level) : 'Disabled',
          next: hasNextLevel ? reductionAtLevel(building.level + 1) : undefined,
          note: 'Reduces city building upgrade duration by 1% per level, capped at 50%.',
        },
        ...milestoneEffect,
      ];
    }
    case 'workshop': {
      const reductionAtLevel = (level: number) =>
        `-${formatNumber(Math.min(30, Math.max(0, level)))}%`;
      return [
        {
          label: 'Training time',
          current: building.level > 0 ? reductionAtLevel(building.level) : 'Disabled',
          next: hasNextLevel ? reductionAtLevel(building.level + 1) : undefined,
        },
        {
          label: 'Training cost',
          current: building.level > 0 ? reductionAtLevel(building.level) : 'Disabled',
          next: hasNextLevel ? reductionAtLevel(building.level + 1) : undefined,
          note: 'Applies to Barracks troops and Shipyard warships. Capped at 30%.',
        },
        ...milestoneEffect,
      ];
    }
    case 'wall': {
      const cityHallLevel = 1;
      const currentStats = calculateTownWallStats({
        wallLevel: building.level,
        cityHallLevel,
        config: WALL_COMBAT_CONFIG,
      });
      const nextStats = hasNextLevel
        ? calculateTownWallStats({
            wallLevel: building.level + 1,
            cityHallLevel,
            config: WALL_COMBAT_CONFIG,
          })
        : undefined;

      return [
        {
          label: 'Wall sections',
          current: formatNumber(currentStats.sectionCount),
          next: nextStats ? formatNumber(nextStats.sectionCount) : undefined,
          note: 'Section count scales with City Hall level when city-defense combat is resolved.',
        },
        {
          label: 'Section durability',
          current: `${formatNumber(currentStats.hitPointsPerSection)} HP, ${formatNumber(currentStats.armorPerSection)} armor`,
          next: nextStats
            ? `${formatNumber(nextStats.hitPointsPerSection)} HP, ${formatNumber(nextStats.armorPerSection)} armor`
            : undefined,
        },
        {
          label: 'Wall attack',
          current:
            building.level > 0
              ? `${formatNumber(currentStats.damagePerSection)} damage, ${Math.round(currentStats.accuracy * 100)}% accuracy`
              : 'Disabled',
          next: nextStats
            ? `${formatNumber(nextStats.damagePerSection)} damage, ${Math.round(nextStats.accuracy * 100)}% accuracy`
            : undefined,
        },
        {
          label: 'Total defense',
          current:
            building.level > 0
              ? `${formatNumber(currentStats.totalHitPoints)} HP, ${formatNumber(currentStats.totalAttackPower)} attack power`
              : 'No wall protection',
          next: nextStats
            ? `${formatNumber(nextStats.totalHitPoints)} HP, ${formatNumber(nextStats.totalAttackPower)} attack power`
            : undefined,
        },
      ];
    }
    default:
      return [
        {
          label: 'Effect',
          current: '—',
          note: 'Coming in a later sprint.',
        },
      ];
  }
}

export function hasInsufficientResources(
  cost: ResourceCost | undefined,
  resources: ResourceBalance,
): boolean {
  return RESOURCE_KEYS.some(
    (resourceType) => resources[resourceType] < (cost?.[resourceType] ?? 0),
  );
}

export function getUpgradeButtonState(
  building: CityBuildingSummary,
  resources: ResourceBalance,
  activeConstruction: ActiveConstructionSummary | null,
  isPending: boolean,
): UpgradeButtonState {
  const isBuilt = building.level > 0;
  const isUpgrading = building.status === 'upgrading';
  const insufficientResources = hasInsufficientResources(building.upgradeCost, resources);
  const isConstructionBusy =
    Boolean(activeConstruction) && activeConstruction?.buildingId !== building.id;

  if (isFutureBuilding(building.type)) {
    return { label: 'Available later', disabled: true };
  }

  const label = isUpgrading
    ? 'Upgrading...'
    : insufficientResources && building.canUpgrade
      ? 'Not enough resources'
      : building.disabledReason
        ? building.disabledReason
        : isBuilt
          ? 'Upgrade'
          : 'Build';

  return {
    label,
    disabled:
      isPending ||
      isUpgrading ||
      isConstructionBusy ||
      !building.canUpgrade ||
      insufficientResources,
  };
}

export function toCityViewBuilding(building: CityBuildingSummary): CityViewBuilding | null {
  const hotspot = CITY_LAYOUT.hotspots.find(
    (candidate) => candidate.buildingType === building.type,
  );
  if (!hotspot) {
    return null;
  }

  return {
    ...building,
    visualState: deriveBuildingVisualState(building),
    hotspot,
    effects: getBuildingEffectSummaries(building),
  };
}

export function formatDuration(seconds?: number): string {
  if (!seconds) {
    return 'Unavailable';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}
