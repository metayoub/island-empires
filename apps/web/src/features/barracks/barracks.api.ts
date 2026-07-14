import type {
  BarracksOverviewResponse,
  TrainUnitsRequest,
  TrainUnitsResponse,
} from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getBarracksOverview(cityId: string): Promise<BarracksOverviewResponse> {
  return apiGet<BarracksOverviewResponse>(`/api/cities/${cityId}/barracks`);
}

export function getShipyardOverview(cityId: string): Promise<BarracksOverviewResponse> {
  return apiGet<BarracksOverviewResponse>(`/api/cities/${cityId}/shipyard`);
}

export function trainUnits(cityId: string, request: TrainUnitsRequest): Promise<TrainUnitsResponse> {
  return apiPost<TrainUnitsResponse>(`/api/cities/${cityId}/barracks/train`, request);
}

export function trainShipyardUnits(
  cityId: string,
  request: TrainUnitsRequest,
): Promise<TrainUnitsResponse> {
  return apiPost<TrainUnitsResponse>(`/api/cities/${cityId}/shipyard/train`, request);
}
