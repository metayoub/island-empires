import type { QuestOverview } from '@island-empires/shared-types';
import { apiPost } from '../../services/api/client';

export function triggerCityBuildingClicked(buildingType: string): Promise<QuestOverview> {
  return apiPost<QuestOverview>('/api/quests/triggers', {
    trigger: 'city_building_clicked',
    payload: { buildingType },
  });
}
