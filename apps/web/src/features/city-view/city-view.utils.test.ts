import type {
  ActiveConstructionSummary,
  CityBuildingSummary,
  ResourceBalance,
} from '@island-empires/shared-types';
import { describe, expect, it } from 'vitest';
import {
  deriveBuildingVisualState,
  getBuildingEffectSummaries,
  getUpgradeButtonState,
  toCityViewBuilding,
} from './city-view.utils';

function buildBuilding(overrides: Partial<CityBuildingSummary> = {}): CityBuildingSummary {
  return {
    id: 'building-warehouse',
    type: 'warehouse',
    name: 'Warehouse',
    level: 1,
    slotIndex: 1,
    status: 'idle',
    description: 'Stores and protects your city resources.',
    canUpgrade: true,
    upgradeCost: { wood: 100, gold: 40, marble: 0, wine: 0, crystal: 0, sulfur: 0 },
    upgradeDurationSeconds: 45,
    upgradeStartedAt: null,
    upgradeFinishesAt: null,
    ...overrides,
  };
}

function buildResources(overrides: Partial<ResourceBalance> = {}): ResourceBalance {
  return { wood: 1000, gold: 1000, marble: 0, wine: 0, crystal: 0, sulfur: 0, ...overrides };
}

const ACTIVE_CONSTRUCTION: ActiveConstructionSummary = {
  buildingId: 'building-city-hall',
  buildingType: 'city_hall',
  buildingName: 'City Hall',
  fromLevel: 1,
  toLevel: 2,
  startedAt: '2026-01-01T00:00:00.000Z',
  finishesAt: '2026-01-01T00:01:00.000Z',
  remainingSeconds: 60,
};

describe('deriveBuildingVisualState', () => {
  it('maps an upgrading building to upgrading', () => {
    expect(deriveBuildingVisualState(buildBuilding({ status: 'upgrading' }))).toBe('upgrading');
  });

  it('maps a level 0 buildable building to not_built', () => {
    expect(deriveBuildingVisualState(buildBuilding({ type: 'academy', level: 0 }))).toBe(
      'not_built',
    );
  });

  it('maps a future-sprint building to disabled regardless of level', () => {
    expect(
      deriveBuildingVisualState(
        buildBuilding({
          type: 'barracks',
          level: 0,
          canUpgrade: false,
          disabledReason: 'Available in future sprint',
          upgradeCost: undefined,
          upgradeDurationSeconds: undefined,
        }),
      ),
    ).toBe('disabled');
  });

  it('maps a building at its configured max level to max_level', () => {
    expect(
      deriveBuildingVisualState(
        buildBuilding({ level: 5, canUpgrade: false, disabledReason: 'Max level reached' }),
      ),
    ).toBe('max_level');
  });

  it('maps an upgradable building to upgrade_available', () => {
    expect(deriveBuildingVisualState(buildBuilding({ level: 2 }))).toBe('upgrade_available');
  });

  it('maps a built building blocked by a busy queue to idle', () => {
    expect(
      deriveBuildingVisualState(
        buildBuilding({ level: 2, canUpgrade: false, disabledReason: 'Construction busy' }),
      ),
    ).toBe('idle');
  });
});

