export type PopulationConfig = {
  basePopulationCapacity: number;
  populationCapacityPerCityHallLevel: number;
  baseGrowthPerHour: number;
};

export type HappinessConfig = {
  baseHappiness: number;
  tavernHappinessPerLevel: number;
  populationPressureStartRatio: number;
  maxPopulationPressure: number;
  hospitalPressureReliefPerLevel?: number;
  maxHospitalPressureRelief?: number;
};

export { calculatePopulationCapacity } from './calculate-population-capacity.js';
export { calculatePopulationGrowth } from './calculate-population-growth.js';
export { calculateHappiness } from './calculate-happiness.js';
export { calculateIdleCitizens } from './calculate-idle-citizens.js';
