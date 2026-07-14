import type { AntiAbuseRiskLevel } from './calculate-trade-ratio-risk.js';

const BASE_SCORE: Record<Exclude<AntiAbuseRiskLevel, 'none'>, number> = {
  low: 10,
  medium: 35,
  high: 70,
  critical: 95,
};

export function calculateRiskScore(input: {
  riskLevel: Exclude<AntiAbuseRiskLevel, 'none'>;
  signalCount: number;
}): number {
  return Math.min(100, BASE_SCORE[input.riskLevel] + Math.max(0, input.signalCount - 1) * 5);
}
