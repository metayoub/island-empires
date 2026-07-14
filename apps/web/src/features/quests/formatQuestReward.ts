import type { QuestReward } from '@island-empires/shared-types';

export function formatQuestReward(rewards: QuestReward): string {
  const parts: string[] = [];

  if (rewards.resources?.wood) {
    parts.push(`${rewards.resources.wood} wood`);
  }
  if (rewards.resources?.gold) {
    parts.push(`${rewards.resources.gold} gold`);
  }
  if (rewards.researchPoints) {
    parts.push(`${rewards.researchPoints} research points`);
  }

  return parts.length > 0 ? parts.join(', ') : 'No reward';
}
