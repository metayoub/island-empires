import type {
  ClaimLiveEventRewardResponse,
  JoinLiveEventResponse,
  LiveEventDetailResponse,
  LiveEventsResponse,
} from '@island-empires/shared-types';
import { apiGet, apiPost } from '../../services/api/client';

export function getLiveEvents(): Promise<LiveEventsResponse> {
  return apiGet<LiveEventsResponse>('/api/live-events');
}

export function getLiveEvent(eventId: string): Promise<LiveEventDetailResponse> {
  return apiGet<LiveEventDetailResponse>(`/api/live-events/${eventId}`);
}

export function joinLiveEvent(eventId: string): Promise<JoinLiveEventResponse> {
  return apiPost<JoinLiveEventResponse>(`/api/live-events/${eventId}/join`, {});
}

export function claimLiveEventReward(eventId: string): Promise<ClaimLiveEventRewardResponse> {
  return apiPost<ClaimLiveEventRewardResponse>(`/api/live-events/${eventId}/claim`, {});
}
