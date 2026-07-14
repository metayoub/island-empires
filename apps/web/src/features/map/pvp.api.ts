import type {
  AttackPlayerCityRequest,
  AttackPlayerCityResponse,
  PvpAttackOptionsResponse,
  PvpMovementSummary,
} from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getPvpAttackOptions(
  targetCityId: string,
  originCityId?: string | null,
): Promise<PvpAttackOptionsResponse> {
  const query = originCityId ? `?originCityId=${encodeURIComponent(originCityId)}` : '';
  return apiGet<PvpAttackOptionsResponse>(`/api/pvp/cities/${targetCityId}/attack-options${query}`);
}

export function attackPlayerCity(
  targetCityId: string,
  request: AttackPlayerCityRequest,
): Promise<AttackPlayerCityResponse> {
  return apiPost<AttackPlayerCityResponse>(`/api/pvp/cities/${targetCityId}/attack`, request);
}

export function getPvpMovements(): Promise<PvpMovementSummary[]> {
  return apiGet<PvpMovementSummary[]>('/api/pvp/movements');
}
