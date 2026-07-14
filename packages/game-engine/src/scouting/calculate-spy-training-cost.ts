import { DEFAULT_SPY_CONFIG } from './spy-defaults.js';

export type SpyTrainingCost = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export function calculateSpyTrainingCost(input: { quantity: number }): SpyTrainingCost {
  const quantity = Math.max(0, Math.floor(input.quantity));

  return {
    wood: DEFAULT_SPY_CONFIG.unit.cost.wood * quantity,
    gold: DEFAULT_SPY_CONFIG.unit.cost.gold * quantity,
    marble: DEFAULT_SPY_CONFIG.unit.cost.marble * quantity,
    wine: DEFAULT_SPY_CONFIG.unit.cost.wine * quantity,
    crystal: DEFAULT_SPY_CONFIG.unit.cost.crystal * quantity,
    sulfur: DEFAULT_SPY_CONFIG.unit.cost.sulfur * quantity,
  };
}
