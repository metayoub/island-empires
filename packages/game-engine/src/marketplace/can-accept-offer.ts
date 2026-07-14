export function canAcceptMarketplaceOffer(input: {
  offerIsActive: boolean;
  offerIsExpired: boolean;
  accepterIsCreator: boolean;
  accepterHasMarketplace: boolean;
  accepterHasEnoughResources: boolean;
  hasEnoughTradeCapacity: boolean;
}): { canAccept: boolean; reason?: string } {
  if (!input.offerIsActive) {
    return { canAccept: false, reason: 'Offer is not active.' };
  }
  if (input.offerIsExpired) {
    return { canAccept: false, reason: 'Offer has expired.' };
  }
  if (input.accepterIsCreator) {
    return { canAccept: false, reason: 'You cannot accept your own offer.' };
  }
  if (!input.accepterHasMarketplace) {
    return { canAccept: false, reason: 'Marketplace level 1 is required.' };
  }
  if (!input.accepterHasEnoughResources) {
    return { canAccept: false, reason: 'Not enough resources available.' };
  }
  if (!input.hasEnoughTradeCapacity) {
    return { canAccept: false, reason: 'Not enough trade ship capacity.' };
  }

  return { canAccept: true };
}
