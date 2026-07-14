export function calculateTradeTravelTimeSeconds(input: {
  normalTravelTimeSeconds: number;
  tradeTravelMultiplier: number;
  minTravelTimeSeconds: number;
}): number {
  return Math.max(
    input.minTravelTimeSeconds,
    Math.ceil(input.normalTravelTimeSeconds * input.tradeTravelMultiplier),
  );
}
