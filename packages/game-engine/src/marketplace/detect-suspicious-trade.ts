export type SuspiciousTradeSignal = {
  reason: string;
  severity: 'low' | 'medium' | 'high';
};

export function detectSuspiciousTrade(input: {
  offeredAmount: number;
  requestedAmount: number;
  recentTradeCountBetweenPlayers: number;
  creatorScore?: number;
  accepterScore?: number;
}): SuspiciousTradeSignal[] {
  const signals: SuspiciousTradeSignal[] = [];
  const lower = Math.max(1, Math.min(input.offeredAmount, input.requestedAmount));
  const higher = Math.max(input.offeredAmount, input.requestedAmount);

  if (higher / lower >= 10) {
    signals.push({ reason: 'extreme_trade_ratio', severity: 'medium' });
  }
  if (input.recentTradeCountBetweenPlayers >= 5) {
    signals.push({ reason: 'repeated_trades_between_players', severity: 'low' });
  }
  if (
    typeof input.creatorScore === 'number' &&
    typeof input.accepterScore === 'number' &&
    Math.max(input.creatorScore, input.accepterScore) >=
      Math.max(1, Math.min(input.creatorScore, input.accepterScore)) * 5 &&
    higher >= 1000
  ) {
    signals.push({ reason: 'large_trade_between_uneven_scores', severity: 'medium' });
  }

  return signals;
}
