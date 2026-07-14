import {
  calculateAllianceContributionScore,
  calculateAllianceProjectProgressPercent,
  getAllianceProjectDefinition,
  isAllianceProjectComplete,
} from './index.js';

describe('alliance cooperation', () => {
  it('scores donations as the sum of donated resources', () => {
    expect(calculateAllianceContributionScore({ wood: 100, gold: 50, wine: 25 })).toBe(175);
  });

  it('calculates project progress with per-resource caps', () => {
    const project = getAllianceProjectDefinition('trade_harbor');

    expect(project).not.toBeNull();
    expect(
      calculateAllianceProjectProgressPercent({
        cost: project!.cost,
        contributed: { wood: 6000, gold: 0, marble: 0, wine: 9999, crystal: 0, sulfur: 0 },
      }),
    ).toBe(48);
  });

  it('detects completed projects only when every required resource is funded', () => {
    const project = getAllianceProjectDefinition('island_festival');

    expect(project).not.toBeNull();
    expect(isAllianceProjectComplete({ cost: project!.cost, contributed: project!.cost })).toBe(true);
    expect(
      isAllianceProjectComplete({
        cost: project!.cost,
        contributed: { ...project!.cost, wine: project!.cost.wine - 1 },
      }),
    ).toBe(false);
  });
});
