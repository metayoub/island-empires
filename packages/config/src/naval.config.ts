export const NAVAL_SHIP_TYPES = {
  LIGHT_SHIP: 'light_ship',
  RAM_SHIP: 'ram_ship',
  FIRE_SHIP: 'fire_ship',
} as const;

export type NavalShipType = (typeof NAVAL_SHIP_TYPES)[keyof typeof NAVAL_SHIP_TYPES];

export const NAVAL_CONFIG = {
  attackMovementType: 'naval_attack',
  returnMovementType: 'naval_return',
  blockadeReturnMovementType: 'blockade_return',
  navalTravelMultiplier: 0.01,
  returnTravelTimeMultiplier: 0.01,
  minNavalTravelTimeSeconds: 60,
  blockadeDurationMinutes: 120,
  attackCooldownSeconds: 10 * 60,
  repeatedAttackWindowSeconds: 24 * 60 * 60,
  repeatedAttackLimit: 3,
  beginnerProtectionDays: 7,
  portDefensePerLevel: 20,
  shipyardDefensePerLevel: 30,
  warehouseProtectedAmountPerLevel: 200,
  lootPercentPerResource: 0.15,
  maxLootPerResource: 750,
  shipCarryCapacity: {
    light_ship: 120,
    ram_ship: 180,
    fire_ship: 90,
  },
  maxActiveBlockadesPerAttacker: 3,
} as const;
