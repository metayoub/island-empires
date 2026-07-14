export function canCreateMarketplaceOffer(input: {
  marketplaceLevel: number;
  activeOfferCount: number;
  maxActiveOffers: number;
  offeredAmount: number;
  requestedAmount: number;
  maxOfferLoad: number;
  hasEnoughResources: boolean;
}): { canCreate: boolean; reason?: string } {
  if (input.marketplaceLevel < 1) {
    return { canCreate: false, reason: 'Marketplace level 1 is required.' };
  }
  if (input.activeOfferCount >= input.maxActiveOffers) {
    return { canCreate: false, reason: 'Active offer limit reached.' };
  }
  if (input.offeredAmount <= 0 || input.requestedAmount <= 0) {
    return { canCreate: false, reason: 'Offer amounts must be positive.' };
  }
  if (input.offeredAmount > input.maxOfferLoad || input.requestedAmount > input.maxOfferLoad) {
    return { canCreate: false, reason: 'Offer exceeds marketplace capacity.' };
  }
  if (!input.hasEnoughResources) {
    return { canCreate: false, reason: 'Not enough resources available.' };
  }

  return { canCreate: true };
}
