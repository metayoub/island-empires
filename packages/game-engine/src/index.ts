export function getGameEngineVersion(): string {
  return '0.0.1';
}

export {
  calculateResourceProduction,
  calculateProducedAmount,
  calculateStorageCapacity,
  applyStorageCap,
  calculateProductionBoostPercent,
} from './resources/index.js';
export type { ResourceProductionInput, ResourceProductionOutput } from './resources/index.js';

export {
  calculateBuildingUpgradeCost,
  calculateBuildingUpgradeDurationSeconds,
  calculateLevelPercentBonus,
  canUpgradeBuilding,
} from './buildings/index.js';
export type { BuildingUpgradeDefinition, ResourceCost } from './buildings/index.js';

export {
  calculatePopulationCapacity,
  calculatePopulationGrowth,
  calculateHappiness,
  calculateIdleCitizens,
} from './population/index.js';
export type { HappinessConfig, PopulationConfig } from './population/index.js';

export {
  calculateResearchProduction,
  calculateGeneratedResearchPoints,
  canStartResearch,
  getTechnologyState,
} from './research/index.js';
export type {
  ResearchProductionInput,
  ResearchProductionOutput,
  TechnologyState,
} from './research/index.js';

export { evaluateQuestTrigger, canClaimQuestReward } from './quests/index.js';
export type {
  QuestTriggerEvaluationInput,
  QuestTriggerEvaluationResult,
} from './quests/index.js';

export { calculateMapDistance, calculateTravelTimeSeconds } from './map/index.js';
export type {
  CalculateMapDistanceInput,
  CalculateTravelTimeSecondsInput,
  MapCoordinate,
} from './map/index.js';

export {
  calculateShipCapacity,
  calculateShipsRequired,
  calculateTradeShipCount,
  calculateTransportCapacity,
  calculateTransportLoad,
  calculateTransportTravelTimeSeconds,
  canStartTransport,
  canTransportResources,
  getTransportPayloadTotal,
} from './transport/index.js';
export type {
  ResourceAmount,
  TransportValidationResult,
  TransportRequirementResult,
  TransportResourcePayload,
} from './transport/index.js';

export {
  calculateMarketplaceCapacity,
  calculateMarketplaceTax,
  calculateTradeTravelTimeSeconds,
  canAcceptMarketplaceOffer,
  canCreateMarketplaceOffer,
  detectSuspiciousTrade,
} from './marketplace/index.js';
export type { SuspiciousTradeSignal } from './marketplace/index.js';

export {
  calculateCityLimit,
  calculateColonizationCost,
  calculateColonyShipCount,
  canColonize,
} from './colonization/index.js';
export type {
  ColonizationRequirementResult,
  ColonizationResourceCost,
} from './colonization/index.js';

export {
  calculateTrainingOrderCapacity,
  calculateUnitTrainingCost,
  calculateUnitTrainingDurationSeconds,
  calculateWorkshopTrainingBonus,
  canTrainUnits,
} from './units/index.js';
export type { TrainUnitsValidationResult, UnitTrainingCost } from './units/index.js';

export {
  calculateArmyAttackPower,
  calculateArmyDefensePower,
  calculateArmySize,
  calculatePvpLoot,
  calculatePvpUnitLosses,
  calculateTownWallStats,
  calculateUnitLosses,
  canAttackPveCamp,
  resolveNavalBattle,
  resolvePvpBattle,
  resolvePveBattle,
} from './combat/index.js';
export type {
  ArmyUnits,
  NavalBattleResult,
  PveAttackValidationResult,
  PveBattleResult,
  PveRewards,
  PvpBattleResult,
  PvpResources,
  TownWallStats,
  UnitCombatStats,
  WallCombatConfig,
} from './combat/index.js';

export {
  ALLIANCE_PROJECTS,
  ALLIANCE_RESOURCE_TYPES,
  EMPTY_ALLIANCE_RESOURCES,
  calculateAllianceContributionScore,
  calculateAllianceProjectProgressPercent,
  getAllianceProjectDefinition,
  isAllianceProjectComplete,
} from './alliances/index.js';
export type {
  AllianceProjectDefinition,
  AllianceProjectType,
  AllianceResourceBalance,
} from './alliances/index.js';

export {
  calculateSpyDetectionChance,
  calculateSpySuccessChance,
  calculateSpyTrainingCost,
  calculateSpyTravelTimeSeconds,
  canStartSpyMission,
  generateSpyReport,
} from './scouting/index.js';
export type {
  SpyMissionValidationResult,
  SpyReportInput,
  SpyReportOutput,
  SpyResourceBalance,
  SpyTrainingCost,
} from './scouting/index.js';

export {
  applyEventBonusPercent,
  calculateEventParticipationPoints,
  getLiveEventStatus,
  isLiveEventActive,
} from './events/index.js';
export type { LiveEventStatus, LiveEventTimingInput } from './events/index.js';

export {
  calculateActionFrequencyRisk,
  calculateRepeatedAttackRisk,
  calculateResourcePushingRisk,
  calculateRiskScore,
  calculateTradeRatioRisk,
  calculateTradeValue,
} from './anti-abuse/index.js';
export type { AntiAbuseRiskLevel } from './anti-abuse/index.js';
