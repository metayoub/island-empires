export type ArmyUnits = Record<string, number>;

export type UnitCombatStats = {
  attack: number;
  defense: number;
  health: number;
};

export type PveRewards = {
  wood: number;
  gold: number;
};

export type PveBattleResult = {
  victory: boolean;
  playerPower: number;
  campPower: number;
  unitsSent: ArmyUnits;
  unitsLost: ArmyUnits;
  unitsSurvived: ArmyUnits;
  rewards: PveRewards;
};

export type PvpResources = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export type PvpBattleResult = {
  attackerVictory: boolean;
  attackerPower: number;
  defenderPower: number;
  wallDefenseBonus: number;
  attackerUnitsSent: ArmyUnits;
  defenderUnitsParticipated: ArmyUnits;
  attackerUnitsLost: ArmyUnits;
  defenderUnitsLost: ArmyUnits;
  attackerUnitsSurvived: ArmyUnits;
  defenderUnitsSurvived: ArmyUnits;
  loot: PvpResources;
  protectedResources: PvpResources;
  attackerLossRate: number;
  defenderLossRate: number;
};

export type NavalBattleResult = {
  attackerVictory: boolean;
  attackerPower: number;
  defenderPower: number;
  portDefenseBonus: number;
  shipyardDefenseBonus: number;
  attackerShipsSent: ArmyUnits;
  defenderShipsParticipated: ArmyUnits;
  attackerShipsLost: ArmyUnits;
  defenderShipsLost: ArmyUnits;
  attackerShipsSurvived: ArmyUnits;
  defenderShipsSurvived: ArmyUnits;
  attackerLossRate: number;
  defenderLossRate: number;
};

export type PveAttackValidationResult = {
  canAttack: boolean;
  reason?: string;
};

export type WallCombatConfig = {
  hitPointsPerLevel: number;
  armorPerLevel: number;
  baseDamage: number;
  damagePerLevel: number;
  level10DamageBonus: number;
  level20DamageBonus: number;
  baseAccuracy: number;
  level10Accuracy: number;
  level20Accuracy: number;
  baseSections: number;
  sectionsPerCityHallLevel: number;
  maxSections: number;
};

export type TownWallStats = {
  level: number;
  sectionCount: number;
  hitPointsPerSection: number;
  armorPerSection: number;
  damagePerSection: number;
  accuracy: number;
  totalHitPoints: number;
  totalAttackPower: number;
};

