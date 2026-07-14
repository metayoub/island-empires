import type {
  AssignWorkersRequest,
  AssignWorkersResponse,
  BootstrapResponse,
  CityOverview,
  CityProductionResponse,
  CitySummary,
  MovementSummary,
  ReportSummary,
  CancelTransportResponse,
  StartTransportRequest,
  StartTransportResponse,
  StartResourceTransportRequest,
  StartResourceTransportResponse,
  StartBuildingUpgradeResponse,
  TransportOptionsResponse,
} from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getBootstrap(): Promise<BootstrapResponse> {
  return apiGet<BootstrapResponse>('/api/bootstrap');
}

export function getCities(): Promise<CitySummary[]> {
  return apiGet<CitySummary[]>('/api/cities');
}

export function getCityOverview(cityId: string): Promise<CityOverview> {
  return apiGet<CityOverview>(`/api/cities/${cityId}/overview`);
}

export function selectCity(cityId: string): Promise<{ success: true; selectedCityId: string }> {
  return apiPost<{ success: true; selectedCityId: string }>(`/api/cities/${cityId}/select`, {});
}

export function getCityProduction(cityId: string): Promise<CityProductionResponse> {
  return apiGet<CityProductionResponse>(`/api/cities/${cityId}/production`);
}

export function assignWorkers(
  cityId: string,
  body: AssignWorkersRequest,
): Promise<AssignWorkersResponse> {
  return apiPost<AssignWorkersResponse>(`/api/cities/${cityId}/workers/assign`, body);
}

export function startBuildingUpgrade(
  cityId: string,
  buildingType: string,
): Promise<StartBuildingUpgradeResponse> {
  return apiPost<StartBuildingUpgradeResponse>(
    `/api/cities/${cityId}/buildings/${buildingType}/upgrade`,
    {},
  );
}

export function getReports(): Promise<ReportSummary[]> {
  return apiGet<ReportSummary[]>('/api/reports');
}

export function getMovements(): Promise<MovementSummary[]> {
  return apiGet<MovementSummary[]>('/api/movements');
}

export function getTransportOptions(originCityId: string): Promise<TransportOptionsResponse> {
  return apiGet<TransportOptionsResponse>(`/api/transport/options?originCityId=${encodeURIComponent(originCityId)}`);
}

export function startTransport(body: StartTransportRequest): Promise<StartTransportResponse> {
  return apiPost<StartTransportResponse>('/api/transport/start', body);
}

export function cancelTransport(movementId: string): Promise<CancelTransportResponse> {
  return apiPost<CancelTransportResponse>(`/api/transport/${movementId}/cancel`, {});
}

export function startResourceTransport(
  body: StartResourceTransportRequest,
): Promise<StartResourceTransportResponse> {
  return startTransport(body);
}
