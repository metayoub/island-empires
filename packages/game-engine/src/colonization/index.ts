export type ColonizationResourceCost = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export type ColonizationRequirementResult = {
  canColonize: boolean;
  reason?: string;
};

export function calculateCityLimit(input: { palaceLevel: number }): number {
  return 1 + Math.max(0, Math.floor(input.palaceLevel));
}

export function calculateColonizationCost(input: {
  currentCityCount: number;
  baseCost: ColonizationResourceCost;
}): ColonizationResourceCost {
  void input.currentCityCount;
  return { ...input.baseCost };
}

export function calculateColonyShipCount(input: {
  baseColonyShips: number;
  colonyShipsPerPalaceLevel: number;
  palaceLevel: number;
}): number {
  return Math.max(
    0,
    Math.floor(input.baseColonyShips) +
      Math.max(0, Math.floor(input.palaceLevel)) * input.colonyShipsPerPalaceLevel,
  );
}

export function canColonize(input: {
  hasRequiredResearch: boolean;
  hasColonyShip: boolean;
  palaceLevel: number;
  cityCount: number;
  cityLimit: number;
  targetSlotIsEmpty: boolean;
  hasEnoughResources: boolean;
}): ColonizationRequirementResult {
  if (!input.hasRequiredResearch) {
    return { canColonize: false, reason: 'Research Basic Navigation before founding another city.' };
  }
  if (input.palaceLevel < 1) {
    return { canColonize: false, reason: 'Build the Palace to level 1 before founding another city.' };
  }
  if (!input.hasColonyShip) {
    return { canColonize: false, reason: 'A colony ship is required to found another city.' };
  }
  if (input.cityCount >= input.cityLimit) {
    return { canColonize: false, reason: 'Upgrade the Palace to increase your city limit.' };
  }
  if (!input.targetSlotIsEmpty) {
    return { canColonize: false, reason: 'This city slot is already occupied.' };
  }
  if (!input.hasEnoughResources) {
    return { canColonize: false, reason: 'Not enough resources in the selected city.' };
  }

  return { canColonize: true };
}
