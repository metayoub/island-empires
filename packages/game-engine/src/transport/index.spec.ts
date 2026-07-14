import {
  calculateTransportCapacity,
  calculateTransportLoad,
  calculateTransportTravelTimeSeconds,
  calculateTradeShipCount,
  calculateShipCapacity,
  calculateShipsRequired,
  canStartTransport,
} from './index';

describe('transport calculations', () => {
  it('calculates capacity from port level', () => {
    expect(calculateTransportCapacity({ portLevel: 0, capacityPerPortLevel: 500 })).toBe(0);
    expect(calculateTransportCapacity({ portLevel: 1, capacityPerPortLevel: 500 })).toBe(500);
    expect(calculateTransportCapacity({ portLevel: 3, capacityPerPortLevel: 500 })).toBe(1500);
  });

  it('calculates trade ships and ship capacity', () => {
    expect(calculateTradeShipCount({ portLevel: 0, shipsPerPortLevel: 1 })).toBe(0);
    expect(calculateTradeShipCount({ portLevel: 3, shipsPerPortLevel: 1 })).toBe(3);
    expect(calculateShipCapacity({ shipCapacity: 500 })).toBe(500);
    expect(calculateTransportCapacity({ shipCount: 3, shipCapacity: 500 })).toBe(1500);
    expect(calculateShipsRequired({ totalLoad: 501, shipCapacity: 500 })).toBe(2);
  });

  it('calculates total transport load', () => {
    expect(
      calculateTransportLoad({
        wood: 300,
        gold: 100,
        marble: 25,
        wine: 0,
        crystal: 0,
        sulfur: 0,
      }),
    ).toBe(425);
  });

  it('applies multiplier and minimum travel time', () => {
    expect(
      calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds: 0,
        transportTravelMultiplier: 1,
        minTravelTimeSeconds: 30,
      }),
    ).toBe(30);
    expect(
      calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds: 12,
        transportTravelMultiplier: 2,
        minTravelTimeSeconds: 30,
      }),
    ).toBe(30);
    expect(
      calculateTransportTravelTimeSeconds({
        normalTravelTimeSeconds: 90,
        transportTravelMultiplier: 1.5,
        minTravelTimeSeconds: 30,
      }),
    ).toBe(135);
  });

  it('validates port, city ownership, resources, and capacity', () => {
    expect(
      canStartTransport({
        originPortLevel: 0,
        originAndDestinationAreDifferent: true,
        destinationBelongsToPlayer: true,
        hasAtLeastOneResource: true,
        totalLoad: 100,
        capacity: 500,
        hasEnoughResources: true,
        availableShips: 1,
        shipsRequired: 1,
      }),
    ).toEqual({ canStart: false, reason: 'PORT_REQUIRED' });

    expect(
      canStartTransport({
        originPortLevel: 1,
        originAndDestinationAreDifferent: true,
        destinationBelongsToPlayer: true,
        hasAtLeastOneResource: true,
        totalLoad: 600,
        capacity: 500,
        hasEnoughResources: true,
        availableShips: 1,
        shipsRequired: 2,
      }),
    ).toEqual({ canStart: false, reason: 'NO_TRADE_SHIPS_AVAILABLE' });

    expect(
      canStartTransport({
        originPortLevel: 1,
        originAndDestinationAreDifferent: true,
        destinationBelongsToPlayer: true,
        hasAtLeastOneResource: true,
        totalLoad: 500,
        capacity: 500,
        hasEnoughResources: true,
        availableShips: 1,
        shipsRequired: 1,
      }),
    ).toEqual({ canStart: true });
  });
});
