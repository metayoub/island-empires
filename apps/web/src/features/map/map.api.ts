import type {
  IslandDetailResponse,
  QuestOverview,
  SettleCityResponse,
  WorldMapResponse,
} from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getWorldMap(worldId: string): Promise<WorldMapResponse> {
  return apiGet<WorldMapResponse>(`/api/worlds/${worldId}/map`);
}

export function getIslandDetail(islandId: string): Promise<IslandDetailResponse> {
  return apiGet<IslandDetailResponse>(`/api/islands/${islandId}`);
}

export function triggerWorldMapOpened(): Promise<QuestOverview> {
  return apiPost<QuestOverview>('/api/quests/triggers', {
    trigger: 'world_map_opened',
    payload: {},
  });
}

export function settleCity(islandId: string, slotIndex: number): Promise<SettleCityResponse> {
  return apiPost<SettleCityResponse>(`/api/islands/${islandId}/slots/${slotIndex}/settle`, {});
}
