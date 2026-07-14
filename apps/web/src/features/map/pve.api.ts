import type {
  ArmyMovementSummary,
  AttackPveCampRequest,
  AttackPveCampResponse,
  PveCampDetailResponse,
  PveCampListResponse,
} from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getPveCamps(): Promise<PveCampListResponse> {
  return apiGet<PveCampListResponse>('/api/pve-camps');
}

export function getPveCampDetail(
  campId: string,
  originCityId?: string,
): Promise<PveCampDetailResponse> {
  const query = originCityId ? `?originCityId=${encodeURIComponent(originCityId)}` : '';
  return apiGet<PveCampDetailResponse>(`/api/pve-camps/${campId}${query}`);
}

export function attackPveCamp(
  campId: string,
  request: AttackPveCampRequest,
): Promise<AttackPveCampResponse> {
  return apiPost<AttackPveCampResponse>(`/api/pve-camps/${campId}/attack`, request);
}

export function getArmyMovements(): Promise<ArmyMovementSummary[]> {
  return apiGet<ArmyMovementSummary[]>('/api/movements/army');
}
