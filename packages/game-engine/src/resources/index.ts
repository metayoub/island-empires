export type ResourceProductionInput = {
  baseWoodPerHour: number;
  baseGoldPerHour: number;
  woodWorkers: number;
  goldWorkers: number;
  luxuryWorkers?: number;
  woodPerWorkerPerHour: number;
  goldPerWorkerPerHour: number;
  luxuryPerWorkerPerHour?: number;
  luxuryExtractorLevel?: number;
  islandLuxuryResource?: 'marble' | 'wine' | 'crystal' | 'sulfur' | string | null;
  woodProductionBoostPercent?: number;
  luxuryProductionBoostPercent?: number;
};

export type ResourceProductionOutput = {
  woodPerHour: number;
  goldPerHour: number;
  marblePerHour: number;
  winePerHour: number;
  crystalPerHour: number;
  sulfurPerHour: number;
};

const LUXURY_PRODUCTION_KEYS = {
  marble: 'marblePerHour',
  wine: 'winePerHour',
  crystal: 'crystalPerHour',
  sulfur: 'sulfurPerHour',
} as const;

export function calculateResourceProduction(
  input: ResourceProductionInput,
): ResourceProductionOutput {
  const woodBoostMultiplier = calculateProductionBoostMultiplier(
    input.woodProductionBoostPercent ?? 0,
  );
  const output = {
    woodPerHour: Math.floor(
      (input.baseWoodPerHour + input.woodWorkers * input.woodPerWorkerPerHour) *
        woodBoostMultiplier,
    ),
    goldPerHour: input.baseGoldPerHour + input.goldWorkers * input.goldPerWorkerPerHour,
    marblePerHour: 0,
    winePerHour: 0,
    crystalPerHour: 0,
    sulfurPerHour: 0,
  };
  const luxuryResource = input.islandLuxuryResource;
  const luxuryWorkers = Math.max(0, input.luxuryWorkers ?? 0);
  const luxuryExtractorLevel = Math.max(0, input.luxuryExtractorLevel ?? 0);
  const luxuryBoostMultiplier = calculateProductionBoostMultiplier(
    input.luxuryProductionBoostPercent ?? 0,
  );

  if (
    luxuryWorkers > 0 &&
    luxuryExtractorLevel > 0 &&
    (luxuryResource === 'marble' ||
      luxuryResource === 'wine' ||
      luxuryResource === 'crystal' ||
      luxuryResource === 'sulfur')
  ) {
    const bonusMultiplier = 1 + (luxuryExtractorLevel - 1) * 0.1;
    output[LUXURY_PRODUCTION_KEYS[luxuryResource]] = Math.floor(
      luxuryWorkers * (input.luxuryPerWorkerPerHour ?? 0) * bonusMultiplier * luxuryBoostMultiplier,
    );
  }

  return output;
}

function calculateProductionBoostMultiplier(boostPercent: number): number {
  const percent = Number.isFinite(boostPercent) ? boostPercent : 0;

  return 1 + Math.min(100, Math.max(0, percent)) / 100;
}

export function calculateProductionBoostPercent(input: {
  level: number;
  percentPerLevel: number;
  maxPercent: number;
}): number {
  const level = Math.max(0, Math.floor(input.level));
  const percentPerLevel = Number.isFinite(input.percentPerLevel) ? input.percentPerLevel : 0;
  const maxPercent = Math.max(0, Number.isFinite(input.maxPercent) ? input.maxPercent : 0);

  return Math.min(maxPercent, Math.max(0, level * percentPerLevel));
}

export function calculateProducedAmount(
  productionPerHour: number,
  lastCalculatedAt: Date,
  now: Date,
): number {
  const elapsedMs = now.getTime() - lastCalculatedAt.getTime();
  const elapsedHours = elapsedMs / 1000 / 60 / 60;

  return Math.floor(productionPerHour * elapsedHours);
}

export function calculateStorageCapacity(input: {
  baseStorage: number;
  warehouseLevel: number;
  storagePerWarehouseLevel: number;
}): number {
  return input.baseStorage + input.warehouseLevel * input.storagePerWarehouseLevel;
}

export function applyStorageCap(input: {
  currentAmount: number;
  producedAmount: number;
  capacity: number;
}): {
  newAmount: number;
  actualProducedAmount: number;
  isFull: boolean;
} {
  const newAmount = Math.min(
    Math.max(0, input.currentAmount + input.producedAmount),
    input.capacity,
  );
  const actualProducedAmount = newAmount - input.currentAmount;

  return {
    newAmount,
    actualProducedAmount,
    isFull: newAmount >= input.capacity,
  };
}
