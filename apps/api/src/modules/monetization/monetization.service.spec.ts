import { MonetizationService } from './monetization.service';

describe('MonetizationService catalog', () => {
  function service() {
    return new MonetizationService(
      {} as any,
      {} as any,
      {} as any,
      { get: (_key: string, fallback: string) => fallback } as any,
    );
  }

  it('returns Gems packs and fair premium products from the server catalog', async () => {
    const shop = await service().getShop();

    expect(shop.currencyPackages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'gems_500', name: '500 Gems', premiumCurrency: 500 }),
        expect.objectContaining({ id: 'gems_1200', name: '1,200 Gems', premiumCurrency: 1200 }),
      ]),
    );
    expect(shop.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'premium_30_days', premiumCurrencyCost: 600 }),
        expect.objectContaining({ id: 'city_rename', premiumCurrencyCost: 150 }),
        expect.objectContaining({ id: 'avatar_frame_gold', premiumCurrencyCost: 250 }),
      ]),
    );
  });

  it('does not expose pay-to-win products or pressure rules', async () => {
    const shop = await service().getShop();
    const productText = JSON.stringify(shop).toLowerCase();

    expect(productText).not.toContain('attack boost');
    expect(productText).not.toContain('resource pack');
    expect(productText).not.toContain('loot box');
    expect(productText).not.toContain('limited time');
    expect(shop.rules).toEqual(expect.arrayContaining(['No paid attack domination', 'No random paid rewards']));
  });
});