describe('getBuildingEffectSummaries', () => {
  it('shows current and next storage capacity for the warehouse', () => {
    const [effect] = getBuildingEffectSummaries(buildBuilding({ level: 2 }));

    expect(effect.label).toBe('Storage capacity');
    expect(effect.current).toBe('5,000 per resource');
    expect(effect.next).toBe('7,000 per resource');
  });

  it('omits the next effect at max level', () => {
    const [effect] = getBuildingEffectSummaries(buildBuilding({ level: 50 }));

    expect(effect.current).toBe('101,000 per resource');
    expect(effect.next).toBeUndefined();
  });

  it('shows population capacity for the city hall', () => {
    const [effect] = getBuildingEffectSummaries(
      buildBuilding({ type: 'city_hall', name: 'City Hall', level: 1 }),
    );

    expect(effect.label).toBe('Population capacity');
    expect(effect.current).toBe('100');
    expect(effect.next).toBe('150');
  });

  it('shows the happiness bonus for the tavern', () => {
    const [effect] = getBuildingEffectSummaries(
      buildBuilding({ type: 'tavern', name: 'Tavern', level: 1 }),
    );

    expect(effect.label).toBe('Happiness bonus');
    expect(effect.current).toBe('+10');
    expect(effect.next).toBe('+20');
  });

  it('shows concrete city health effects for the hospital', () => {
    const effects = getBuildingEffectSummaries(
      buildBuilding({ type: 'hospital', name: 'Hospital', level: 2 }),
    );

    expect(effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Public health',
          current: '+8 health support',
          next: '+12 health support',
        }),
        expect.objectContaining({
          label: 'City resilience',
          current: '-2 population pressure',
          next: '-3 population pressure',
        }),
        expect.objectContaining({
          label: 'Population recovery',
          current: '+4% population growth',
          next: '+6% population growth',
        }),
      ]),
    );
  });

  it('explains the academy when it is not built yet', () => {
    const [effect] = getBuildingEffectSummaries(
      buildBuilding({ type: 'academy', name: 'Academy', level: 0 }),
    );

    expect(effect.current).toBe('Disabled');
    expect(effect.note).toBe('Build this to assign scientists and generate research points.');
  });

  it('shows the research bonus for a built academy', () => {
    const [effect] = getBuildingEffectSummaries(
      buildBuilding({ type: 'academy', name: 'Academy', level: 2 }),
    );

    expect(effect.current).toBe('Scientists enabled, +10% output');
    expect(effect.next).toBe('+20% output');
  });

  it('shows Port transport capacity before it is built', () => {
    const [effect] = getBuildingEffectSummaries(
      buildBuilding({ type: 'port', name: 'Port', level: 0 }),
    );

    expect(effect.label).toBe('Trade ships');
    expect(effect.current).toBe('Disabled');
    expect(effect.next).toBe('1 ship(s), 500 capacity');
    expect(effect.note).toBe('Build this to unlock transport.');
  });

  it("shows the local wood production bonus for Forester's House", () => {
    const [effect] = getBuildingEffectSummaries(
      buildBuilding({ type: 'foresters_house', name: "Forester's House", level: 3 }),
    );

    expect(effect.label).toBe('Wood production');
    expect(effect.current).toBe('+6%');
    expect(effect.next).toBe('+8%');
    expect(effect.note).toBe('Increases wood production by 2% per level in this city only.');
  });

  it('shows the matching luxury production bonus', () => {
    const [effect] = getBuildingEffectSummaries(
      buildBuilding({ type: 'crystal_lensworks', name: 'Crystal Lensworks', level: 4 }),
    );

    expect(effect.label).toBe('Crystal production');
    expect(effect.current).toBe('+8%');
    expect(effect.next).toBe('+10%');
    expect(effect.note).toBe(
      'Increases local crystal production by 2% per level in this city only.',
    );
  });

  it('shows wall defensive stats', () => {
    const effects = getBuildingEffectSummaries(
      buildBuilding({ type: 'wall', name: 'Town Wall', level: 2 }),
    );

    expect(effects).toHaveLength(4);
    expect(effects[0]).toMatchObject({ label: 'Wall sections', current: '3' });
    expect(effects[1]).toMatchObject({ label: 'Section durability', current: '100 HP, 8 armor' });
    expect(effects[2]).toMatchObject({ label: 'Wall attack', current: '10 damage, 45% accuracy' });
    expect(effects[3]).toMatchObject({
      label: 'Total defense',
      current: '300 HP, 14 attack power',
    });
  });
});

describe('getUpgradeButtonState', () => {
  it('labels an in-progress upgrade and disables the button', () => {
    const state = getUpgradeButtonState(
      buildBuilding({ status: 'upgrading', canUpgrade: false, disabledReason: 'Upgrading...' }),
      buildResources(),
      ACTIVE_CONSTRUCTION,
      false,
    );

    expect(state).toEqual({ label: 'Upgrading...', disabled: true });
  });

  it('flags insufficient resources', () => {
    const state = getUpgradeButtonState(buildBuilding(), buildResources({ wood: 10 }), null, false);

    expect(state).toEqual({ label: 'Not enough resources', disabled: true });
  });

  it('disables other buildings while the construction queue is busy', () => {
    const state = getUpgradeButtonState(
      buildBuilding({ canUpgrade: false, disabledReason: 'Construction busy' }),
      buildResources(),
      ACTIVE_CONSTRUCTION,
      false,
    );

    expect(state).toEqual({ label: 'Construction busy', disabled: true });
  });

  it('offers Build for the barracks now that unit training is enabled', () => {
    const state = getUpgradeButtonState(
      buildBuilding({ type: 'barracks', level: 0 }),
      buildResources(),
      null,
      false,
    );

    expect(state).toEqual({ label: 'Build', disabled: false });
  });

  it('offers Build for an affordable level 0 building', () => {
    const state = getUpgradeButtonState(
      buildBuilding({ type: 'academy', level: 0 }),
      buildResources(),
      null,
      false,
    );

    expect(state).toEqual({ label: 'Build', disabled: false });
  });

  it('offers Upgrade for an affordable built building', () => {
    const state = getUpgradeButtonState(buildBuilding({ level: 2 }), buildResources(), null, false);

    expect(state).toEqual({ label: 'Upgrade', disabled: false });
  });

  it('disables the button while an upgrade request is pending', () => {
    const state = getUpgradeButtonState(buildBuilding(), buildResources(), null, true);

    expect(state.disabled).toBe(true);
  });
});

describe('toCityViewBuilding', () => {
  it('attaches the hotspot, visual state, and effects', () => {
    const building = toCityViewBuilding(buildBuilding({ level: 2 }));

    expect(building).not.toBeNull();
    expect(building?.hotspot.buildingType).toBe('warehouse');
    expect(building?.visualState).toBe('upgrade_available');
    expect(building?.effects).toHaveLength(1);
  });

  it('attaches the governor residency hotspot', () => {
    const building = toCityViewBuilding(
      buildBuilding({ type: 'governor_residency', name: 'Governor Residency' }),
    );

    expect(building).not.toBeNull();
    expect(building?.hotspot.buildingType).toBe('governor_residency');
  });

  it('returns null for a building without a hotspot', () => {
    expect(toCityViewBuilding(buildBuilding({ type: 'unknown_government' }))).toBeNull();
  });
});
