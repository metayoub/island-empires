import { INVENTORY_ITEM_CATALOG, SUPPORTER_CONFIG, getInventoryItemDefinition } from '@island-empires/config';

describe('Inventory catalog', () => {
  it('contains stackable gameplay-earned resource and unit packs', () => {
    expect(INVENTORY_ITEM_CATALOG).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemId: 'resource_pack_wood_small',
          category: 'resource_pack',
          behavior: 'consumable',
          stackable: true,
          gameplayEarnedOnly: true,
        }),
        expect.objectContaining({
          itemId: 'unit_pack_spearman_5',
          category: 'unit_pack',
          behavior: 'consumable',
          stackable: true,
          gameplayEarnedOnly: true,
        }),
      ]),
    );
  });

  it('keeps supporter packs free of paid resources and units', () => {
    for (const pack of SUPPORTER_CONFIG.packs) {
      for (const grant of pack.grants) {
        const item = getInventoryItemDefinition(grant.itemId);
        expect(item).toBeDefined();
        expect(item?.category).not.toBe('resource_pack');
        expect(item?.category).not.toBe('unit_pack');
      }
    }
  });
});
