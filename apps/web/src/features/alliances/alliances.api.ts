import type {
  AllianceActionResponse,
  AllianceCooperationOverviewResponse,
  AllianceApplicationListResponse,
  AllianceChatResponse,
  AllianceDetailResponse,
  AllianceListResponse,
  ApplyToAllianceRequest,
  CreateAllianceHelpRequestRequest,
  CreateAllianceTradeRequestRequest,
  CreateAllianceAnnouncementRequest,
  CreateAllianceChatMessageRequest,
  CreateAllianceRequest,
  DonateToAllianceRequest,
  InvitePlayerRequest,
  PlayerSearchResponse,
  ShareAllianceBattleReportRequest,
  StartAllianceProjectRequest,
  UpdateAllianceProfileRequest,
} from '@island-empires/shared-types';
import { apiGet, apiPatch, apiPost } from '../../services/api/client';

export function listAlliances(query = ''): Promise<AllianceListResponse> {
  const q = query.trim();
  return apiGet<AllianceListResponse>(`/api/alliances${q ? `?q=${encodeURIComponent(q)}` : ''}`);
}

export function getMyAlliance(): Promise<AllianceDetailResponse> {
  return apiGet<AllianceDetailResponse>('/api/alliances/me');
}

export function createAlliance(body: CreateAllianceRequest): Promise<AllianceDetailResponse> {
  return apiPost<AllianceDetailResponse>('/api/alliances', body);
}

export function updateAllianceProfile(
  allianceId: string,
  body: UpdateAllianceProfileRequest,
): Promise<AllianceDetailResponse> {
  return apiPatch<AllianceDetailResponse>(`/api/alliances/${allianceId}/profile`, body);
}

export function applyToAlliance(
  allianceId: string,
  body: ApplyToAllianceRequest,
): Promise<{ application: unknown }> {
  return apiPost<{ application: unknown }>(`/api/alliances/${allianceId}/applications`, body);
}

export function getAllianceApplications(
  allianceId: string,
): Promise<AllianceApplicationListResponse> {
  return apiGet<AllianceApplicationListResponse>(`/api/alliances/${allianceId}/applications`);
}

export function acceptAllianceApplication(
  applicationId: string,
): Promise<AllianceActionResponse> {
  return apiPost<AllianceActionResponse>(`/api/alliances/applications/${applicationId}/accept`, {});
}

export function rejectAllianceApplication(
  applicationId: string,
): Promise<AllianceActionResponse> {
  return apiPost<AllianceActionResponse>(`/api/alliances/applications/${applicationId}/reject`, {});
}

export function getMyAllianceInvitations() {
  return apiGet('/api/alliances/invitations/my');
}

export function invitePlayer(allianceId: string, body: InvitePlayerRequest) {
  return apiPost(`/api/alliances/${allianceId}/invitations`, body);
}

export function getAllianceChat(allianceId: string): Promise<AllianceChatResponse> {
  return apiGet<AllianceChatResponse>(`/api/alliances/${allianceId}/chat`);
}

export function sendAllianceChat(
  allianceId: string,
  body: CreateAllianceChatMessageRequest,
): Promise<{ message: unknown }> {
  return apiPost<{ message: unknown }>(`/api/alliances/${allianceId}/chat`, body);
}

export function createAllianceAnnouncement(
  allianceId: string,
  body: CreateAllianceAnnouncementRequest,
) {
  return apiPost(`/api/alliances/${allianceId}/announcements`, body);
}

export function getAllianceCooperation(
  allianceId: string,
): Promise<AllianceCooperationOverviewResponse> {
  return apiGet<AllianceCooperationOverviewResponse>(`/api/alliances/${allianceId}/cooperation`);
}

export function donateToAlliance(
  allianceId: string,
  body: DonateToAllianceRequest,
): Promise<AllianceCooperationOverviewResponse> {
  return apiPost<AllianceCooperationOverviewResponse>(`/api/alliances/${allianceId}/donations`, body);
}

export function startAllianceProject(
  allianceId: string,
  body: StartAllianceProjectRequest,
): Promise<AllianceCooperationOverviewResponse> {
  return apiPost<AllianceCooperationOverviewResponse>(`/api/alliances/${allianceId}/projects`, body);
}

export function createAllianceHelpRequest(
  allianceId: string,
  body: CreateAllianceHelpRequestRequest,
) {
  return apiPost(`/api/alliances/${allianceId}/help-requests`, body);
}

export function createAllianceTradeRequest(
  allianceId: string,
  body: CreateAllianceTradeRequestRequest,
) {
  return apiPost(`/api/alliances/${allianceId}/trade-requests`, body);
}

export function shareAllianceBattleReport(
  allianceId: string,
  body: ShareAllianceBattleReportRequest,
) {
  return apiPost(`/api/alliances/${allianceId}/shared-battle-reports`, body);
}

export function leaveAlliance(allianceId: string): Promise<AllianceActionResponse> {
  return apiPost<AllianceActionResponse>(`/api/alliances/${allianceId}/leave`, {});
}

export function disbandAlliance(allianceId: string): Promise<AllianceActionResponse> {
  return apiPost<AllianceActionResponse>(`/api/alliances/${allianceId}/disband`, {});
}

export function searchPlayers(worldId: string, query: string): Promise<PlayerSearchResponse> {
  return apiGet<PlayerSearchResponse>(
    `/api/worlds/${worldId}/players/search?q=${encodeURIComponent(query)}`,
  );
}
