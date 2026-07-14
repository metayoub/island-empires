export function canClaimQuestReward(input: { status: string }): {
  canClaim: boolean;
  reason?: string;
} {
  if (input.status === 'claimed') {
    return { canClaim: false, reason: 'Quest reward has already been claimed' };
  }

  if (input.status !== 'completed') {
    return { canClaim: false, reason: 'Quest is not completed yet' };
  }

  return { canClaim: true };
}
