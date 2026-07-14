export type ResourceCost = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export type BuildingUpgradeDefinition = {
  maxLevel: number;
  baseCost: Partial<ResourceCost>;
  costMultiplier: number;
  baseDurationSeconds: number;
  durationMultiplier: number;
};

const RESOURCE_KEYS: Array<keyof ResourceCost> = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
];

export function calculateBuildingUpgradeCost(input: {
  currentLevel: number;
  definition: BuildingUpgradeDefinition;
}): ResourceCost {
  const level = Math.max(0, input.currentLevel);
  const multiplier = Number.isFinite(input.definition.costMultiplier)
    ? input.definition.costMultiplier
    : 1;

  const baseCost = RESOURCE_KEYS.reduce<ResourceCost>(
    (cost, resourceType) => {
      const baseValue = input.definition.baseCost[resourceType] ?? 0;
      cost[resourceType] = Math.max(0, Math.floor(baseValue * multiplier ** level));
      return cost;
    },
    { wood: 0, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
  );

  const advancedSurcharge = calculateAdvancedBuildingUpgradeSurcharge({
    currentLevel: level,
    baseCost,
  });

  return RESOURCE_KEYS.reduce<ResourceCost>(
    (cost, resourceType) => {
      cost[resourceType] = baseCost[resourceType] + advancedSurcharge[resourceType];
      return cost;
    },
    { wood: 0, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
  );
}

function calculateAdvancedBuildingUpgradeSurcharge(input: {
  currentLevel: number;
  baseCost: ResourceCost;
}): ResourceCost {
  const level = Math.max(0, input.currentLevel);
  const surcharge = { wood: 0, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 };
  if (level < 10) {
    return surcharge;
  }

  const coreCost = input.baseCost.wood + input.baseCost.gold;
  const advancedLevel = level - 9;
  surcharge.marble = Math.floor(coreCost * 0.18 * advancedLevel);

  if (level >= 20) {
    const regionalLevel = level - 19;
    surcharge.crystal = Math.floor(coreCost * 0.08 * regionalLevel);
    surcharge.sulfur = Math.floor(coreCost * 0.06 * regionalLevel);
  }

  if (level >= 30) {
    const imperialLevel = level - 29;
    surcharge.wine = Math.floor(coreCost * 0.05 * imperialLevel);
  }

  return surcharge;
}

export function calculateBuildingUpgradeDurationSeconds(input: {
  currentLevel: number;
  definition: BuildingUpgradeDefinition;
  worldSpeed: number;
  timeReductionPercent?: number;
}): number {
  const level = Math.max(0, input.currentLevel);
  const multiplier = Number.isFinite(input.definition.durationMultiplier)
    ? input.definition.durationMultiplier
    : 1;
  const worldSpeed =
    Number.isFinite(input.worldSpeed) && input.worldSpeed > 0 ? input.worldSpeed : 1;
  const rawDuration =
    (input.definition.baseDurationSeconds * multiplier ** level) / worldSpeed;
  const reductionMultiplier = getPercentageReductionMultiplier({
    percent: input.timeReductionPercent ?? 0,
    maxPercent: 50,
  });

  return Math.max(5, Math.floor(rawDuration * reductionMultiplier));
}

export function calculateLevelPercentBonus(input: {
  level: number;
  percentPerLevel: number;
  maxPercent: number;
}): number {
  const level = Math.max(0, Math.floor(input.level));
  const percentPerLevel = Number.isFinite(input.percentPerLevel) ? input.percentPerLevel : 0;
  const maxPercent = Math.max(0, Number.isFinite(input.maxPercent) ? input.maxPercent : 0);

  return Math.min(maxPercent, Math.max(0, level * percentPerLevel));
}

export function getPercentageReductionMultiplier(input: {
  percent: number;
  maxPercent: number;
}): number {
  const percent = Number.isFinite(input.percent) ? input.percent : 0;
  const clampedPercent = Math.min(Math.max(0, input.maxPercent), Math.max(0, percent));

  return Math.max(0, 1 - clampedPercent / 100);
}

export function canUpgradeBuilding(input: {
  currentLevel: number;
  maxLevel: number;
  isEnabled: boolean;
}): {
  canUpgrade: boolean;
  reason?: string;
} {
  if (!input.isEnabled) {
    return { canUpgrade: false, reason: 'Available in future sprint' };
  }

  if (input.currentLevel >= input.maxLevel) {
    return { canUpgrade: false, reason: 'Max level reached' };
  }

  return { canUpgrade: true };
}
