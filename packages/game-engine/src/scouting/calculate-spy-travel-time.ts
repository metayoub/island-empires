export function calculateSpyTravelTimeSeconds(input: {
  normalTravelTimeSeconds: number;
  spyTravelMultiplier: number;
  minSpyTravelTimeSeconds: number;
}): number {
  const scaled = Math.ceil(
    Math.max(0, input.normalTravelTimeSeconds) * Math.max(0, input.spyTravelMultiplier),
  );

  return Math.max(Math.ceil(input.minSpyTravelTimeSeconds), scaled);
}
