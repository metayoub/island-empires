import { DEFAULT_SPY_CONFIG } from './spy-defaults.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateSpySuccessChance(input: {
  attackerSpyAgencyLevel: number;
  defenderSpyAgencyLevel: number;
  defenderSpyCount: number;
}): number {
  const chance =
    DEFAULT_SPY_CONFIG.baseSuccessChance +
    Math.max(0, input.attackerSpyAgencyLevel) * DEFAULT_SPY_CONFIG.attackerLevelBonus -
    Math.max(0, input.defenderSpyAgencyLevel) * DEFAULT_SPY_CONFIG.defenderLevelPenalty -
    Math.max(0, input.defenderSpyCount) * DEFAULT_SPY_CONFIG.counterSpyPerDefendingSpy;

  return Number(
    clamp(chance, DEFAULT_SPY_CONFIG.minSuccessChance, DEFAULT_SPY_CONFIG.maxSuccessChance).toFixed(4),
  );
}
