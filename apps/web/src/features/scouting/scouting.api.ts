import type {
  SpyMissionListResponse,
  SpyMissionOptionsResponse,
  SpyMissionType,
  SpyOverviewResponse,
  StartSpyMissionRequest,
  StartSpyMissionResponse,
  TrainSpiesRequest,
  TrainSpiesResponse,
} from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getSpyOverview(cityId: string): Promise<SpyOverviewResponse> {
  return apiGet<SpyOverviewResponse>(`/api/cities/${cityId}/spies`);
}

export function trainSpies(cityId: string, body: TrainSpiesRequest): Promise<TrainSpiesResponse> {
  return apiPost<TrainSpiesResponse>(`/api/cities/${cityId}/spies/train`, body);
}

export function getSpyMissionOptions(input: {
  originCityId: string;
  targetCityId: string;
}): Promise<SpyMissionOptionsResponse> {
  const params = new URLSearchParams({
    originCityId: input.originCityId,
    targetCityId: input.targetCityId,
  });

  return apiGet<SpyMissionOptionsResponse>(`/api/scouting/options?${params.toString()}`);
}

export function startSpyMission(
  body: StartSpyMissionRequest,
): Promise<StartSpyMissionResponse> {
  return apiPost<StartSpyMissionResponse>('/api/scouting/missions', body);
}

export function getSpyMissions(): Promise<SpyMissionListResponse> {
  return apiGet<SpyMissionListResponse>('/api/scouting/missions');
}

export function shareSpyReportWithAlliance(reportId: string): Promise<{ success: true }> {
  return apiPost<{ success: true }>(`/api/scouting/reports/${reportId}/share-alliance`, {});
}

export const SPY_MISSION_LABELS: Record<SpyMissionType, string> = {
  resource_report: 'Resources',
  army_report: 'Army',
  building_report: 'Buildings',
};
