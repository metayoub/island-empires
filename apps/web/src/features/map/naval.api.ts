import type {
  CityBlockadeSummary,
  NavalAttackOptionsResponse,
  NavalAttackRequest,
  NavalAttackResponse,
  NavalMovementSummary,
} from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getNavalAttackOptions(
  targetCityId: string,
  originCityId?: string | null,
): Promise<NavalAttackOptionsResponse> {
  const query = originCityId ? `?originCityId=${encodeURIComponent(originCityId)}` : '';
  return apiGet<NavalAttackOptionsResponse>(`/api/naval/cities/${targetCityId}/attack-options${query}`);
}

export function attackCityBySea(
  targetCityId: string,
  request: NavalAttackRequest,
): Promise<NavalAttackResponse> {
  return apiPost<NavalAttackResponse>(`/api/naval/cities/${targetCityId}/attack`, request);
}

export function getNavalMovements(): Promise<NavalMovementSummary[]> {
  return apiGet<NavalMovementSummary[]>('/api/naval/movements');
}

export function getActiveBlockades(): Promise<CityBlockadeSummary[]> {
  return apiGet<CityBlockadeSummary[]>('/api/naval/blockades');
}
