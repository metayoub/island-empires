import {
  calculateSpyDetectionChance,
  calculateSpySuccessChance,
  calculateSpyTravelTimeSeconds,
  canStartSpyMission,
  generateSpyReport,
} from './index';

describe('scouting', () => {
  it('calculates and clamps spy success chance', () => {
    expect(
      calculateSpySuccessChance({
        attackerSpyAgencyLevel: 2,
        defenderSpyAgencyLevel: 1,
        defenderSpyCount: 3,
      }),
    ).toBe(0.65);

    expect(
      calculateSpySuccessChance({
        attackerSpyAgencyLevel: 20,
        defenderSpyAgencyLevel: 0,
        defenderSpyCount: 0,
      }),
    ).toBe(0.9);
  });

  it('calculates and clamps spy detection chance', () => {
    expect(
      calculateSpyDetectionChance({
        attackerSpyAgencyLevel: 2,
        defenderSpyAgencyLevel: 1,
        defenderSpyCount: 3,
      }),
    ).toBe(0.225);

    expect(
      calculateSpyDetectionChance({
        attackerSpyAgencyLevel: 50,
        defenderSpyAgencyLevel: 0,
        defenderSpyCount: 0,
      }),
    ).toBe(0.05);
  });

  it('applies faster spy travel with a minimum time', () => {
    expect(
      calculateSpyTravelTimeSeconds({
        normalTravelTimeSeconds: 200,
        spyTravelMultiplier: 0.8,
        minSpyTravelTimeSeconds: 60,
      }),
    ).toBe(160);

    expect(
      calculateSpyTravelTimeSeconds({
        normalTravelTimeSeconds: 20,
        spyTravelMultiplier: 0.8,
        minSpyTravelTimeSeconds: 60,
      }),
    ).toBe(60);
  });

  it('validates spy mission gates in priority order', () => {
    expect(
      canStartSpyMission({
        originHasSpyAgency: false,
        originSpyCount: 1,
        targetIsOwnedByAnotherPlayer: true,
        targetHasBeginnerProtection: false,
        cooldownActive: false,
      }),
    ).toMatchObject({ canStart: false, reason: expect.stringContaining('Spy Agency') });

    expect(
      canStartSpyMission({
        originHasSpyAgency: true,
        originSpyCount: 1,
        targetIsOwnedByAnotherPlayer: true,
        targetHasBeginnerProtection: false,
        cooldownActive: false,
      }),
    ).toEqual({ canStart: true });
  });

  it('generates approximate resource reports only', () => {
    const report = generateSpyReport({
      missionType: 'resource_report',
      targetCityName: 'Other City',
      wasSuccessful: true,
      wasDetected: false,
      spyLost: false,
      resources: {
        wood: 2534,
        gold: 48,
        marble: 0,
        wine: 401,
        crystal: 0,
        sulfur: 12,
      },
    });

    expect(report.title).toBe('Spy Report: Resources');
    expect(report.message).toContain('Wood: ~2,500');
    expect(report.message).toContain('Gold: Low');
    expect(report.message).not.toContain('2534');
  });
});
