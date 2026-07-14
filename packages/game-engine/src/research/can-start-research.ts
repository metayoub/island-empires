export function canStartResearch(input: {
  technologyId: string;
  technologyCost: number;
  currentResearchPoints: number;
  isAlreadyCompleted: boolean;
  isAlreadyResearching: boolean;
  requirementsCompleted: boolean;
}): {
  canStart: boolean;
  reason?: string;
} {
  if (input.isAlreadyCompleted) {
    return { canStart: false, reason: 'Technology already completed' };
  }

  if (!input.requirementsCompleted) {
    return { canStart: false, reason: 'Technology requirements are not completed' };
  }

  if (input.isAlreadyResearching) {
    return { canStart: false, reason: 'Another technology is already being researched' };
  }

  if (input.currentResearchPoints < input.technologyCost) {
    return { canStart: false, reason: 'Not enough research points' };
  }

  return { canStart: true };
}
