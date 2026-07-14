import {
  calculateArmyAttackPower,
  calculateArmyDefensePower,
  calculateArmySize,
  calculatePvpLoot,
  calculatePvpUnitLosses,
  calculateTownWallStats,
  calculateUnitLosses,
  canAttackPveCamp,
  resolvePvpBattle,
  resolvePveBattle,
  resolveNavalBattle,
} from './index';

const UNIT_STATS = {
  militia: { attack: 3, defense: 4, health: 7 },
  spearman: { attack: 5, defense: 8, health: 10 },
  archer: { attack: 9, defense: 4, health: 8 },
  swordsman: { attack: 12, defense: 8, health: 12 },
  cavalry: { attack: 18, defense: 10, health: 16 },
  catapult: { attack: 32, defense: 6, health: 24 },
};

const SHIP_STATS = {
  light_ship: { attack: 10, defense: 8, health: 20 },
  ram_ship: { attack: 16, defense: 18, health: 35 },
  fire_ship: { attack: 28, defense: 10, health: 25 },
};

const WALL_CONFIG = {
  hitPointsPerLevel: 50,
  armorPerLevel: 4,
  baseDamage: 6,
  damagePerLevel: 2,
  level10DamageBonus: 15,
  level20DamageBonus: 25,
  baseAccuracy: 0.45,
  level10Accuracy: 0.6,
  level20Accuracy: 0.8,
  baseSections: 2,
  sectionsPerCityHallLevel: 1,
  maxSections: 7,
};

