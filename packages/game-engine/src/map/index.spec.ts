import { calculateMapDistance, calculateTravelTimeSeconds } from './index';

describe('map calculations', () => {
  it('returns 0 for the same coordinate', () => {
    expect(calculateMapDistance({ from: { x: 2, y: 2 }, to: { x: 2, y: 2 } })).toBe(0);
  });

  it('returns 1 for adjacent islands', () => {
    expect(calculateMapDistance({ from: { x: 2, y: 2 }, to: { x: 2, y: 3 } })).toBe(1);
  });

  it('returns rounded diagonal distance', () => {
    expect(calculateMapDistance({ from: { x: 0, y: 0 }, to: { x: 1, y: 1 } })).toBe(1.41);
  });

  it('uses distance for travel time', () => {
    expect(
      calculateTravelTimeSeconds({
        distance: 2,
        baseSecondsPerDistance: 300,
        worldSpeed: 1,
      }),
    ).toBe(600);
  });

  it('uses world speed for travel time', () => {
    expect(
      calculateTravelTimeSeconds({
        distance: 2,
        baseSecondsPerDistance: 300,
        worldSpeed: 2,
      }),
    ).toBe(300);
  });

  it('respects minimum travel time', () => {
    expect(
      calculateTravelTimeSeconds({
        distance: 0.01,
        baseSecondsPerDistance: 300,
        worldSpeed: 10,
      }),
    ).toBe(10);
  });

  it('returns 0 travel time for distance 0', () => {
    expect(
      calculateTravelTimeSeconds({
        distance: 0,
        baseSecondsPerDistance: 300,
        worldSpeed: 1,
      }),
    ).toBe(0);
  });

  it('falls back to world speed 1 when speed is invalid', () => {
    expect(
      calculateTravelTimeSeconds({
        distance: 1,
        baseSecondsPerDistance: 300,
        worldSpeed: 0,
      }),
    ).toBe(300);
  });
});
