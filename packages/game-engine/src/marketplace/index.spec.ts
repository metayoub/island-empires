import {
  calculateMarketplaceCapacity,
  calculateMarketplaceTax,
  calculateTradeTravelTimeSeconds,
  canAcceptMarketplaceOffer,
  canCreateMarketplaceOffer,
  detectSuspiciousTrade,
} from './index.js';

describe('marketplace engine', () => {
  it('calculates marketplace capacity by level', () => {
    expect(calculateMarketplaceCapacity({ marketplaceLevel: 3, capacityPerMarketplaceLevel: 1000 })).toBe(3000);
    expect(calculateMarketplaceCapacity({ marketplaceLevel: 0, capacityPerMarketplaceLevel: 1000 })).toBe(0);
  });

  it('calculates tax with floor rounding', () => {
    expect(calculateMarketplaceTax({ amount: 250, taxRate: 0.05 })).toEqual({
      taxAmount: 12,
      amountAfterTax: 238,
    });
  });

  it('enforces minimum trade travel time', () => {
    expect(
      calculateTradeTravelTimeSeconds({
        normalTravelTimeSeconds: 20,
        tradeTravelMultiplier: 1.2,
        minTravelTimeSeconds: 60,
      }),
    ).toBe(60);
  });

  it('validates offer creation requirements', () => {
    expect(
      canCreateMarketplaceOffer({
        marketplaceLevel: 1,
        activeOfferCount: 0,
        maxActiveOffers: 10,
        offeredAmount: 500,
        requestedAmount: 250,
        maxOfferLoad: 1000,
        hasEnoughResources: true,
      }).canCreate,
    ).toBe(true);
    expect(
      canCreateMarketplaceOffer({
        marketplaceLevel: 0,
        activeOfferCount: 0,
        maxActiveOffers: 10,
        offeredAmount: 500,
        requestedAmount: 250,
        maxOfferLoad: 0,
        hasEnoughResources: true,
      }).canCreate,
    ).toBe(false);
  });

  it('validates offer acceptance requirements', () => {
    expect(
      canAcceptMarketplaceOffer({
        offerIsActive: true,
        offerIsExpired: false,
        accepterIsCreator: false,
        accepterHasMarketplace: true,
        accepterHasEnoughResources: true,
        hasEnoughTradeCapacity: true,
      }).canAccept,
    ).toBe(true);
    expect(
      canAcceptMarketplaceOffer({
        offerIsActive: true,
        offerIsExpired: false,
        accepterIsCreator: true,
        accepterHasMarketplace: true,
        accepterHasEnoughResources: true,
        hasEnoughTradeCapacity: true,
      }).canAccept,
    ).toBe(false);
  });

  it('detects suspicious trade signals without blocking', () => {
    expect(
      detectSuspiciousTrade({
        offeredAmount: 5000,
        requestedAmount: 100,
        recentTradeCountBetweenPlayers: 5,
      }).map((signal) => signal.reason),
    ).toEqual(['extreme_trade_ratio', 'repeated_trades_between_players']);
  });
});
