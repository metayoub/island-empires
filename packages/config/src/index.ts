export { DEFAULT_WORLD_CONFIG } from './world.config.js';
export { MAP_CONFIG } from './map.config.js';
export {
  RESOURCE_LABELS,
  RESOURCE_TYPES,
  RESOURCE_PRODUCTION_CONFIG,
  STORAGE_CONFIG,
} from './resources.config.js';
export {
  BUILDING_CONFIG,
  BUILDING_DISPLAY_CONFIG,
  BUILDING_MILESTONE_CONFIG,
  BUILDING_TYPES,
  BUILDING_UPGRADE_CONFIG,
  LUXURY_PRODUCTION_BUILDINGS,
  PRODUCTION_BOOST_BUILDINGS,
  WALL_COMBAT_CONFIG,
} from './buildings.config.js';
export type { BuildingMilestone, BuildingType } from './buildings.config.js';
export { CONDITION_TYPES } from './conditions.config.js';
export type { ConditionSummary, ConditionType, UnlockCondition } from './conditions.config.js';
export {
  RESEARCH_CATEGORIES,
  RESEARCH_PRODUCTION_CONFIG,
  RESEARCH_TYPES,
  TECHNOLOGY_CONFIG,
} from './research.config.js';
export type { ResearchCategory, TechnologyDefinition, TechnologyId } from './research.config.js';
export { POPULATION_CONFIG } from './population.config.js';
export { HAPPINESS_CONFIG, HOSPITAL_HEALTH_CONFIG } from './happiness.config.js';
export { QUEST_TRIGGERS, TUTORIAL_QUESTS } from './quests.config.js';
export type { QuestTrigger, QuestRewards, TutorialQuestDefinition } from './quests.config.js';
export { TRANSPORT_CONFIG } from './transport.config.js';
export { MARKETPLACE_CONFIG, TRADE_SHIP_CONFIG } from './marketplace.config.js';
export { COLONIZATION_CONFIG } from './colonization.config.js';
export { TRAINING_CONFIG, UNIT_CONFIG, UNIT_TYPES } from './units.config.js';
export type { UnitCategory, UnitDefinition, UnitType } from './units.config.js';
export { NAVAL_CONFIG, NAVAL_SHIP_TYPES } from './naval.config.js';
export type { NavalShipType } from './naval.config.js';
export { getPveCampLevelConfig, PVE_CAMP_LEVEL_CONFIG, PVE_CONFIG, PVP_CONFIG } from './pve.config.js';
export type { PveCampLevelDefinition } from './pve.config.js';
export { SPY_CONFIG, SPY_MISSION_TYPES } from './spy.config.js';
export type { SpyMissionType } from './spy.config.js';
export {
  NOTIFICATION_EMAIL_TEMPLATES,
  NOTIFICATION_THROTTLE_SECONDS,
  NOTIFICATION_TYPES,
} from './notifications.config.js';
export type { NotificationType } from './notifications.config.js';
export { EVENT_CONFIG, EVENT_STATUS, EVENT_TYPES } from './events.config.js';
export type { EventDefinition, EventRewardDefinition, EventStatus, EventType } from './events.config.js';
export { ADMIN_CONFIG } from './admin.config.js';
export type { AdminRole } from './admin.config.js';
export { ANTI_ABUSE_CONFIG } from './anti-abuse.config.js';
export { MONETIZATION_CONFIG, SHOP_CATALOG } from './monetization.config.js';
export type { ShopCatalogProduct } from './monetization.config.js';
export {
  getInventoryItemDefinition,
  INVENTORY_CONFIG,
  INVENTORY_ITEM_CATALOG,
} from './inventory.config.js';
export type {
  InventoryItemBehavior,
  InventoryItemCategory,
  InventoryItemDefinition,
  InventoryItemSource,
} from './inventory.config.js';
export {
  getSupporterPackDefinition,
  SUPPORTER_CONFIG,
} from './supporter.config.js';
export type { SupporterPackDefinition } from './supporter.config.js';
export { BETA_CONFIG } from './beta.config.js';
