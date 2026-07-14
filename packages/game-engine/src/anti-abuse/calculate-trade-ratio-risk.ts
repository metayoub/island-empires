export type AntiAbuseRiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export function calculateTradeRatioRisk(input: {
  offeredValue: number;
  requestedValue: number;
  thresholds: {
    medium: number;
    high: number;
    critical: number;
  };
}): { ratio: number; riskLevel: AntiAbuseRiskLevel } {
  const lower = Math.max(1, Math.min(input.offeredValue, input.requestedValue));
  const higher = Math.max(input.offeredValue, input.requestedValue);
  const ratio = higher / lower;
  if (ratio >= input.thresholds.critical) return { ratio, riskLevel: 'critical' };
  if (ratio >= input.thresholds.high) return { ratio, riskLevel: 'high' };
  if (ratio >= input.thresholds.medium) return { ratio, riskLevel: 'medium' };
  return { ratio, riskLevel: 'none' };
}
