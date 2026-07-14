import { apiGet, apiPatch, apiPost } from '../../services/api/client';

export type BetaFeedbackCategory =
  | 'bug'
  | 'confusing'
  | 'balance'
  | 'suggestion'
  | 'performance'
  | 'positive'
  | 'other';

export function validateBetaInvite(code: string): Promise<{ valid: boolean; cohort: string | null; reason?: string }> {
  return apiPost('/api/beta/invite/validate', { code });
}

export function submitBetaFeedback(body: {
  category: BetaFeedbackCategory;
  title: string;
  message: string;
  page?: string;
}): Promise<{ success: true }> {
  return apiPost('/api/beta/feedback', body);
}

export function getAdminBetaOverview(): Promise<any> {
  return apiGet('/api/admin/beta/overview');
}

export function getAdminBetaMetrics(): Promise<any> {
  return apiGet('/api/admin/beta/metrics');
}

export function updateAdminBetaFeedback(
  feedbackId: string,
  body: { status: string; adminNote?: string },
): Promise<any> {
  return apiPatch(`/api/admin/beta/feedback/${feedbackId}`, body);
}
