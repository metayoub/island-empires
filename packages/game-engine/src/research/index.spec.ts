import {
  calculateGeneratedResearchPoints,
  calculateResearchProduction,
  canStartResearch,
  getTechnologyState,
} from './index';

describe('calculateResearchProduction', () => {
  const baseInput = {
    researchPerScientistPerHour: 5,
    academyBonusPerLevelAboveOne: 0.25,
  };

  it('produces no research points with 0 scientists', () => {
    expect(
      calculateResearchProduction({ ...baseInput, scientists: 0, academyLevel: 1 })
        .researchPointsPerHour,
    ).toBe(0);
  });

  it('disables production when Academy level is 0', () => {
    const result = calculateResearchProduction({ ...baseInput, scientists: 5, academyLevel: 0 });

    expect(result.researchPointsPerHour).toBe(0);
    expect(result.academyBonusMultiplier).toBe(1);
  });

  it('gives base production at Academy level 1', () => {
    const result = calculateResearchProduction({ ...baseInput, scientists: 5, academyLevel: 1 });

    expect(result.researchPointsPerHour).toBe(25);
    expect(result.academyBonusMultiplier).toBe(1);
  });

  it('applies the Academy bonus at level 2', () => {
    const result = calculateResearchProduction({ ...baseInput, scientists: 5, academyLevel: 2 });

    expect(result.researchPointsPerHour).toBe(31);
    expect(result.academyBonusMultiplier).toBeCloseTo(1.25);
  });
});

describe('calculateGeneratedResearchPoints', () => {
  it('calculates generated points after 1 hour', () => {
    expect(
      calculateGeneratedResearchPoints({
        researchPointsPerHour: 20,
        lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
        now: new Date('2026-01-01T01:00:00.000Z'),
      }),
    ).toBe(20);
  });

  it('calculates generated points after 30 minutes', () => {
    expect(
      calculateGeneratedResearchPoints({
        researchPointsPerHour: 20,
        lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
        now: new Date('2026-01-01T00:30:00.000Z'),
      }),
    ).toBe(10);
  });
});

describe('getTechnologyState', () => {
  it('is locked when requirements are missing', () => {
    expect(
      getTechnologyState({
        technologyId: 'basic_architecture',
        completedTechnologyIds: [],
        activeTechnologyId: null,
        requirements: ['improved_woodcutting'],
      }),
    ).toBe('locked');
  });

  it('is available when requirements are completed', () => {
    expect(
      getTechnologyState({
        technologyId: 'basic_architecture',
        completedTechnologyIds: ['improved_woodcutting'],
        activeTechnologyId: null,
        requirements: ['improved_woodcutting'],
      }),
    ).toBe('available');
  });

  it('is researching when active', () => {
    expect(
      getTechnologyState({
        technologyId: 'improved_woodcutting',
        completedTechnologyIds: [],
        activeTechnologyId: 'improved_woodcutting',
        requirements: [],
      }),
    ).toBe('researching');
  });

  it('is completed when unlocked', () => {
    expect(
      getTechnologyState({
        technologyId: 'improved_woodcutting',
        completedTechnologyIds: ['improved_woodcutting'],
        activeTechnologyId: null,
        requirements: [],
      }),
    ).toBe('completed');
  });
});

describe('canStartResearch', () => {
  const baseInput = {
    technologyId: 'improved_woodcutting',
    technologyCost: 900,
    currentResearchPoints: 1000,
    isAlreadyCompleted: false,
    isAlreadyResearching: false,
    requirementsCompleted: true,
  };

  it('cannot start research without enough points', () => {
    const result = canStartResearch({ ...baseInput, currentResearchPoints: 500 });

    expect(result.canStart).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('cannot start a completed technology', () => {
    const result = canStartResearch({ ...baseInput, isAlreadyCompleted: true });

    expect(result.canStart).toBe(false);
  });

  it('cannot start a locked technology', () => {
    const result = canStartResearch({ ...baseInput, requirementsCompleted: false });

    expect(result.canStart).toBe(false);
  });

  it('can start an available technology with enough points', () => {
    expect(canStartResearch(baseInput).canStart).toBe(true);
  });
});
