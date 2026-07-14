export function calculateHappiness(input: {
  population: number;
  populationCapacity: number;
  tavernLevel: number;
  hospitalLevel?: number;
  baseHappiness: number;
  tavernHappinessPerLevel: number;
  populationPressureStartRatio: number;
  maxPopulationPressure: number;
  hospitalPressureReliefPerLevel?: number;
  maxHospitalPressureRelief?: number;
  administrationPenalty?: number;
}): number {
  const capacity = Math.max(1, input.populationCapacity);
  const populationRatio = Math.max(0, input.population) / capacity;
  const tavernBonus = Math.max(0, input.tavernLevel) * input.tavernHappinessPerLevel;
  const rawPopulationPressure =
    populationRatio <= input.populationPressureStartRatio
      ? 0
      : Math.min(
          (populationRatio - input.populationPressureStartRatio) * 100,
          input.maxPopulationPressure,
        );
  const healthPressureRelief = Math.min(
    Math.max(0, input.maxHospitalPressureRelief ?? 0),
    Math.max(0, input.hospitalLevel ?? 0) * Math.max(0, input.hospitalPressureReliefPerLevel ?? 0),
  );
  const populationPressure = Math.max(0, rawPopulationPressure - healthPressureRelief);
  const happiness =
    input.baseHappiness +
    tavernBonus -
    populationPressure -
    Math.max(0, input.administrationPenalty ?? 0);

  return Math.max(0, Math.min(150, Math.round(happiness)));
}
