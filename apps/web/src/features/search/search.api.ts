import type {
  AdvancedAllianceSearchResult,
  AdvancedCitySearchResult,
  AdvancedMarketplaceSearchResult,
  AdvancedPlayerSearchResult,
  AdvancedSearchResponse,
} from '@island-empires/shared-types';
import { apiGet } from '../../services/api/client';

function query(path: string, params: URLSearchParams) {
  const value = params.toString();
  return `${path}${value ? `?${value}` : ''}`;
}

export function searchPlayers(params: URLSearchParams) {
  return apiGet<AdvancedSearchResponse<AdvancedPlayerSearchResult>>(
    query('/api/search/players/advanced', params),
  );
}

export function searchCities(params: URLSearchParams) {
  return apiGet<AdvancedSearchResponse<AdvancedCitySearchResult>>(
    query('/api/search/cities/advanced', params),
  );
}

export function searchAlliances(params: URLSearchParams) {
  return apiGet<AdvancedSearchResponse<AdvancedAllianceSearchResult>>(
    query('/api/search/alliances/advanced', params),
  );
}

export function searchMarketplace(params: URLSearchParams) {
  return apiGet<AdvancedSearchResponse<AdvancedMarketplaceSearchResult>>(
    query('/api/search/marketplace/advanced', params),
  );
}
