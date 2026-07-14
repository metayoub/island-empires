import {
  applyStorageCap,
  calculateProductionBoostPercent,
  calculateProducedAmount,
  calculateResourceProduction,
  calculateStorageCapacity,
} from './index';

describe('calculateResourceProduction', () => {
  it('adds base production and per-worker production for wood and gold', () => {
    const result = calculateResourceProduction({
      baseWoodPerHour: 30,
      baseGoldPerHour: 20,
      woodWorkers: 5,
      goldWorkers: 5,
      luxuryWorkers: 0,
      woodPerWorkerPerHour: 5,
      goldPerWorkerPerHour: 3,
      luxuryPerWorkerPerHour: 4,
      luxuryExtractorLevel: 0,
      islandLuxuryResource: 'marble',
    });

    expect(result.woodPerHour).toBe(55);
    expect(result.goldPerHour).toBe(35);
  });

  it('produces no luxury resources without an extractor', () => {
    const result = calculateResourceProduction({
      baseWoodPerHour: 30,
      baseGoldPerHour: 20,
      woodWorkers: 10,
      goldWorkers: 10,
      luxuryWorkers: 10,
      woodPerWorkerPerHour: 5,
      goldPerWorkerPerHour: 3,
      luxuryPerWorkerPerHour: 4,
      luxuryExtractorLevel: 0,
      islandLuxuryResource: 'marble',
    });

    expect(result.marblePerHour).toBe(0);
    expect(result.winePerHour).toBe(0);
    expect(result.crystalPerHour).toBe(0);
    expect(result.sulfurPerHour).toBe(0);
  });

  it('produces only the island luxury resource when the extractor is built', () => {
    const result = calculateResourceProduction({
      baseWoodPerHour: 30,
      baseGoldPerHour: 20,
      woodWorkers: 0,
      goldWorkers: 0,
      luxuryWorkers: 10,
      woodPerWorkerPerHour: 5,
      goldPerWorkerPerHour: 3,
      luxuryPerWorkerPerHour: 4,
      luxuryExtractorLevel: 2,
      islandLuxuryResource: 'wine',
    });

    expect(result.winePerHour).toBe(44);
    expect(result.marblePerHour).toBe(0);
    expect(result.crystalPerHour).toBe(0);
    expect(result.sulfurPerHour).toBe(0);
  });

  it('applies local production boosts to wood and luxury resources', () => {
    const result = calculateResourceProduction({
      baseWoodPerHour: 30,
      baseGoldPerHour: 20,
      woodWorkers: 10,
      goldWorkers: 0,
      luxuryWorkers: 10,
      woodPerWorkerPerHour: 5,
      goldPerWorkerPerHour: 3,
      luxuryPerWorkerPerHour: 4,
      luxuryExtractorLevel: 1,
      islandLuxuryResource: 'sulfur',
      woodProductionBoostPercent: 20,
      luxuryProductionBoostPercent: 40,
    });

    expect(result.woodPerHour).toBe(96);
    expect(result.sulfurPerHour).toBe(56);
  });
});

describe('calculateProductionBoostPercent', () => {
  it('calculates a capped percent from level and per-level value', () => {
    expect(
      calculateProductionBoostPercent({ level: 60, percentPerLevel: 2, maxPercent: 100 }),
    ).toBe(100);
  });

  it('normalizes invalid or negative values', () => {
    expect(
      calculateProductionBoostPercent({ level: -3, percentPerLevel: 2, maxPercent: 100 }),
    ).toBe(0);
  });
});

describe('calculateProducedAmount', () => {
  it('calculates the produced amount after exactly 1 hour', () => {
    const lastCalculatedAt = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-01T01:00:00.000Z');

    expect(calculateProducedAmount(55, lastCalculatedAt, now)).toBe(55);
  });

  it('calculates the produced amount after 30 minutes, floored', () => {
    const lastCalculatedAt = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-01-01T00:30:00.000Z');

    expect(calculateProducedAmount(55, lastCalculatedAt, now)).toBe(27);
  });

  it('returns 0 when no time has elapsed', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');

    expect(calculateProducedAmount(55, now, now)).toBe(0);
  });
});

describe('calculateStorageCapacity', () => {
  it('adds base storage and warehouse-level bonus', () => {
    expect(
      calculateStorageCapacity({
        baseStorage: 1000,
        warehouseLevel: 1,
        storagePerWarehouseLevel: 2000,
      }),
    ).toBe(3000);
  });

  it('scales with warehouse level', () => {
    expect(
      calculateStorageCapacity({
        baseStorage: 1000,
        warehouseLevel: 3,
        storagePerWarehouseLevel: 2000,
      }),
    ).toBe(7000);
  });
});

describe('applyStorageCap', () => {
  it('applies full production when under capacity', () => {
    const result = applyStorageCap({ currentAmount: 500, producedAmount: 55, capacity: 3000 });

    expect(result).toEqual({ newAmount: 555, actualProducedAmount: 55, isFull: false });
  });

  it('caps production at capacity and reports the actual amount produced', () => {
    const result = applyStorageCap({ currentAmount: 2980, producedAmount: 55, capacity: 3000 });

    expect(result).toEqual({ newAmount: 3000, actualProducedAmount: 20, isFull: true });
  });

  it('detects storage that is already full', () => {
    const result = applyStorageCap({ currentAmount: 3000, producedAmount: 55, capacity: 3000 });

    expect(result).toEqual({ newAmount: 3000, actualProducedAmount: 0, isFull: true });
  });

  it('does not let negative production drain below zero', () => {
    const result = applyStorageCap({ currentAmount: 10, producedAmount: -55, capacity: 3000 });

    expect(result).toEqual({ newAmount: 0, actualProducedAmount: -10, isFull: false });
  });
});
