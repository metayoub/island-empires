export function calculateGeneratedResearchPoints(input: {
  researchPointsPerHour: number;
  lastCalculatedAt: Date;
  now: Date;
}): number {
  const elapsedMs = Math.max(0, input.now.getTime() - input.lastCalculatedAt.getTime());
  const elapsedHours = elapsedMs / 1000 / 60 / 60;

  return Math.floor(input.researchPointsPerHour * elapsedHours);
}
