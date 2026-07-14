import {
  calculateCityLimit,
  calculateColonizationCost,
  calculateColonyShipCount,
  canColonize,
} from './index';

describe('colonization rules', () => {
  it('calculates city limit from palace level', () => {
    expect(calculateCityLimit({ palaceLevel: 0 })).toBe(1);
    expect(calculateCityLimit({ palaceLevel: 2 })).toBe(3);
  });

  it('returns base colonization cost for Sprint 8', () => {
    expect(
      calculateColonizationCost({
        currentCityCount: 1,
        baseCost: { wood: 800, gold: 500, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
      }),
    ).toEqual({ wood: 800, gold: 500, marble: 0, wine: 0, crystal: 0, sulfur: 0 });
  });

  it('grants colony ships from Palace level', () => {
    expect(
      calculateColonyShipCount({
        baseColonyShips: 0,
        colonyShipsPerPalaceLevel: 1,
        palaceLevel: 2,
      }),
    ).toBe(2);
  });

  it('requires research, palace, city limit, empty slot, and resources', () => {
    expect(
      canColonize({
        hasRequiredResearch: true,
        hasColonyShip: true,
        palaceLevel: 1,
        cityCount: 1,
        cityLimit: 2,
        targetSlotIsEmpty: true,
        hasEnoughResources: true,
      }),
    ).toEqual({ canColonize: true });
  });
});
