import { apiPost } from '../../services/api/client';

export type SupportCategory =
  | 'account'
  | 'payment'
  | 'bug'
  | 'gameplay'
  | 'abuse_report'
  | 'other';

export type ContactSupportInput = {
  category: SupportCategory;
  subject: string;
  message: string;
  playerId?: string;
  userEmail?: string;
};

export function contactSupport(input: ContactSupportInput): Promise<{ success: true; requestId: string }> {
  return apiPost('/api/support/contact', input);
}
