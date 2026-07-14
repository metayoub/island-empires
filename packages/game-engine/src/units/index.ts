export type UnitTrainingCost = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export type TrainUnitsValidationResult = {
  canTrain: boolean;
  reason?: string;
};

export function calculateUnitTrainingCost(input: {
  unitCost: Partial<UnitTrainingCost>;
  quantity: number;
  costReductionPercent?: number;
}): UnitTrainingCost {
  const quantity = Math.max(0, Math.floor(input.quantity));
  const multiplier = getTrainingReductionMultiplier(input.costReductionPercent ?? 0);

  return {
    wood: calculateDiscountedResource(input.unitCost.wood, quantity, multiplier),
    gold: calculateDiscountedResource(input.unitCost.gold, quantity, multiplier),
    marble: calculateDiscountedResource(input.unitCost.marble, quantity, multiplier),
    wine: calculateDiscountedResource(input.unitCost.wine, quantity, multiplier),
    crystal: calculateDiscountedResource(input.unitCost.crystal, quantity, multiplier),
    sulfur: calculateDiscountedResource(input.unitCost.sulfur, quantity, multiplier),
  };
}

export function calculateUnitTrainingDurationSeconds(input: {
  trainingSecondsPerUnit: number;
  quantity: number;
  worldSpeed: number;
  timeReductionPercent?: number;
}): number {
  const quantity = Math.max(0, Math.floor(input.quantity));
  if (quantity === 0) {
    return 0;
  }

  const worldSpeed = input.worldSpeed > 0 ? input.worldSpeed : 1;
  const multiplier = getTrainingReductionMultiplier(input.timeReductionPercent ?? 0);
  const duration = Math.ceil(
    ((Math.max(0, input.trainingSecondsPerUnit) * quantity) / worldSpeed) * multiplier,
  );

  return Math.max(1, duration);
}

export function calculateWorkshopTrainingBonus(input: { workshopLevel: number }): {
  costReductionPercent: number;
  timeReductionPercent: number;
} {
  const level = Math.max(0, Math.floor(input.workshopLevel));
  const percent = Math.min(30, level);

  return {
    costReductionPercent: percent,
    timeReductionPercent: percent,
  };
}

export function calculateTrainingOrderCapacity(input: {
  buildingLevel: number;
  baseQuantityPerOrder: number;
  quantityPerBuildingLevel: number;
}): number {
  const buildingLevel = Math.max(0, Math.floor(input.buildingLevel));
  if (buildingLevel < 1) {
    return 0;
  }

  const baseQuantity = Math.max(1, Math.floor(input.baseQuantityPerOrder));
  const perLevelQuantity = Math.max(0, Math.floor(input.quantityPerBuildingLevel));

  return baseQuantity + (buildingLevel - 1) * perLevelQuantity;
}

function getTrainingReductionMultiplier(percent: number): number {
  const clampedPercent = Math.min(30, Math.max(0, Number.isFinite(percent) ? percent : 0));

  return 1 - clampedPercent / 100;
}

function calculateDiscountedResource(
  baseValue: number | undefined,
  quantity: number,
  multiplier: number,
): number {
  const total = Math.max(0, Math.floor(baseValue ?? 0)) * quantity;

  return total > 0 ? Math.max(1, Math.ceil(total * multiplier)) : 0;
}

export function canTrainUnits(input: {
  buildingLevel: number;
  requiredBuildingLevel: number;
  quantity: number;
  maxQuantityPerOrder: number;
  trainingBusy: boolean;
  hasEnoughResources: boolean;
  hasRequiredBuildings: boolean;
}): TrainUnitsValidationResult {
  if (input.buildingLevel < 1) {
    return { canTrain: false, reason: 'BUILDING_REQUIRED' };
  }
  if (input.buildingLevel < input.requiredBuildingLevel) {
    return { canTrain: false, reason: 'BUILDING_LEVEL_REQUIRED' };
  }
  if (!input.hasRequiredBuildings) {
    return { canTrain: false, reason: 'REQUIREMENT_MISSING' };
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { canTrain: false, reason: 'INVALID_QUANTITY' };
  }
  if (input.quantity > input.maxQuantityPerOrder) {
    return { canTrain: false, reason: 'MAX_QUANTITY_EXCEEDED' };
  }
  if (input.trainingBusy) {
    return { canTrain: false, reason: 'TRAINING_BUSY' };
  }
  if (!input.hasEnoughResources) {
    return { canTrain: false, reason: 'NOT_ENOUGH_RESOURCES' };
  }

  return { canTrain: true };
}
