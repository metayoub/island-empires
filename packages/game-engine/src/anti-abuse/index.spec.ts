import {
  calculateActionFrequencyRisk,
  calculateRepeatedAttackRisk,
  calculateRiskScore,
  calculateTradeRatioRisk,
  calculateTradeValue,
} from './index.js';

describe('anti-abuse formulas', () => {
  it('calculates weighted trade value', () => {
    expect(calculateTradeValue({ resource: 'crystal', amount: 100, weights: { crystal: 3 } })).toBe(300);
  });

  it('classifies trade ratio risk', () => {
    const thresholds = { medium: 5, high: 10, critical: 20 };
    expect(calculateTradeRatioRisk({ offeredValue: 100, requestedValue: 100, thresholds }).riskLevel).toBe('none');
    expect(calculateTradeRatioRisk({ offeredValue: 500, requestedValue: 100, thresholds }).riskLevel).toBe('medium');
    expect(calculateTradeRatioRisk({ offeredValue: 1000, requestedValue: 100, thresholds }).riskLevel).toBe('high');
    expect(calculateTradeRatioRisk({ offeredValue: 2000, requestedValue: 100, thresholds }).riskLevel).toBe('critical');
  });

  it('classifies repeated attack risk', () => {
    const thresholds = { mediumCount: 3, highCount: 5, criticalCount: 8 };
    expect(calculateRepeatedAttackRisk({ attackCount: 0, thresholds })).toBe('none');
    expect(calculateRepeatedAttackRisk({ attackCount: 3, thresholds })).toBe('medium');
    expect(calculateRepeatedAttackRisk({ attackCount: 5, thresholds })).toBe('high');
    expect(calculateRepeatedAttackRisk({ attackCount: 8, thresholds })).toBe('critical');
  });

  it('calculates action frequency risk and bounded risk score', () => {
    expect(calculateActionFrequencyRisk({ count: 30, warnAt: 20, blockAt: 40 })).toBe('medium');
    expect(calculateRiskScore({ riskLevel: 'high', signalCount: 10 })).toBe(100);
  });
});
