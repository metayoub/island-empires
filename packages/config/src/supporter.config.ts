export type SupporterPackDefinition = {
  supporterPackId: string;
  name: string;
  description: string;
  priceCents: number;
  currency: 'USD';
  grants: Array<{ itemId: string; quantity: number }>;
};

export const SUPPORTER_CONFIG = {
  enabled: true,
  minimumDonationCents: 100,
  defaultCurrency: 'USD',
  packs: [
    {
      supporterPackId: 'supporter_coffee_1',
      name: 'Coffee Supporter',
      description: 'A small contribution toward hosting and development.',
      priceCents: 100,
      currency: 'USD',
      grants: [{ itemId: 'supporter_badge_coffee', quantity: 1 }],
    },
    {
      supporterPackId: 'supporter_harbor_2',
      name: 'Harbor Supporter',
      description: 'Support the project and receive decorative profile items.',
      priceCents: 200,
      currency: 'USD',
      grants: [
        { itemId: 'avatar_frame_supporter_bronze', quantity: 1 },
        { itemId: 'supporter_badge_coffee', quantity: 1 },
      ],
    },
  ] satisfies SupporterPackDefinition[],
  fairness: {
    paidPowerEnabled: false,
    paidResourcesEnabled: false,
    paidUnitsEnabled: false,
    randomPaidRewardsEnabled: false,
  },
  promise: [
    'Island Empires is free to play.',
    'Donations help fund hosting, development, and future updates.',
    'Supporter items are cosmetic or comfort-based only.',
    'Donations do not unlock exclusive combat units, paid-only research, unlimited resources, or guaranteed victory.',
  ],
} as const;

export function getSupporterPackDefinition(supporterPackId: string): SupporterPackDefinition | undefined {
  return SUPPORTER_CONFIG.packs.find((pack) => pack.supporterPackId === supporterPackId);
}
