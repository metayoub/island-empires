export const MONETIZATION_CONFIG = {
  premiumCurrencyCode: 'premium_gems',
  premiumCurrencyDisplayName: 'Gems',
  fairPlayRules: {
    allowResourceBuying: false,
    allowCombatBoosts: false,
    allowExclusivePowerUnits: false,
    allowUncappedSpeedups: false,
    allowPaidOnlyResearch: false,
  },
  rename: {
    playerRenameCostGems: 300,
    cityRenameCostGems: 150,
    playerNameMinLength: 3,
    playerNameMaxLength: 24,
    cityNameMinLength: 3,
    cityNameMaxLength: 32,
  },
  premiumAccount: {
    defaultDurationDays: 30,
    allowedBenefits: [
      'profile_badge',
      'extended_message_archive',
      'extra_map_bookmarks',
      'advanced_notification_filters',
      'enhanced_city_overview',
    ],
  },
  receipts: {
    sendReceiptEmail: true,
  },
} as const;

export const SHOP_CATALOG = [
  {
    productId: 'gems_500',
    type: 'premium_currency_pack',
    name: '500 Gems',
    description: 'Adds 500 Gems to your account.',
    priceCents: 499,
    currency: 'USD',
    grants: { premiumGems: 500 },
  },
  {
    productId: 'gems_1200',
    type: 'premium_currency_pack',
    name: '1,200 Gems',
    description: 'Adds 1,200 Gems to your account.',
    priceCents: 999,
    currency: 'USD',
    grants: { premiumGems: 1200 },
  },
  {
    productId: 'premium_30_days',
    type: 'premium_account',
    name: 'Premium Account - 30 Days',
    description: 'Unlocks comfort features and visual benefits for 30 days.',
    priceGems: 600,
    grants: { premiumDays: 30 },
  },
  {
    productId: 'player_rename',
    type: 'player_rename',
    name: 'Player Rename',
    description: 'Change your player name once.',
    priceGems: 300,
  },
  {
    productId: 'city_rename',
    type: 'city_rename',
    name: 'City Rename',
    description: 'Change one city name.',
    priceGems: 150,
  },
  {
    productId: 'city_skin_marble_harbor',
    type: 'city_skin',
    name: 'Marble Harbor City Skin',
    description: 'A bright marble-themed city appearance.',
    priceGems: 500,
    grants: { cosmeticValue: 'marble_harbor' },
  },
  {
    productId: 'avatar_frame_gold',
    type: 'avatar_frame',
    name: 'Golden Avatar Frame',
    description: 'A decorative profile frame.',
    priceGems: 250,
    grants: { cosmeticValue: 'gold' },
  },
  {
    productId: 'alliance_banner_sea_wolves',
    type: 'alliance_banner',
    name: 'Sea Wolves Alliance Banner',
    description: 'A decorative alliance banner cosmetic.',
    priceGems: 700,
    grants: { cosmeticValue: 'sea_wolves' },
  },
] as const;

export type ShopCatalogProduct = (typeof SHOP_CATALOG)[number];
