export function calculateIdleCitizens(input: {
  population: number;
  woodWorkers: number;
  goldWorkers: number;
  luxuryWorkers?: number;
  scientists?: number;
}): number {
  return Math.max(
    0,
    input.population -
      input.woodWorkers -
      input.goldWorkers -
      (input.luxuryWorkers ?? 0) -
      (input.scientists ?? 0),
  );
}
