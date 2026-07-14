import { apiGet, apiPost } from '../../services/api/client';

export type InventoryItem = {
  inventoryItemId: string;
  itemId: string;
  name: string;
  description: string;
  category: string;
  behavior: string;
  quantity: number;
  status: string;
  expiresAt: string | null;
  sourceType: string;
  canUse: boolean;
  canEquip: boolean;
  equipped: boolean;
  cosmeticSlot: string | null;
  targetType: string | null;
};

export function getInventory(category = 'all') {
  return apiGet<{ items: InventoryItem[]; pagination: { page: number; pageSize: number; total: number } }>(
    `/api/inventory?category=${encodeURIComponent(category)}`,
  );
}

export function useInventoryItem(input: {
  inventoryItemId: string;
  quantity: number;
  targetType?: string;
  targetId?: string;
  payload?: { newName?: string };
}) {
  return apiPost<{ success: true }>(`/api/inventory/${input.inventoryItemId}/use`, input);
}

export function equipInventoryItem(input: {
  inventoryItemId: string;
  cosmeticSlot: string;
  cityId?: string;
  allianceId?: string;
}) {
  return apiPost<{ success: true }>(`/api/inventory/${input.inventoryItemId}/equip`, input);
}

export function unequipCosmetic(input: { cosmeticSlot: string; cityId?: string; allianceId?: string }) {
  return apiPost<{ success: true }>('/api/inventory/cosmetics/unequip', input);
}
