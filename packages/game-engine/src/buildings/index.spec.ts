import {
  calculateLevelPercentBonus,
  calculateBuildingUpgradeCost,
  calculateBuildingUpgradeDurationSeconds,
  canUpgradeBuilding,
} from './index';

const definition = {
  maxLevel: 5,
  baseCost: {
    wood: 120,
    gold: 50,
  },
  costMultiplier: 1.6,
  baseDurationSeconds: 60,
  durationMultiplier: 1.5,
};

describe('calculateBuildingUpgradeCost', () => {
  it('uses current level as the upgrade exponent and floors values', () => {
    expect(calculateBuildingUpgradeCost({ currentLevel: 1, definition })).toEqual({
      wood: 192,
      gold: 80,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    });
  });

  it('treats level 0 and missing resources as valid zero-based construction', () => {
    expect(calculateBuildingUpgradeCost({ currentLevel: 0, definition }).wood).toBe(120);
    expect(calculateBuildingUpgradeCost({ currentLevel: 0, definition }).marble).toBe(0);
  });

  it('adds advanced material pressure after level 10', () => {
    const warehouseDefinition = {
      maxLevel: 50,
      baseCost: {
        wood: 100,
        gold: 40,
      },
      costMultiplier: 1.5,
      baseDurationSeconds: 45,
      durationMultiplier: 1.4,
    };

    expect(calculateBuildingUpgradeCost({ currentLevel: 9, definition: warehouseDefinition })).toEqual({
      wood: 3844,
      gold: 1537,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    });
    expect(calculateBuildingUpgradeCost({ currentLevel: 11, definition: warehouseDefinition })).toEqual({
      wood: 8649,
      gold: 3459,
      marble: 4358,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    });
  });
});

describe('calculateBuildingUpgradeDurationSeconds', () => {
  it('applies world speed and floors duration', () => {
    expect(
      calculateBuildingUpgradeDurationSeconds({
        currentLevel: 1,
        definition,
        worldSpeed: 2,
      }),
    ).toBe(45);
  });

  it('uses a minimum duration and falls back for invalid world speed', () => {
    expect(
      calculateBuildingUpgradeDurationSeconds({
        currentLevel: 0,
        definition: { ...definition, baseDurationSeconds: 1 },
        worldSpeed: 0,
      }),
    ).toBe(5);
  });

  it('applies a capped construction time reduction', () => {
    expect(
      calculateBuildingUpgradeDurationSeconds({
        currentLevel: 1,
        definition,
        worldSpeed: 1,
        timeReductionPercent: 10,
      }),
    ).toBe(81);
    expect(
      calculateBuildingUpgradeDurationSeconds({
        currentLevel: 1,
        definition,
        worldSpeed: 1,
        timeReductionPercent: 90,
      }),
    ).toBe(45);
  });
});

describe('calculateLevelPercentBonus', () => {
  it('calculates one-percent-per-level bonuses with a cap', () => {
    expect(calculateLevelPercentBonus({ level: 0, percentPerLevel: 1, maxPercent: 50 })).toBe(0);
    expect(calculateLevelPercentBonus({ level: 12, percentPerLevel: 1, maxPercent: 50 })).toBe(12);
    expect(calculateLevelPercentBonus({ level: 80, percentPerLevel: 1, maxPercent: 50 })).toBe(50);
  });
});

describe('canUpgradeBuilding', () => {
  it('blocks disabled buildings and max-level buildings', () => {
    expect(canUpgradeBuilding({ currentLevel: 0, maxLevel: 5, isEnabled: false })).toEqual({
      canUpgrade: false,
      reason: 'Available in future sprint',
    });
    expect(canUpgradeBuilding({ currentLevel: 5, maxLevel: 5, isEnabled: true })).toEqual({
      canUpgrade: false,
      reason: 'Max level reached',
    });
  });
});
