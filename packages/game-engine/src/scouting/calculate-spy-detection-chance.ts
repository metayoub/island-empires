import { DEFAULT_SPY_CONFIG } from './spy-defaults.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateSpyDetectionChance(input: {
  attackerSpyAgencyLevel: number;
  defenderSpyAgencyLevel: number;
  defenderSpyCount: number;
}): number {
  const chance =
    DEFAULT_SPY_CONFIG.baseDetectionChance +
    Math.max(0, input.defenderSpyAgencyLevel) * DEFAULT_SPY_CONFIG.defenderDetectionBonus +
    Math.max(0, input.defenderSpyCount) * DEFAULT_SPY_CONFIG.counterSpyDetectionBonus -
    Math.max(0, input.attackerSpyAgencyLevel) * DEFAULT_SPY_CONFIG.attackerStealthBonus;

  return Number(
    clamp(chance, DEFAULT_SPY_CONFIG.minDetectionChance, DEFAULT_SPY_CONFIG.maxDetectionChance).toFixed(4),
  );
}
