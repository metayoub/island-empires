import type {
  BlockPlayerRequest,
  BlockPlayerResponse,
  BrowserPushSubscriptionListResponse,
  CitySearchResponse,
  ClearNotificationsResponse,
  MessageDetail,
  MessageListResponse,
  ModerationQueueResponse,
  BrowserPushSubscriptionRequest,
  BrowserPushSubscriptionResponse,
  NotificationCenterResponse,
  NotificationDeliverySummary,
  NotificationSettings,
  PlayerSearchResponse,
  ReportMessageRequest,
  ReportMessageResponse,
  ReportSummary,
  SendMessageRequest,
  SendMessageResponse,
  UnreadCounterResponse,
  UpdateNotificationSettingsRequest,
} from '@island-empires/shared-types';
import { apiGet, apiPatch, apiPost } from '../../services/api/client';

export function getInbox(): Promise<MessageListResponse> {
  return apiGet<MessageListResponse>('/api/messages/inbox');
}

export function getSentMessages(): Promise<MessageListResponse> {
  return apiGet<MessageListResponse>('/api/messages/sent');
}

export function getSystemMessages(): Promise<MessageListResponse> {
  return apiGet<MessageListResponse>('/api/messages/system');
}

export function sendMessage(body: SendMessageRequest): Promise<SendMessageResponse> {
  return apiPost<SendMessageResponse>('/api/messages', body);
}

export function markMessageRead(messageId: string): Promise<MessageDetail> {
  return apiPost<MessageDetail>(`/api/messages/${messageId}/read`, {});
}

export function blockPlayer(
  playerId: string,
  body: BlockPlayerRequest,
): Promise<BlockPlayerResponse> {
  return apiPost<BlockPlayerResponse>(`/api/players/${playerId}/block`, body);
}

export function reportMessage(
  messageId: string,
  body: ReportMessageRequest,
): Promise<ReportMessageResponse> {
  return apiPost<ReportMessageResponse>(`/api/messages/${messageId}/report`, body);
}

export function getModerationQueue(): Promise<ModerationQueueResponse> {
  return apiGet<ModerationQueueResponse>('/api/moderation/messages');
}

export function getNotificationCenter(): Promise<NotificationCenterResponse> {
  return apiGet<NotificationCenterResponse>('/api/notifications');
}

export function getUnreadCounters(): Promise<UnreadCounterResponse> {
  return apiGet<UnreadCounterResponse>('/api/notifications/unread-count');
}

export function getNotificationSettings(): Promise<NotificationSettings> {
  return apiGet<NotificationSettings>('/api/notifications/settings');
}

export function updateNotificationSettings(
  body: UpdateNotificationSettingsRequest,
): Promise<NotificationSettings> {
  return apiPatch<NotificationSettings>('/api/notifications/settings', body);
}

export function saveBrowserPushSubscription(
  body: BrowserPushSubscriptionRequest,
): Promise<BrowserPushSubscriptionResponse> {
  return apiPost<BrowserPushSubscriptionResponse>(
    '/api/notifications/browser-push-subscriptions',
    body,
  );
}

export function getBrowserPushSubscriptions(): Promise<BrowserPushSubscriptionListResponse> {
  return apiGet<BrowserPushSubscriptionListResponse>(
    '/api/notifications/browser-push-subscriptions',
  );
}

export function disableBrowserPushSubscription(
  subscriptionId: string,
): Promise<BrowserPushSubscriptionResponse> {
  return apiPost<BrowserPushSubscriptionResponse>(
    `/api/notifications/browser-push-subscriptions/${subscriptionId}/disable`,
    {},
  );
}

export function markNotificationRead(
  notificationId: string,
): Promise<NotificationDeliverySummary> {
  return apiPost<NotificationDeliverySummary>(`/api/notifications/${notificationId}/read`, {});
}

export function archiveNotification(
  notificationId: string,
): Promise<NotificationDeliverySummary> {
  return apiPost<NotificationDeliverySummary>(`/api/notifications/${notificationId}/archive`, {});
}

export function clearNotifications(): Promise<ClearNotificationsResponse> {
  return apiPost<ClearNotificationsResponse>('/api/notifications/clear', {});
}

export function getReports(category?: string): Promise<ReportSummary[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiGet<ReportSummary[]>(`/api/reports${query}`);
}

export function markReportRead(reportId: string): Promise<ReportSummary> {
  return apiPost<ReportSummary>(`/api/reports/${reportId}/read`, {});
}

export function searchPlayers(worldId: string, query: string): Promise<PlayerSearchResponse> {
  return apiGet<PlayerSearchResponse>(
    `/api/worlds/${worldId}/players/search?q=${encodeURIComponent(query)}`,
  );
}

export function searchCities(worldId: string, query: string): Promise<CitySearchResponse> {
  return apiGet<CitySearchResponse>(
    `/api/worlds/${worldId}/cities/search?q=${encodeURIComponent(query)}`,
  );
}
