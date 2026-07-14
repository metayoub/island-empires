export function calculatePopulationCapacity(input: {
  cityHallLevel: number;
  basePopulationCapacity: number;
  populationCapacityPerCityHallLevel: number;
}): number {
  const cityHallLevel = Math.max(0, Math.floor(input.cityHallLevel));

  return (
    input.basePopulationCapacity +
    cityHallLevel * input.populationCapacityPerCityHallLevel
  );
}
