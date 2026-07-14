export type CalculateTravelTimeSecondsInput = {
  distance: number;
  baseSecondsPerDistance: number;
  worldSpeed: number;
};

export function calculateTravelTimeSeconds(input: CalculateTravelTimeSecondsInput): number {
  if (input.distance === 0) {
    return 0;
  }

  const worldSpeed = Number.isFinite(input.worldSpeed) && input.worldSpeed > 0 ? input.worldSpeed : 1;
  const rawTravelTime = (input.distance * input.baseSecondsPerDistance) / worldSpeed;

  return Math.max(10, Math.floor(rawTravelTime));
}
