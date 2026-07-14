export type ResearchProductionInput = {
  scientists: number;
  researchPerScientistPerHour: number;
  academyLevel: number;
  academyBonusPerLevelAboveOne: number;
};

export type ResearchProductionOutput = {
  researchPointsPerHour: number;
  academyBonusMultiplier: number;
};

export function calculateResearchProduction(
  input: ResearchProductionInput,
): ResearchProductionOutput {
  const academyLevel = Math.max(0, Math.floor(input.academyLevel));

  if (academyLevel < 1) {
    return { researchPointsPerHour: 0, academyBonusMultiplier: 1 };
  }

  const scientists = Math.max(0, input.scientists);
  const bonusLevels = academyLevel - 1;
  const academyBonusMultiplier = 1 + bonusLevels * input.academyBonusPerLevelAboveOne;
  const researchPointsPerHour = Math.floor(
    scientists * input.researchPerScientistPerHour * academyBonusMultiplier,
  );

  return { researchPointsPerHour, academyBonusMultiplier };
}
