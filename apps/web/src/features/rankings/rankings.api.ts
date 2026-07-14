import type {
  AllianceRankingType,
  AllianceRankingsResponse,
  PlayerRankingType,
  PlayerRankingsResponse,
} from '@island-empires/shared-types';
import { apiGet } from '../../services/api/client';

export function getPlayerRankings(
  type: PlayerRankingType,
  page = 1,
  pageSize = 50,
): Promise<PlayerRankingsResponse> {
  return apiGet<PlayerRankingsResponse>(
    `/api/rankings/players?type=${type}&page=${page}&pageSize=${pageSize}`,
  );
}

export function getAllianceRankings(
  type: AllianceRankingType,
  page = 1,
  pageSize = 50,
): Promise<AllianceRankingsResponse> {
  return apiGet<AllianceRankingsResponse>(
    `/api/rankings/alliances?type=${type}&page=${page}&pageSize=${pageSize}`,
  );
}
