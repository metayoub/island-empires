export const SPY_CONFIG = {
  unit: {
    cost: {
      wood: 80,
      gold: 120,
      marble: 0,
      wine: 0,
      crystal: 20,
      sulfur: 0,
    },
    trainingTimeSeconds: 90,
  },

  spyTravelMultiplier: 0.8,
  minSpyTravelTimeSeconds: 60,

  baseSuccessChance: 0.65,
  attackerLevelBonus: 0.05,
  defenderLevelPenalty: 0.04,
  counterSpyPerDefendingSpy: 0.02,
  minSuccessChance: 0.15,
  maxSuccessChance: 0.9,

  baseDetectionChance: 0.2,
  defenderDetectionBonus: 0.04,
  counterSpyDetectionBonus: 0.015,
  attackerStealthBonus: 0.03,
  minDetectionChance: 0.05,
  maxDetectionChance: 0.8,

  missionCooldownMinutes: 30,
} as const;

export const SPY_MISSION_TYPES = {
  RESOURCE_REPORT: 'resource_report',
  ARMY_REPORT: 'army_report',
  BUILDING_REPORT: 'building_report',
} as const;

export type SpyMissionType = (typeof SPY_MISSION_TYPES)[keyof typeof SPY_MISSION_TYPES];
