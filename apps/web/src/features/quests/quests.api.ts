import type { ClaimQuestRewardResponse, QuestOverview } from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getQuestOverview(): Promise<QuestOverview> {
  return apiGet<QuestOverview>('/api/quests');
}

export function claimQuestReward(questId: string): Promise<ClaimQuestRewardResponse> {
  return apiPost<ClaimQuestRewardResponse>(`/api/quests/${questId}/claim`, {});
}
