import type { AntiAbuseRiskLevel } from './calculate-trade-ratio-risk.js';

export function calculateResourcePushingRisk(input: {
  sentValue: number;
  generatedValue: number;
  thresholdPercent: number;
}): { transferPercent: number; riskLevel: AntiAbuseRiskLevel } {
  if (input.generatedValue <= 0) return { transferPercent: 0, riskLevel: 'none' };
  const transferPercent = input.sentValue / input.generatedValue;
  if (transferPercent >= input.thresholdPercent) return { transferPercent, riskLevel: 'high' };
  if (transferPercent >= input.thresholdPercent * 0.75) return { transferPercent, riskLevel: 'medium' };
  if (transferPercent >= input.thresholdPercent * 0.5) return { transferPercent, riskLevel: 'low' };
  return { transferPercent, riskLevel: 'none' };
}
