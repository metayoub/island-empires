export const HAPPINESS_CONFIG = {
  baseHappiness: 100,
  tavernHappinessPerLevel: 10,
  populationPressureStartRatio: 0.7,
  maxPopulationPressure: 50,
  minHappiness: 0,
  maxHappiness: 150,
} as const;

export const HOSPITAL_HEALTH_CONFIG = {
  healthSupportPerLevel: 4,
  populationPressureReliefPerLevel: 1,
  maxPopulationPressureRelief: 35,
  growthBonusPercentPerLevel: 2,
  maxGrowthBonusPercent: 50,
} as const;
