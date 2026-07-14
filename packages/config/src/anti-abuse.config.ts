export const ANTI_ABUSE_CONFIG = {
  resourceValueWeights: {
    wood: 1,
    gold: 1,
    marble: 2,
    wine: 2,
    crystal: 3,
    sulfur: 3,
  },
  tradeRatioRisk: {
    medium: 5,
    high: 10,
    critical: 20,
  },
  resourcePushing: {
    oneHourWindowMinutes: 60,
    oneDayWindowMinutes: 1440,
    sevenDayWindowMinutes: 10080,
    highTransferPercentOfGeneratedResources: 0.7,
  },
  repeatedAttack: {
    sameTargetWindowHours: 24,
    mediumCount: 3,
    highCount: 5,
    criticalCount: 8,
  },
  botLikeActivity: {
    minimumRegularActionCount: 20,
    highRequestsPerMinute: 120,
    criticalRequestsPerMinute: 300,
  },
  rateLimits: {
    messageSend: { maxActions: 20, windowMinutes: 60 },
    marketplaceOfferCreate: { maxActions: 30, windowMinutes: 60 },
    marketplaceOfferAccept: { maxActions: 40, windowMinutes: 60 },
    pvpAttackStart: { maxActions: 20, windowMinutes: 60 },
    navalAttackStart: { maxActions: 20, windowMinutes: 60 },
    allianceDonation: { maxActions: 60, windowMinutes: 60 },
    loginAttempt: { maxActions: 10, windowMinutes: 15 },
  },
} as const;
