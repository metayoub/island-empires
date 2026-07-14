export function calculatePopulationGrowth(input: {
  currentPopulation: number;
  populationCapacity: number;
  happiness: number;
  baseGrowthPerHour: number;
  lastCalculatedAt: Date;
  now: Date;
}): {
  newPopulation: number;
  gainedPopulation: number;
  isAtCapacity: boolean;
} {
  const currentPopulation = Math.max(0, input.currentPopulation);
  const populationCapacity = Math.max(0, input.populationCapacity);

  if (currentPopulation >= populationCapacity || input.happiness <= 0) {
    const newPopulation = Math.min(currentPopulation, populationCapacity);

    return {
      newPopulation,
      gainedPopulation: 0,
      isAtCapacity: newPopulation >= populationCapacity,
    };
  }

  const elapsedMs = Math.max(0, input.now.getTime() - input.lastCalculatedAt.getTime());
  const elapsedHours = elapsedMs / 1000 / 60 / 60;
  const happinessMultiplier = Math.max(0, input.happiness) / 100;
  const gainedPopulation = Math.floor(
    input.baseGrowthPerHour * happinessMultiplier * elapsedHours,
  );
  const newPopulation = Math.min(currentPopulation + gainedPopulation, populationCapacity);

  return {
    newPopulation,
    gainedPopulation: newPopulation - currentPopulation,
    isAtCapacity: newPopulation >= populationCapacity,
  };
}
