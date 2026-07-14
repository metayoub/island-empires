export function calculateMarketplaceCapacity(input: {
  marketplaceLevel: number;
  capacityPerMarketplaceLevel: number;
}): number {
  return Math.max(0, Math.floor(input.marketplaceLevel)) * input.capacityPerMarketplaceLevel;
}
