import type { AntiAbuseRiskLevel } from './calculate-trade-ratio-risk.js';

export function calculateRepeatedAttackRisk(input: {
  attackCount: number;
  thresholds: {
    mediumCount: number;
    highCount: number;
    criticalCount: number;
  };
}): AntiAbuseRiskLevel {
  if (input.attackCount >= input.thresholds.criticalCount) return 'critical';
  if (input.attackCount >= input.thresholds.highCount) return 'high';
  if (input.attackCount >= input.thresholds.mediumCount) return 'medium';
  if (input.attackCount > 0) return 'low';
  return 'none';
}
