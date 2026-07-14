export function calculateMarketplaceTax(input: { amount: number; taxRate: number }): {
  taxAmount: number;
  amountAfterTax: number;
} {
  const amount = Math.max(0, Math.floor(input.amount));
  const taxAmount = Math.floor(amount * Math.max(0, input.taxRate));

  return {
    taxAmount,
    amountAfterTax: Math.max(0, amount - taxAmount),
  };
}