function normalizeQuantity(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

function normalizeLevel(value: number): number {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

export function calculateTownWallStats(input: {
  wallLevel: number;
  cityHallLevel: number;
  config: WallCombatConfig;
}): TownWallStats {
  const level = normalizeLevel(input.wallLevel);
  const cityHallLevel = normalizeLevel(input.cityHallLevel);

  if (level === 0) {
    return {
      level,
      sectionCount: 0,
      hitPointsPerSection: 0,
      armorPerSection: 0,
      damagePerSection: 0,
      accuracy: 0,
      totalHitPoints: 0,
      totalAttackPower: 0,
    };
  }

  const sectionCount = Math.max(
    1,
    Math.min(
      Math.max(1, input.config.maxSections),
      input.config.baseSections + cityHallLevel * input.config.sectionsPerCityHallLevel,
    ),
  );
  const level10DamageBonus = level >= 10 ? input.config.level10DamageBonus : 0;
  const level20DamageBonus = level >= 20 ? input.config.level20DamageBonus : 0;
  const damagePerSection =
    input.config.baseDamage +
    level * input.config.damagePerLevel +
    level10DamageBonus +
    level20DamageBonus;
  const accuracy =
    level >= 20
      ? input.config.level20Accuracy
      : level >= 10
        ? input.config.level10Accuracy
        : input.config.baseAccuracy;

  return {
    level,
    sectionCount,
    hitPointsPerSection: level * input.config.hitPointsPerLevel,
    armorPerSection: level * input.config.armorPerLevel,
    damagePerSection,
    accuracy,
    totalHitPoints: sectionCount * level * input.config.hitPointsPerLevel,
    totalAttackPower: Math.round(sectionCount * damagePerSection * accuracy),
  };
}

export function calculateArmySize(units: ArmyUnits): number {
  return Object.values(units).reduce((sum, quantity) => sum + normalizeQuantity(quantity), 0);
}

export function calculateArmyAttackPower(input: {
  units: ArmyUnits;
  unitStats: Record<string, UnitCombatStats>;
}): number {
  return Object.entries(input.units).reduce((sum, [unitType, quantity]) => {
    const stats = input.unitStats[unitType];
    if (!stats) {
      return sum;
    }

    return sum + normalizeQuantity(quantity) * Math.max(0, stats.attack);
  }, 0);
}

export function calculateArmyDefensePower(input: {
  units: ArmyUnits;
  unitStats: Record<string, UnitCombatStats>;
}): number {
  return Object.entries(input.units).reduce((sum, [unitType, quantity]) => {
    const stats = input.unitStats[unitType];
    if (!stats) {
      return sum;
    }

    return sum + normalizeQuantity(quantity) * Math.max(0, stats.defense);
  }, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function normalizeArmy(units: ArmyUnits): ArmyUnits {
  return Object.fromEntries(
    Object.entries(units).map(([unitType, quantity]) => [unitType, normalizeQuantity(quantity)]),
  );
}

function subtractUnits(units: ArmyUnits, losses: ArmyUnits): ArmyUnits {
  return Object.fromEntries(
    Object.entries(units).map(([unitType, quantity]) => [
      unitType,
      Math.max(0, normalizeQuantity(quantity) - normalizeQuantity(losses[unitType] ?? 0)),
    ]),
  );
}

export function calculateUnitLosses(input: {
  units: ArmyUnits;
  lossPercent: number;
}): ArmyUnits {
  const lossPercent = Math.min(1, Math.max(0, input.lossPercent));

  return Object.fromEntries(
    Object.entries(input.units).map(([unitType, quantity]) => {
      const sent = normalizeQuantity(quantity);
      return [unitType, Math.min(sent, Math.round(sent * lossPercent))];
    }),
  );
}

export function calculatePvpUnitLosses(input: {
  units: ArmyUnits;
  lossPercent: number;
}): ArmyUnits {
  const units = normalizeArmy(input.units);
  const losses = Object.fromEntries(
    Object.entries(units).map(([unitType, quantity]) => [
      unitType,
      Math.min(quantity, Math.floor(quantity * clamp(input.lossPercent, 0, 1))),
    ]),
  ) as ArmyUnits;

  const totalUnits = calculateArmySize(units);
  const totalLosses = calculateArmySize(losses);
  if (totalUnits > 0 && input.lossPercent > 0 && totalLosses === 0) {
    const [largestUnitType] = Object.entries(units).reduce<[string, number]>(
      (largest, current) => (current[1] > largest[1] ? current : largest),
      ['', 0],
    );
    if (largestUnitType) {
      losses[largestUnitType] = 1;
    }
  }

  return losses;
}

export function calculatePvpLoot(input: {
  availableResources: PvpResources;
  protectedAmountPerResource: number;
  lootPercentPerResource: number;
  maxLootPerResource: number;
  carryCapacity: number;
}): { loot: PvpResources; protectedResources: PvpResources } {
  const protectedResources = Object.fromEntries(
    Object.entries(input.availableResources).map(([resourceType, amount]) => [
      resourceType,
      Math.min(normalizeQuantity(amount), Math.max(0, input.protectedAmountPerResource)),
    ]),
  ) as PvpResources;
  const candidates = Object.fromEntries(
    Object.entries(input.availableResources).map(([resourceType, amount]) => {
      const unprotected = Math.max(0, normalizeQuantity(amount) - protectedResources[resourceType as keyof PvpResources]);
      return [
        resourceType,
        Math.min(
          Math.floor(unprotected * clamp(input.lootPercentPerResource, 0, 1)),
          Math.max(0, Math.floor(input.maxLootPerResource)),
        ),
      ];
    }),
  ) as PvpResources;
  const loot = { wood: 0, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 };
  let remainingCapacity = Math.max(0, Math.floor(input.carryCapacity));

  for (const resourceType of Object.keys(loot) as Array<keyof PvpResources>) {
    const amount = Math.min(candidates[resourceType], remainingCapacity);
    loot[resourceType] = amount;
    remainingCapacity -= amount;
    if (remainingCapacity <= 0) {
      break;
    }
  }

  return { loot, protectedResources };
}

export function resolvePvpBattle(input: {
  attackerUnits: ArmyUnits;
  defenderUnits: ArmyUnits;
  unitStats: Record<string, UnitCombatStats & { capacity?: number; carryCapacity?: number }>;
  wallLevel: number;
  wallDefensePerLevel: number;
  defenderResources: PvpResources;
  warehouseLevel: number;
  warehouseProtectedAmountPerLevel: number;
  lootPercentPerResource: number;
  maxLootPerResource: number;
}): PvpBattleResult {
  const attackerUnitsSent = normalizeArmy(input.attackerUnits);
  const defenderUnitsParticipated = normalizeArmy(input.defenderUnits);
  const attackerPower = calculateArmyAttackPower({ units: attackerUnitsSent, unitStats: input.unitStats });
  const wallDefenseBonus = normalizeLevel(input.wallLevel) * Math.max(0, input.wallDefensePerLevel);
  const defenderPower =
    calculateArmyDefensePower({ units: defenderUnitsParticipated, unitStats: input.unitStats }) + wallDefenseBonus;
  const attackerVictory = attackerPower > defenderPower;
  const safeAttackerPower = Math.max(1, attackerPower);
  const safeDefenderPower = Math.max(1, defenderPower);
  const attackerLossRate = attackerVictory
    ? clamp((defenderPower / safeAttackerPower) * 0.35, 0.05, 0.4)
    : clamp((defenderPower / safeAttackerPower) * 0.6, 0.3, 0.85);
  const defenderLossRate = attackerVictory
    ? clamp((attackerPower / safeDefenderPower) * 0.5, 0.2, 0.75)
    : clamp((attackerPower / safeDefenderPower) * 0.25, 0.03, 0.35);
  const attackerUnitsLost = calculatePvpUnitLosses({
    units: attackerUnitsSent,
    lossPercent: attackerLossRate,
  });
  const defenderUnitsLost = calculatePvpUnitLosses({
    units: defenderUnitsParticipated,
    lossPercent: defenderLossRate,
  });
  const attackerUnitsSurvived = subtractUnits(attackerUnitsSent, attackerUnitsLost);
  const defenderUnitsSurvived = subtractUnits(defenderUnitsParticipated, defenderUnitsLost);
  const carryCapacity = attackerVictory
    ? Object.entries(attackerUnitsSurvived).reduce((sum, [unitType, quantity]) => {
        const stats = input.unitStats[unitType];
        return sum + normalizeQuantity(quantity) * Math.max(0, stats?.carryCapacity ?? stats?.capacity ?? 0);
      }, 0)
    : 0;
  const lootResult = attackerVictory
    ? calculatePvpLoot({
        availableResources: input.defenderResources,
        protectedAmountPerResource:
          normalizeLevel(input.warehouseLevel) * Math.max(0, input.warehouseProtectedAmountPerLevel),
        lootPercentPerResource: input.lootPercentPerResource,
        maxLootPerResource: input.maxLootPerResource,
        carryCapacity,
      })
    : {
        loot: { wood: 0, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
        protectedResources: { wood: 0, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
      };

  return {
    attackerVictory,
    attackerPower,
    defenderPower,
    wallDefenseBonus,
    attackerUnitsSent,
    defenderUnitsParticipated,
    attackerUnitsLost,
    defenderUnitsLost,
    attackerUnitsSurvived,
    defenderUnitsSurvived,
    loot: lootResult.loot,
    protectedResources: lootResult.protectedResources,
    attackerLossRate,
    defenderLossRate,
  };
}

export function resolveNavalBattle(input: {
  attackerShips: ArmyUnits;
  defenderShips: ArmyUnits;
  shipStats: Record<string, UnitCombatStats>;
  portLevel: number;
  shipyardLevel: number;
  portDefensePerLevel: number;
  shipyardDefensePerLevel: number;
}): NavalBattleResult {
  const attackerShipsSent = normalizeArmy(input.attackerShips);
  const defenderShipsParticipated = normalizeArmy(input.defenderShips);
  const attackerPower = calculateArmyAttackPower({
    units: attackerShipsSent,
    unitStats: input.shipStats,
  });
  const portDefenseBonus = normalizeLevel(input.portLevel) * Math.max(0, input.portDefensePerLevel);
  const shipyardDefenseBonus = normalizeLevel(input.shipyardLevel) * Math.max(0, input.shipyardDefensePerLevel);
  const defenderPower =
    calculateArmyDefensePower({ units: defenderShipsParticipated, unitStats: input.shipStats }) +
    portDefenseBonus +
    shipyardDefenseBonus;
  const attackerVictory = attackerPower > defenderPower;
  const safeAttackerPower = Math.max(1, attackerPower);
  const safeDefenderPower = Math.max(1, defenderPower);
  const attackerLossRate = attackerVictory
    ? clamp((defenderPower / safeAttackerPower) * 0.3, 0.05, 0.35)
    : clamp((defenderPower / safeAttackerPower) * 0.6, 0.3, 0.85);
  const defenderLossRate = attackerVictory
    ? clamp((attackerPower / safeDefenderPower) * 0.55, 0.2, 0.8)
    : clamp((attackerPower / safeDefenderPower) * 0.25, 0.03, 0.35);
  const attackerShipsLost = calculatePvpUnitLosses({
    units: attackerShipsSent,
    lossPercent: attackerLossRate,
  });
  const defenderShipsLost = calculatePvpUnitLosses({
    units: defenderShipsParticipated,
    lossPercent: defenderLossRate,
  });

  return {
    attackerVictory,
    attackerPower,
    defenderPower,
    portDefenseBonus,
    shipyardDefenseBonus,
    attackerShipsSent,
    defenderShipsParticipated,
    attackerShipsLost,
    defenderShipsLost,
    attackerShipsSurvived: subtractUnits(attackerShipsSent, attackerShipsLost),
    defenderShipsSurvived: subtractUnits(defenderShipsParticipated, defenderShipsLost),
    attackerLossRate,
    defenderLossRate,
  };
}

export function resolvePveBattle(input: {
  units: ArmyUnits;
  unitStats: Record<string, UnitCombatStats>;
  campPower: number;
  victoryLossPercent: number;
  defeatLossPercent: number;
  rewards: PveRewards;
}): PveBattleResult {
  const unitsSent = Object.fromEntries(
    Object.entries(input.units).map(([unitType, quantity]) => [unitType, normalizeQuantity(quantity)]),
  );
  const playerPower = calculateArmyAttackPower({ units: unitsSent, unitStats: input.unitStats });
  const campPower = Math.max(0, Math.floor(input.campPower));
  const victory = playerPower >= campPower;
  const unitsLost = calculateUnitLosses({
    units: unitsSent,
    lossPercent: victory ? input.victoryLossPercent : input.defeatLossPercent,
  });
  const unitsSurvived = Object.fromEntries(
    Object.entries(unitsSent).map(([unitType, quantity]) => [
      unitType,
      quantity - (unitsLost[unitType] ?? 0),
    ]),
  );

  return {
    victory,
    playerPower,
    campPower,
    unitsSent,
    unitsLost,
    unitsSurvived,
    rewards: victory ? { ...input.rewards } : { wood: 0, gold: 0 },
  };
}

export function canAttackPveCamp(input: {
  originCityIsOnMap: boolean;
  hasAtLeastOneUnit: boolean;
  hasEnoughUnits: boolean;
}): PveAttackValidationResult {
  if (!input.originCityIsOnMap) {
    return { canAttack: false, reason: 'CITY_NOT_PLACED_ON_MAP' };
  }
  if (!input.hasAtLeastOneUnit) {
    return { canAttack: false, reason: 'NO_UNITS_SELECTED' };
  }
  if (!input.hasEnoughUnits) {
    return { canAttack: false, reason: 'NOT_ENOUGH_UNITS' };
  }

  return { canAttack: true };
}