describe('combat calculations', () => {
  it('calculates no wall stats when the wall is not built', () => {
    expect(calculateTownWallStats({ wallLevel: 0, cityHallLevel: 4, config: WALL_CONFIG })).toEqual({
      level: 0,
      sectionCount: 0,
      hitPointsPerSection: 0,
      armorPerSection: 0,
      damagePerSection: 0,
      accuracy: 0,
      totalHitPoints: 0,
      totalAttackPower: 0,
    });
  });

  it('calculates wall sections, hit points, armor, damage, and accuracy', () => {
    expect(calculateTownWallStats({ wallLevel: 5, cityHallLevel: 3, config: WALL_CONFIG })).toEqual({
      level: 5,
      sectionCount: 5,
      hitPointsPerSection: 250,
      armorPerSection: 20,
      damagePerSection: 16,
      accuracy: 0.45,
      totalHitPoints: 1250,
      totalAttackPower: 36,
    });
  });

  it('applies wall damage and accuracy breakpoints at levels 10 and 20', () => {
    const level10 = calculateTownWallStats({ wallLevel: 10, cityHallLevel: 5, config: WALL_CONFIG });
    const level20 = calculateTownWallStats({ wallLevel: 20, cityHallLevel: 10, config: WALL_CONFIG });

    expect(level10.damagePerSection).toBe(41);
    expect(level10.accuracy).toBe(0.6);
    expect(level20.sectionCount).toBe(7);
    expect(level20.damagePerSection).toBe(86);
    expect(level20.accuracy).toBe(0.8);
  });

  it('calculates army size and attack power', () => {
    const units = { spearman: 10, archer: 5, swordsman: 0 };

    expect(calculateArmySize(units)).toBe(15);
    expect(calculateArmyAttackPower({ units, unitStats: UNIT_STATS })).toBe(10 * 5 + 5 * 9);
    expect(calculateArmyDefensePower({ units, unitStats: UNIT_STATS })).toBe(10 * 8 + 5 * 4);
  });

  it('ignores unknown unit types and invalid quantities', () => {
    expect(
      calculateArmyAttackPower({
        units: { spearman: 2, unknown_unit: 10, archer: -3 },
        unitStats: UNIT_STATS,
      }),
    ).toBe(10);
  });

  it('calculates rounded unit losses capped at the sent quantity', () => {
    expect(calculateUnitLosses({ units: { spearman: 10, archer: 3 }, lossPercent: 0.1 })).toEqual({
      spearman: 1,
      archer: 0,
    });
    expect(calculateUnitLosses({ units: { spearman: 5 }, lossPercent: 1.5 })).toEqual({
      spearman: 5,
    });
  });

  it('floors PvP losses and applies a minimum loss to participating armies', () => {
    expect(calculatePvpUnitLosses({ units: { spearman: 3, archer: 0 }, lossPercent: 0.1 })).toEqual({
      spearman: 1,
      archer: 0,
    });
    expect(calculatePvpUnitLosses({ units: { spearman: 10 }, lossPercent: 0.35 })).toEqual({
      spearman: 3,
    });
  });

  it('caps PvP loot by warehouse protection, per-resource caps, and carry capacity', () => {
    expect(
      calculatePvpLoot({
        availableResources: { wood: 1000, gold: 700, marble: 100, wine: 0, crystal: 0, sulfur: 0 },
        protectedAmountPerResource: 200,
        lootPercentPerResource: 0.2,
        maxLootPerResource: 500,
        carryCapacity: 180,
      }).loot,
    ).toEqual({ wood: 160, gold: 20, marble: 0, wine: 0, crystal: 0, sulfur: 0 });
  });

  it('resolves PvP with defender tie advantage, wall defense, casualties, and no loot on defense win', () => {
    const result = resolvePvpBattle({
      attackerUnits: { spearman: 10, archer: 0, swordsman: 0 },
      defenderUnits: { spearman: 0, archer: 0, swordsman: 0 },
      unitStats: {
        spearman: { ...UNIT_STATS.spearman, carryCapacity: 10 },
        archer: { ...UNIT_STATS.archer, carryCapacity: 8 },
        swordsman: { ...UNIT_STATS.swordsman, carryCapacity: 12 },
      },
      wallLevel: 1,
      wallDefensePerLevel: 50,
      defenderResources: { wood: 1000, gold: 1000, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
      warehouseLevel: 1,
      warehouseProtectedAmountPerLevel: 200,
      lootPercentPerResource: 0.2,
      maxLootPerResource: 500,
    });

    expect(result.attackerPower).toBe(50);
    expect(result.defenderPower).toBe(50);
    expect(result.attackerVictory).toBe(false);
    expect(result.loot).toEqual({ wood: 0, gold: 0, marble: 0, wine: 0, crystal: 0, sulfur: 0 });
  });

  it('resolves a PvP attack victory with capped carried loot', () => {
    const result = resolvePvpBattle({
      attackerUnits: { spearman: 0, archer: 0, swordsman: 10 },
      defenderUnits: { spearman: 2, archer: 0, swordsman: 0 },
      unitStats: {
        militia: { ...UNIT_STATS.militia, carryCapacity: 6 },
        spearman: { ...UNIT_STATS.spearman, carryCapacity: 10 },
        archer: { ...UNIT_STATS.archer, carryCapacity: 8 },
        swordsman: { ...UNIT_STATS.swordsman, carryCapacity: 12 },
        cavalry: { ...UNIT_STATS.cavalry, carryCapacity: 20 },
        catapult: { ...UNIT_STATS.catapult, carryCapacity: 5 },
      },
      wallLevel: 0,
      wallDefensePerLevel: 50,
      defenderResources: { wood: 1000, gold: 1000, marble: 1000, wine: 0, crystal: 0, sulfur: 0 },
      warehouseLevel: 1,
      warehouseProtectedAmountPerLevel: 200,
      lootPercentPerResource: 0.2,
      maxLootPerResource: 500,
    });

    expect(result.attackerVictory).toBe(true);
    expect(result.attackerPower).toBe(120);
    expect(result.defenderPower).toBe(16);
    expect(calculateArmySize(result.attackerUnitsSurvived)).toBeGreaterThan(0);
    expect(Object.values(result.loot).reduce((sum, amount) => sum + amount, 0)).toBeLessThanOrEqual(120);
  });

  it('includes every current land unit in PvP power and carry calculations', () => {
    const result = resolvePvpBattle({
      attackerUnits: { militia: 5, spearman: 4, archer: 3, swordsman: 2, cavalry: 1, catapult: 1 },
      defenderUnits: { militia: 2, spearman: 1, archer: 1, swordsman: 1, cavalry: 0, catapult: 0 },
      unitStats: {
        militia: { ...UNIT_STATS.militia, carryCapacity: 6 },
        spearman: { ...UNIT_STATS.spearman, carryCapacity: 10 },
        archer: { ...UNIT_STATS.archer, carryCapacity: 8 },
        swordsman: { ...UNIT_STATS.swordsman, carryCapacity: 12 },
        cavalry: { ...UNIT_STATS.cavalry, carryCapacity: 20 },
        catapult: { ...UNIT_STATS.catapult, carryCapacity: 5 },
      },
      wallLevel: 0,
      wallDefensePerLevel: 50,
      defenderResources: { wood: 1000, gold: 1000, marble: 1000, wine: 1000, crystal: 1000, sulfur: 1000 },
      warehouseLevel: 0,
      warehouseProtectedAmountPerLevel: 200,
      lootPercentPerResource: 0.2,
      maxLootPerResource: 500,
    });

    expect(result.attackerPower).toBe(136);
    expect(result.defenderPower).toBe(28);
    expect(Object.values(result.loot).reduce((sum, amount) => sum + amount, 0)).toBeGreaterThan(0);
  });

  it('resolves a victory when player power is at least the camp power', () => {
    const result = resolvePveBattle({
      units: { spearman: 10, archer: 0, swordsman: 0 },
      unitStats: UNIT_STATS,
      campPower: 40,
      victoryLossPercent: 0.1,
      defeatLossPercent: 0.5,
      rewards: { wood: 150, gold: 75 },
    });

    expect(result.victory).toBe(true);
    expect(result.playerPower).toBe(50);
    expect(result.campPower).toBe(40);
    expect(result.unitsLost).toEqual({ spearman: 1, archer: 0, swordsman: 0 });
    expect(result.unitsSurvived).toEqual({ spearman: 9, archer: 0, swordsman: 0 });
    expect(result.rewards).toEqual({ wood: 150, gold: 75 });
  });

  it('resolves naval combat with port and shipyard defense bonuses', () => {
    const result = resolveNavalBattle({
      attackerShips: { light_ship: 3, ram_ship: 0, fire_ship: 0 },
      defenderShips: { light_ship: 0, ram_ship: 0, fire_ship: 0 },
      shipStats: SHIP_STATS,
      portLevel: 1,
      shipyardLevel: 1,
      portDefensePerLevel: 20,
      shipyardDefensePerLevel: 30,
    });

    expect(result.attackerPower).toBe(30);
    expect(result.defenderPower).toBe(50);
    expect(result.attackerVictory).toBe(false);
  });

  it('applies naval casualties to both fleets and returns survivors', () => {
    const result = resolveNavalBattle({
      attackerShips: { light_ship: 0, ram_ship: 0, fire_ship: 5 },
      defenderShips: { light_ship: 2, ram_ship: 1, fire_ship: 0 },
      shipStats: SHIP_STATS,
      portLevel: 1,
      shipyardLevel: 0,
      portDefensePerLevel: 20,
      shipyardDefensePerLevel: 30,
    });

    expect(result.attackerVictory).toBe(true);
    expect(result.attackerPower).toBe(140);
    expect(result.defenderPower).toBe(54);
    expect(calculateArmySize(result.attackerShipsLost)).toBeGreaterThan(0);
    expect(calculateArmySize(result.defenderShipsLost)).toBeGreaterThan(0);
    expect(calculateArmySize(result.attackerShipsSurvived)).toBeGreaterThan(0);
  });

  it('resolves a defeat with heavier losses and no rewards', () => {
    const result = resolvePveBattle({
      units: { spearman: 4, archer: 0, swordsman: 0 },
      unitStats: UNIT_STATS,
      campPower: 120,
      victoryLossPercent: 0.1,
      defeatLossPercent: 0.5,
      rewards: { wood: 350, gold: 180 },
    });

    expect(result.victory).toBe(false);
    expect(result.playerPower).toBe(20);
    expect(result.unitsLost).toEqual({ spearman: 2, archer: 0, swordsman: 0 });
    expect(result.unitsSurvived).toEqual({ spearman: 2, archer: 0, swordsman: 0 });
    expect(result.rewards).toEqual({ wood: 0, gold: 0 });
  });

  it('validates attack requirements in order', () => {
    expect(
      canAttackPveCamp({ originCityIsOnMap: false, hasAtLeastOneUnit: true, hasEnoughUnits: true }),
    ).toEqual({ canAttack: false, reason: 'CITY_NOT_PLACED_ON_MAP' });
    expect(
      canAttackPveCamp({ originCityIsOnMap: true, hasAtLeastOneUnit: false, hasEnoughUnits: true }),
    ).toEqual({ canAttack: false, reason: 'NO_UNITS_SELECTED' });
    expect(
      canAttackPveCamp({ originCityIsOnMap: true, hasAtLeastOneUnit: true, hasEnoughUnits: false }),
    ).toEqual({ canAttack: false, reason: 'NOT_ENOUGH_UNITS' });
    expect(
      canAttackPveCamp({ originCityIsOnMap: true, hasAtLeastOneUnit: true, hasEnoughUnits: true }),
    ).toEqual({ canAttack: true });
  });
});
