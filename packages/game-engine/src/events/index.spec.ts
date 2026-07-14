import {
  applyEventBonusPercent,
  calculateEventParticipationPoints,
  getLiveEventStatus,
} from './index';

describe('live events', () => {
  const startsAt = new Date('2026-07-11T10:00:00.000Z');
  const endsAt = new Date('2026-07-12T10:00:00.000Z');

  it('derives schedule state from event time windows', () => {
    expect(getLiveEventStatus({ startsAt, endsAt, now: new Date('2026-07-11T09:59:00.000Z') })).toBe(
      'scheduled',
    );
    expect(getLiveEventStatus({ startsAt, endsAt, now: new Date('2026-07-11T12:00:00.000Z') })).toBe(
      'active',
    );
    expect(getLiveEventStatus({ startsAt, endsAt, now: new Date('2026-07-12T10:01:00.000Z') })).toBe(
      'ended',
    );
  });

  it('calculates participation without streak penalties', () => {
    expect(calculateEventParticipationPoints({ basePoints: 10 })).toBe(10);
    expect(calculateEventParticipationPoints({ basePoints: 10, actionCount: 3 })).toBe(30);
  });

  it('applies bounded event bonus percentages', () => {
    expect(applyEventBonusPercent({ amount: 100, bonusPercent: 20 })).toBe(120);
    expect(applyEventBonusPercent({ amount: 100, bonusPercent: -20 })).toBe(100);
  });
});
