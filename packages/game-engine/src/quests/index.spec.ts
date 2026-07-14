import { evaluateQuestTrigger } from './evaluate-quest-trigger';
import { canClaimQuestReward } from './can-claim-quest-reward';

describe('evaluateQuestTrigger', () => {
  const baseInput = {
    currentStatus: 'active',
    currentProgress: 0,
    target: 1,
    questTrigger: 'city_dashboard_opened',
    firedTrigger: 'city_dashboard_opened',
  };

  it('ignores a trigger that does not match the quest', () => {
    const result = evaluateQuestTrigger({ ...baseInput, firedTrigger: 'resources_viewed' });

    expect(result.matched).toBe(false);
    expect(result.isNewlyCompleted).toBe(false);
  });

  it('ignores a matching trigger when the quest is not active', () => {
    const result = evaluateQuestTrigger({ ...baseInput, currentStatus: 'locked' });

    expect(result.matched).toBe(false);
  });

  it('ignores a matching trigger when payloadMatch does not match the payload', () => {
    const result = evaluateQuestTrigger({
      ...baseInput,
      questTrigger: 'building_upgrade_started',
      firedTrigger: 'building_upgrade_started',
      payloadMatch: { buildingType: 'warehouse' },
      payload: { buildingType: 'academy' },
    });

    expect(result.matched).toBe(false);
  });

  it('completes the quest when progress reaches target', () => {
    const result = evaluateQuestTrigger(baseInput);

    expect(result.matched).toBe(true);
    expect(result.newProgress).toBe(1);
    expect(result.isNewlyCompleted).toBe(true);
  });

  it('matches payloadMatch when payload satisfies it', () => {
    const result = evaluateQuestTrigger({
      ...baseInput,
      questTrigger: 'building_upgrade_started',
      firedTrigger: 'building_upgrade_started',
      payloadMatch: { buildingType: 'warehouse' },
      payload: { buildingType: 'warehouse' },
    });

    expect(result.matched).toBe(true);
    expect(result.isNewlyCompleted).toBe(true);
  });
});

describe('canClaimQuestReward', () => {
  it('rejects claiming before the quest is completed', () => {
    expect(canClaimQuestReward({ status: 'active' }).canClaim).toBe(false);
  });

  it('rejects claiming an already claimed quest', () => {
    expect(canClaimQuestReward({ status: 'claimed' }).canClaim).toBe(false);
  });

  it('allows claiming a completed quest', () => {
    expect(canClaimQuestReward({ status: 'completed' }).canClaim).toBe(true);
  });
});
