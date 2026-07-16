export type InventoryItemCategory =
  | 'cosmetic'
  | 'resource_pack'
  | 'unit_pack'
  | 'boost'
  | 'rename_token'
  | 'event_token'
  | 'supporter_badge'
  | 'alliance_cosmetic'
  | 'collectible';

export type InventoryItemBehavior = 'consumable' | 'permanent' | 'equippable' | 'currency_like';

export type InventoryItemSource =
  | 'quest'
  | 'event'
  | 'pve'
  | 'pvp'
  | 'naval'
  | 'alliance'
  | 'admin'
  | 'supporter_pack'
  | 'beta_reward'
  | 'system'
  | 'refund_adjustment';

export type InventoryItemDefinition = {
  itemId: string;
  category: InventoryItemCategory;
  behavior: InventoryItemBehavior;
  name: string;
  description: string;
  stackable: boolean;
  maxStack?: number;
  grants?: {
    resources?: Partial<Record<'wood' | 'gold' | 'marble' | 'wine' | 'crystal' | 'sulfur', number>>;
    units?: Partial<Record<string, number>>;
  };
  gameplayEarnedOnly?: boolean;
  gameplayEffect?: null;
  cosmeticSlot?: 'player_badge' | 'avatar_frame' | 'city_skin' | 'alliance_banner';
  targetType?: 'city' | 'player' | 'alliance';
};

export const INVENTORY_CONFIG = {
  categories: [
    'cosmetic',
    'resource_pack',
    'unit_pack',
    'boost',
    'rename_token',
    'event_token',
    'supporter_badge',
    'alliance_cosmetic',
    'collectible',
  ],
  defaultPageSize: 30,
  expirationCheckIntervalMinutes: 60,
  gameplayRules: {
    paidResourcePacksEnabled: false,
    paidUnitPacksEnabled: false,
    paidCombatItemsEnabled: false,
    paidResearchItemsEnabled: false,
  },
} as const;

export const INVENTORY_ITEM_CATALOG: readonly InventoryItemDefinition[] = [
  {
    itemId: 'resource_loot_wood',
    category: 'resource_pack',
    behavior: 'consumable',
    name: 'Wood Loot',
    description: 'Adds 1 wood to one selected city.',
    stackable: true,
    maxStack: 999999999,
    grants: { resources: { wood: 1 } },
    gameplayEarnedOnly: true,
    targetType: 'city',
  },
  {
    itemId: 'resource_loot_gold',
    category: 'resource_pack',
    behavior: 'consumable',
    name: 'Gold Loot',
    description: 'Adds 1 gold to one selected city.',
    stackable: true,
    maxStack: 999999999,
    grants: { resources: { gold: 1 } },
    gameplayEarnedOnly: true,
    targetType: 'city',
  },
  {
    itemId: 'resource_loot_marble',
    category: 'resource_pack',
    behavior: 'consumable',
    name: 'Marble Loot',
    description: 'Adds 1 marble to one selected city.',
    stackable: true,
    maxStack: 999999999,
    grants: { resources: { marble: 1 } },
    gameplayEarnedOnly: true,
    targetType: 'city',
  },
  {
    itemId: 'resource_loot_wine',
    category: 'resource_pack',
    behavior: 'consumable',
    name: 'Wine Loot',
    description: 'Adds 1 wine to one selected city.',
    stackable: true,
    maxStack: 999999999,
    grants: { resources: { wine: 1 } },
    gameplayEarnedOnly: true,
    targetType: 'city',
  },
  {
    itemId: 'resource_loot_crystal',
    category: 'resource_pack',
    behavior: 'consumable',
    name: 'Crystal Loot',
    description: 'Adds 1 crystal to one selected city.',
    stackable: true,
    maxStack: 999999999,
    grants: { resources: { crystal: 1 } },
    gameplayEarnedOnly: true,
    targetType: 'city',
  },
  {
    itemId: 'resource_loot_sulfur',
    category: 'resource_pack',
    behavior: 'consumable',
    name: 'Sulfur Loot',
    description: 'Adds 1 sulfur to one selected city.',
    stackable: true,
    maxStack: 999999999,
    grants: { resources: { sulfur: 1 } },
    gameplayEarnedOnly: true,
    targetType: 'city',
  },
  {
    itemId: 'resource_pack_wood_small',
    category: 'resource_pack',
    behavior: 'consumable',
    name: 'Small Wood Crate',
    description: 'Adds 250 wood to one selected city.',
    stackable: true,
    maxStack: 99,
    grants: { resources: { wood: 250 } },
    gameplayEarnedOnly: true,
    targetType: 'city',
  },
  {
    itemId: 'resource_pack_gold_small',
    category: 'resource_pack',
    behavior: 'consumable',
    name: 'Small Gold Chest',
    description: 'Adds 150 gold to one selected city.',
    stackable: true,
    maxStack: 99,
    grants: { resources: { gold: 150 } },
    gameplayEarnedOnly: true,
    targetType: 'city',
  },
  {
    itemId: 'unit_pack_spearman_5',
    category: 'unit_pack',
    behavior: 'consumable',
    name: 'Spearman Reinforcement',
    description: 'Adds 5 Spearmen to one selected city.',
    stackable: true,
    maxStack: 20,
    grants: { units: { spearman: 5 } },
    gameplayEarnedOnly: true,
    targetType: 'city',
  },
  {
    itemId: 'city_rename_token',
    category: 'rename_token',
    behavior: 'consumable',
    name: 'City Rename Token',
    description: 'Allows one city rename.',
    stackable: true,
    maxStack: 10,
    targetType: 'city',
  },
  {
    itemId: 'player_rename_token',
    category: 'rename_token',
    behavior: 'consumable',
    name: 'Player Rename Token',
    description: 'Allows one player rename.',
    stackable: true,
    maxStack: 5,
    targetType: 'player',
  },
  {
    itemId: 'supporter_badge_coffee',
    category: 'supporter_badge',
    behavior: 'equippable',
    name: 'Coffee Supporter Badge',
    description: 'A profile badge for players who supported the project.',
    stackable: false,
    gameplayEffect: null,
    cosmeticSlot: 'player_badge',
  },
  {
    itemId: 'avatar_frame_supporter_bronze',
    category: 'cosmetic',
    behavior: 'equippable',
    name: 'Bronze Supporter Frame',
    description: 'A decorative profile frame.',
    stackable: false,
    gameplayEffect: null,
    cosmeticSlot: 'avatar_frame',
  },
  {
    itemId: 'city_skin_harbor_blue',
    category: 'cosmetic',
    behavior: 'equippable',
    name: 'Harbor Blue City Skin',
    description: 'A blue-and-white harbor visual theme.',
    stackable: false,
    gameplayEffect: null,
    cosmeticSlot: 'city_skin',
    targetType: 'city',
  },
  {
    itemId: 'alliance_banner_wave',
    category: 'alliance_cosmetic',
    behavior: 'equippable',
    name: 'Ocean Wave Banner',
    description: 'A decorative banner for an alliance.',
    stackable: false,
    gameplayEffect: null,
    cosmeticSlot: 'alliance_banner',
    targetType: 'alliance',
  },
] as const;

export function getInventoryItemDefinition(itemId: string): InventoryItemDefinition | undefined {
  return INVENTORY_ITEM_CATALOG.find((item) => item.itemId === itemId);
}
