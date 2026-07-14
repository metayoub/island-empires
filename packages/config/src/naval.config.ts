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
  navalTravelMultiplier: 0.9,
  returnTravelTimeMultiplier: 0.9,
  minNavalTravelTimeSeconds: 60,
  blockadeDurationMinutes: 120,
  attackCooldownSeconds: 10 * 60,
  repeatedAttackWindowSeconds: 24 * 60 * 60,
  repeatedAttackLimit: 3,
  beginnerProtectionDays: 7,
  portDefensePerLevel: 20,
  shipyardDefensePerLevel: 30,
  maxActiveBlockadesPerAttacker: 3,
} as const;
