import {
  calculateHappiness,
  calculateIdleCitizens,
  calculatePopulationCapacity,
  calculatePopulationGrowth,
} from './index';

describe('population calculations', () => {
  it('calculates capacity with City Hall level 1', () => {
    expect(
      calculatePopulationCapacity({
        cityHallLevel: 1,
        basePopulationCapacity: 50,
        populationCapacityPerCityHallLevel: 50,
      }),
    ).toBe(100);
  });

  it('calculates capacity with City Hall level 2', () => {
    expect(
      calculatePopulationCapacity({
        cityHallLevel: 2,
        basePopulationCapacity: 50,
        populationCapacityPerCityHallLevel: 50,
      }),
    ).toBe(150);
  });

  it('calculates population growth after 1 hour', () => {
    const result = calculatePopulationGrowth({
      currentPopulation: 50,
      populationCapacity: 100,
      happiness: 100,
      baseGrowthPerHour: 2,
      lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
      now: new Date('2026-01-01T01:00:00.000Z'),
    });

    expect(result.newPopulation).toBe(52);
    expect(result.gainedPopulation).toBe(2);
    expect(result.isAtCapacity).toBe(false);
  });

  it('calculates population growth after 30 minutes', () => {
    const result = calculatePopulationGrowth({
      currentPopulation: 50,
      populationCapacity: 100,
      happiness: 100,
      baseGrowthPerHour: 2,
      lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
      now: new Date('2026-01-01T00:30:00.000Z'),
    });

    expect(result.newPopulation).toBe(51);
  });

  it('does not exceed population capacity', () => {
    const result = calculatePopulationGrowth({
      currentPopulation: 99,
      populationCapacity: 100,
      happiness: 150,
      baseGrowthPerHour: 4,
      lastCalculatedAt: new Date('2026-01-01T00:00:00.000Z'),
      now: new Date('2026-01-01T02:00:00.000Z'),
    });

    expect(result.newPopulation).toBe(100);
    expect(result.gainedPopulation).toBe(1);
    expect(result.isAtCapacity).toBe(true);
  });
});

describe('happiness calculations', () => {
  const baseInput = {
    population: 50,
    populationCapacity: 100,
    baseHappiness: 100,
    tavernHappinessPerLevel: 10,
    populationPressureStartRatio: 0.7,
    maxPopulationPressure: 50,
  };

  it('calculates happiness with Tavern level 0', () => {
    expect(calculateHappiness({ ...baseInput, tavernLevel: 0 })).toBe(100);
  });

  it('calculates happiness with Tavern level 1', () => {
    expect(calculateHappiness({ ...baseInput, tavernLevel: 1 })).toBe(110);
  });

  it('applies population pressure', () => {
    expect(calculateHappiness({ ...baseInput, population: 90, tavernLevel: 0 })).toBe(80);
  });

  it('uses Hospital pressure relief before applying happiness loss', () => {
    expect(
      calculateHappiness({
        ...baseInput,
        population: 90,
        tavernLevel: 0,
        hospitalLevel: 5,
        hospitalPressureReliefPerLevel: 1,
        maxHospitalPressureRelief: 35,
      }),
    ).toBe(85);
  });

  it('applies administration penalty', () => {
    expect(
      calculateHappiness({
        ...baseInput,
        tavernLevel: 0,
        administrationPenalty: 10,
      }),
    ).toBe(90);
  });

  it('clamps happiness between 0 and 150', () => {
    expect(calculateHappiness({ ...baseInput, tavernLevel: 10 })).toBe(150);
    expect(
      calculateHappiness({
        ...baseInput,
        population: 200,
        tavernLevel: 0,
        baseHappiness: 10,
      }),
    ).toBe(0);
  });
});

describe('calculateIdleCitizens', () => {
  it('calculates idle citizens', () => {
    expect(calculateIdleCitizens({ population: 50, woodWorkers: 5, goldWorkers: 5 })).toBe(40);
  });

  it('prevents negative idle citizens', () => {
    expect(calculateIdleCitizens({ population: 10, woodWorkers: 8, goldWorkers: 4 })).toBe(0);
  });

  it('subtracts scientists from idle citizens', () => {
    expect(
      calculateIdleCitizens({ population: 50, woodWorkers: 5, goldWorkers: 5, scientists: 5 }),
    ).toBe(35);
  });

  it('subtracts luxury workers from idle citizens', () => {
    expect(
      calculateIdleCitizens({ population: 50, woodWorkers: 5, goldWorkers: 5, luxuryWorkers: 6 }),
    ).toBe(34);
  });

  it('prevents negative idle citizens when scientists are included', () => {
    expect(
      calculateIdleCitizens({ population: 10, woodWorkers: 5, goldWorkers: 4, scientists: 3 }),
    ).toBe(0);
  });
});
