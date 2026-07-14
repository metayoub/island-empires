import { apiGet, apiPost } from '../../services/api/client';

export type SupporterPack = {
  supporterPackId: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  items: Array<{ itemId: string; name: string; quantity: number }>;
};

export type DonationHistoryRow = {
  id: string;
  supporterPackName: string;
  status: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  fulfilledAt: string | null;
  receiptSentAt: string | null;
};

export function getSupporterPacks() {
  return apiGet<{ packs: SupporterPack[]; fairnessPromise: string[] }>('/api/supporter/packs');
}

export function createSupportCheckout(supporterPackId: string) {
  return apiPost<{ donationId: string; checkoutUrl: string }>('/api/supporter/checkout', {
    supporterPackId,
  });
}

export function getDonationHistory() {
  return apiGet<{ donations: DonationHistoryRow[] }>('/api/supporter/history');
}
