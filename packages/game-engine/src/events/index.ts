export type LiveEventTimingInput = {
  startsAt: Date;
  endsAt: Date;
  now?: Date;
};

export type LiveEventStatus = 'scheduled' | 'active' | 'ended';

export function getLiveEventStatus(input: LiveEventTimingInput): LiveEventStatus {
  const now = input.now ?? new Date();
  if (now < input.startsAt) {
    return 'scheduled';
  }
  if (now > input.endsAt) {
    return 'ended';
  }
  return 'active';
}

export function isLiveEventActive(input: LiveEventTimingInput): boolean {
  return getLiveEventStatus(input) === 'active';
}

export function calculateEventParticipationPoints(input: {
  basePoints: number;
  actionCount?: number;
  multiplier?: number;
}): number {
  const actionCount = Math.max(1, Math.floor(input.actionCount ?? 1));
  const multiplier = Math.max(0, input.multiplier ?? 1);
  return Math.max(0, Math.floor(input.basePoints * actionCount * multiplier));
}

export function applyEventBonusPercent(input: {
  amount: number;
  bonusPercent?: number | null;
}): number {
  const amount = Math.max(0, Math.floor(input.amount));
  const bonusPercent = Math.max(0, input.bonusPercent ?? 0);
  return Math.floor(amount * (1 + bonusPercent / 100));
}
