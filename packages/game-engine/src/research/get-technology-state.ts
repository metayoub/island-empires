export type TechnologyState = 'locked' | 'available' | 'researching' | 'completed';

export function getTechnologyState(input: {
  technologyId: string;
  completedTechnologyIds: string[];
  activeTechnologyId?: string | null;
  requirements: string[];
}): TechnologyState {
  if (input.completedTechnologyIds.includes(input.technologyId)) {
    return 'completed';
  }

  if (input.activeTechnologyId === input.technologyId) {
    return 'researching';
  }

  const requirementsMet = input.requirements.every((requirementId) =>
    input.completedTechnologyIds.includes(requirementId),
  );

  return requirementsMet ? 'available' : 'locked';
}
