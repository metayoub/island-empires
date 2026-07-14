export type SpyMissionValidationResult = {
  canStart: boolean;
  reason?: string;
};

export function canStartSpyMission(input: {
  originHasSpyAgency: boolean;
  originSpyCount: number;
  targetIsOwnedByAnotherPlayer: boolean;
  targetHasBeginnerProtection: boolean;
  cooldownActive: boolean;
}): SpyMissionValidationResult {
  if (!input.originHasSpyAgency) {
    return {
      canStart: false,
      reason: 'Build the Spy Agency to level 1 before sending spies.',
    };
  }

  if (input.originSpyCount < 1) {
    return { canStart: false, reason: 'No spies are available in this city.' };
  }

  if (!input.targetIsOwnedByAnotherPlayer) {
    return { canStart: false, reason: 'You cannot spy on your own city.' };
  }

  if (input.targetHasBeginnerProtection) {
    return { canStart: false, reason: 'This city is under beginner protection.' };
  }

  if (input.cooldownActive) {
    return { canStart: false, reason: 'You must wait before spying on this city again.' };
  }

  return { canStart: true };
}
