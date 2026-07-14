export function calculateTradeValue(input: {
  resource: string;
  amount: number;
  weights: Record<string, number>;
}): number {
  const amount = Math.max(0, Math.floor(input.amount));
  return amount * (input.weights[input.resource] ?? 1);
}
