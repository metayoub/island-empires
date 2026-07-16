export const PVE_CONFIG = {
  attackMovementType: 'pve_attack',
  returnMovementType: 'pve_return',
  travelTimeMultiplier: 1,
  returnTravelTimeMultiplier: 1,
  minTravelTimeSeconds: 30,
  villageSlotIndex: 11,
  maxVillageLevel: 50,
} as const;

export const PVP_CONFIG = {
  attackMovementType: 'pvp_attack',
  returnMovementType: 'pvp_return',
  travelTimeMultiplier: 1,
  returnTravelTimeMultiplier: 1,
  minTravelTimeSeconds: 30,
  attackCooldownSeconds: 10 * 60,
  repeatedAttackWindowSeconds: 24 * 60 * 60,
  repeatedAttackLimit: 3,
  beginnerProtectionDays: 7,
  wallDefensePerLevel: 50,
  warehouseProtectedAmountPerLevel: 200,
  lootPercentPerResource: 0.2,
  maxLootPerResource: 500,
  landUnitCarryCapacity: {
    militia: 6,
    spearman: 10,
    archer: 8,
    swordsman: 12,
    cavalry: 20,
    catapult: 5,
  },
} as const;

export type PveCampLevelDefinition = {
  level: number;
  enemyStrength: number;
  strengthLabel: 'Low' | 'Medium' | 'High';
  victoryLossPercent: number;
  defeatLossPercent: number;
  rewards: {
    wood: number;
    gold: number;
    marble: number;
    wine: number;
    crystal: number;
    sulfur: number;
  };
};

export const PVE_CAMP_LEVEL_CONFIG: Record<number, PveCampLevelDefinition> = {
  1: {
    level: 1,
    enemyStrength: 40,
    strengthLabel: 'Low',
    victoryLossPercent: 0.1,
    defeatLossPercent: 0.5,
    rewards: { wood: 500, gold: 250, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
  },
  2: {
    level: 2,
    enemyStrength: 120,
    strengthLabel: 'Medium',
    victoryLossPercent: 0.2,
    defeatLossPercent: 0.6,
    rewards: { wood: 900, gold: 500, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
  },
  3: {
    level: 3,
    enemyStrength: 260,
    strengthLabel: 'High',
    victoryLossPercent: 0.3,
    defeatLossPercent: 0.7,
    rewards: { wood: 1500, gold: 900, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
  },
} as const;

export function getPveCampLevelConfig(level: number): PveCampLevelDefinition {
  const normalizedLevel = Math.max(1, Math.min(PVE_CONFIG.maxVillageLevel, Math.floor(level)));
  const configured = PVE_CAMP_LEVEL_CONFIG[normalizedLevel];

  if (configured) {
    return configured;
  }

  return {
    level: normalizedLevel,
    enemyStrength: 260 + (normalizedLevel - 3) * 115,
    strengthLabel: normalizedLevel < 10 ? 'High' : normalizedLevel < 25 ? 'Medium' : 'High',
    victoryLossPercent: Math.min(0.45, 0.3 + (normalizedLevel - 3) * 0.003),
    defeatLossPercent: Math.min(0.85, 0.7 + (normalizedLevel - 3) * 0.002),
    rewards: {
      wood: Math.floor(1500 + (normalizedLevel - 3) * 1071.5),
      gold: Math.floor(900 + (normalizedLevel - 3) * 514.3),
      marble: Math.max(0, Math.floor((normalizedLevel - 3) * 357.2)),
      sulfur: Math.max(0, Math.floor((normalizedLevel - 7) * 166.7)),
      crystal: Math.max(0, Math.floor((normalizedLevel - 14) * 220)),
      wine: Math.max(0, Math.floor((normalizedLevel - 19) * 260)),
    },
  };
}
