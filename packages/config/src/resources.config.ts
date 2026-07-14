export const RESOURCE_TYPES = {
  WOOD: 'wood',
  GOLD: 'gold',
  MARBLE: 'marble',
  WINE: 'wine',
  CRYSTAL: 'crystal',
  SULFUR: 'sulfur',
} as const;

export const RESOURCE_LABELS = {
  [RESOURCE_TYPES.WOOD]: 'Wood',
  [RESOURCE_TYPES.GOLD]: 'Gold',
  [RESOURCE_TYPES.MARBLE]: 'Marble',
  [RESOURCE_TYPES.WINE]: 'Wine',
  [RESOURCE_TYPES.CRYSTAL]: 'Crystal',
  [RESOURCE_TYPES.SULFUR]: 'Sulfur',
} as const;

export const RESOURCE_PRODUCTION_CONFIG = {
  baseWoodPerHour: 30,
  baseGoldPerHour: 20,
  woodPerWorkerPerHour: 5,
  goldPerWorkerPerHour: 3,
  luxuryPerWorkerPerHour: 4,
  luxuryExtractorBonusPerLevel: 0.1,
} as const;

export const STORAGE_CONFIG = {
  baseStorage: 1000,
  storagePerWarehouseLevel: 2000,
} as const;
