export const MARKETPLACE_CONFIG = {
  movementType: 'marketplace_trade',
  capacityPerMarketplaceLevel: 1000,
  defaultOfferDurationHours: 24,
  maxActiveOffersPerPlayer: 10,
  marketplaceTaxRate: 0.05,
  tradeTravelMultiplier: 1.2,
  minTravelTimeSeconds: 60,
} as const;

export const TRADE_SHIP_CONFIG = {
  baseShips: 3,
  capacityPerShip: 500,
} as const;
