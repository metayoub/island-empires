import type {
  AcceptMarketplaceOfferRequest,
  AcceptMarketplaceOfferResponse,
  CancelMarketplaceOfferResponse,
  CreateMarketplaceOfferRequest,
  CreateMarketplaceOfferResponse,
  MarketplaceOfferListResponse,
  MarketplaceTradeHistoryResponse,
} from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getMarketplaceOffers(params: URLSearchParams): Promise<MarketplaceOfferListResponse> {
  const query = params.toString();
  return apiGet<MarketplaceOfferListResponse>(`/api/marketplace/offers${query ? `?${query}` : ''}`);
}

export function getMyMarketplaceOffers(): Promise<MarketplaceOfferListResponse> {
  return apiGet<MarketplaceOfferListResponse>('/api/marketplace/my-offers');
}

export function getMarketplaceHistory(): Promise<MarketplaceTradeHistoryResponse> {
  return apiGet<MarketplaceTradeHistoryResponse>('/api/marketplace/trade-history');
}

export function createMarketplaceOffer(
  input: CreateMarketplaceOfferRequest,
): Promise<CreateMarketplaceOfferResponse> {
  return apiPost<CreateMarketplaceOfferResponse>('/api/marketplace/offers', input);
}

export function acceptMarketplaceOffer(
  offerId: string,
  input: AcceptMarketplaceOfferRequest,
): Promise<AcceptMarketplaceOfferResponse> {
  return apiPost<AcceptMarketplaceOfferResponse>(`/api/marketplace/offers/${offerId}/accept`, input);
}

export function cancelMarketplaceOffer(offerId: string): Promise<CancelMarketplaceOfferResponse> {
  return apiPost<CancelMarketplaceOfferResponse>(`/api/marketplace/offers/${offerId}/cancel`, {});
}
