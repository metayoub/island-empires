import type { AntiAbuseRiskLevel } from './calculate-trade-ratio-risk.js';

export function calculateActionFrequencyRisk(input: {
  count: number;
  warnAt: number;
  blockAt: number;
}): AntiAbuseRiskLevel {
  if (input.count >= input.blockAt) return 'high';
  if (input.count >= input.warnAt) return 'medium';
  if (input.count > 0) return 'low';
  return 'none';
}
