import {
  calculateTrainingOrderCapacity,
  calculateWorkshopTrainingBonus,
  calculateUnitTrainingCost,
  calculateUnitTrainingDurationSeconds,
  canTrainUnits,
} from './index';

describe('unit training calculations', () => {
  it('multiplies unit cost by quantity', () => {
    expect(calculateUnitTrainingCost({ unitCost: { wood: 40, gold: 20 }, quantity: 5 })).toEqual({
      wood: 200,
      gold: 100,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    });
    expect(calculateUnitTrainingCost({ unitCost: { wood: 40, gold: 20 }, quantity: 0 })).toEqual({
      wood: 0,
      gold: 0,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    });
  });

  it('applies workshop cost reduction and rounds discounted costs up', () => {
    expect(
      calculateUnitTrainingCost({
        unitCost: { wood: 40, gold: 21 },
        quantity: 5,
        costReductionPercent: 10,
      }),
    ).toEqual({
      wood: 180,
      gold: 95,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    });
  });

  it('calculates training duration scaled by world speed', () => {
    expect(
      calculateUnitTrainingDurationSeconds({ trainingSecondsPerUnit: 30, quantity: 5, worldSpeed: 1 }),
    ).toBe(150);
    expect(
      calculateUnitTrainingDurationSeconds({ trainingSecondsPerUnit: 30, quantity: 5, worldSpeed: 2 }),
    ).toBe(75);
    expect(
      calculateUnitTrainingDurationSeconds({ trainingSecondsPerUnit: 30, quantity: 0, worldSpeed: 1 }),
    ).toBe(0);
  });

  it('applies workshop time reduction', () => {
    expect(
      calculateUnitTrainingDurationSeconds({
        trainingSecondsPerUnit: 30,
        quantity: 5,
        worldSpeed: 1,
        timeReductionPercent: 20,
      }),
    ).toBe(120);
  });

  it('calculates capped workshop bonuses', () => {
    expect(calculateWorkshopTrainingBonus({ workshopLevel: 0 })).toEqual({
      costReductionPercent: 0,
      timeReductionPercent: 0,
    });
    expect(calculateWorkshopTrainingBonus({ workshopLevel: 12 })).toEqual({
      costReductionPercent: 12,
      timeReductionPercent: 12,
    });
    expect(calculateWorkshopTrainingBonus({ workshopLevel: 80 })).toEqual({
      costReductionPercent: 30,
      timeReductionPercent: 30,
    });
  });

  it('increases training order capacity with the building level', () => {
    const base = {
      baseQuantityPerOrder: 25,
      quantityPerBuildingLevel: 5,
    };

    expect(calculateTrainingOrderCapacity({ ...base, buildingLevel: 0 })).toBe(0);
    expect(calculateTrainingOrderCapacity({ ...base, buildingLevel: 1 })).toBe(25);
    expect(calculateTrainingOrderCapacity({ ...base, buildingLevel: 2 })).toBe(30);
    expect(calculateTrainingOrderCapacity({ ...base, buildingLevel: 5 })).toBe(45);
  });

  it('validates training requirements in order', () => {
    const base = {
      buildingLevel: 1,
      requiredBuildingLevel: 1,
      quantity: 5,
      maxQuantityPerOrder: 25,
      trainingBusy: false,
      hasEnoughResources: true,
      hasRequiredBuildings: true,
    };

    expect(canTrainUnits({ ...base, buildingLevel: 0 })).toEqual({
      canTrain: false,
      reason: 'BUILDING_REQUIRED',
    });
    expect(canTrainUnits({ ...base, requiredBuildingLevel: 2 })).toEqual({
      canTrain: false,
      reason: 'BUILDING_LEVEL_REQUIRED',
    });
    expect(canTrainUnits({ ...base, hasRequiredBuildings: false })).toEqual({
      canTrain: false,
      reason: 'REQUIREMENT_MISSING',
    });
    expect(canTrainUnits({ ...base, quantity: 0 })).toEqual({
      canTrain: false,
      reason: 'INVALID_QUANTITY',
    });
    expect(canTrainUnits({ ...base, quantity: 26 })).toEqual({
      canTrain: false,
      reason: 'MAX_QUANTITY_EXCEEDED',
    });
    expect(canTrainUnits({ ...base, trainingBusy: true })).toEqual({
      canTrain: false,
      reason: 'TRAINING_BUSY',
    });
    expect(canTrainUnits({ ...base, hasEnoughResources: false })).toEqual({
      canTrain: false,
      reason: 'NOT_ENOUGH_RESOURCES',
    });
    expect(canTrainUnits(base)).toEqual({ canTrain: true });
  });
});
