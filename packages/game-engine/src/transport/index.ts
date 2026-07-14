export type ResourceAmount = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export type TransportResourcePayload = ResourceAmount;

export type TransportValidationResult = {
  canStart: boolean;
  reason?: string;
};

export type TransportRequirementResult = {
  canTransport: boolean;
  reason?: string;
};

export function calculateTradeShipCount(input: {
  portLevel: number;
  shipsPerPortLevel: number;
}): number {
  return Math.max(0, Math.floor(input.portLevel)) * Math.max(0, Math.floor(input.shipsPerPortLevel));
}

export function calculateShipCapacity(input: { shipCapacity: number }): number {
  return Math.max(0, Math.floor(input.shipCapacity));
}

export function calculateTransportCapacity(input: {
  portLevel?: number;
  capacityPerPortLevel?: number;
  shipCount?: number;
  shipCapacity?: number;
}): number {
  if (input.shipCount !== undefined || input.shipCapacity !== undefined) {
    return Math.max(0, Math.floor(input.shipCount ?? 0)) * Math.max(0, Math.floor(input.shipCapacity ?? 0));
  }

  return Math.max(0, Math.floor(input.portLevel ?? 0)) * Math.max(0, input.capacityPerPortLevel ?? 0);
}

export function calculateShipsRequired(input: {
  totalLoad: number;
  shipCapacity: number;
}): number {
  if (input.totalLoad <= 0 || input.shipCapacity <= 0) {
    return 0;
  }

  return Math.ceil(input.totalLoad / input.shipCapacity);
}

export function calculateTransportLoad(resources: ResourceAmount): number {
  return resources.wood + resources.gold + resources.marble + resources.wine + resources.crystal + resources.sulfur;
}

export function getTransportPayloadTotal(payload: ResourceAmount): number {
  return calculateTransportLoad(payload);
}

export function calculateTransportTravelTimeSeconds(input: {
  normalTravelTimeSeconds: number;
  transportTravelMultiplier: number;
  minTravelTimeSeconds: number;
}): number {
  const multiplied = Math.floor(Math.max(0, input.normalTravelTimeSeconds) * input.transportTravelMultiplier);
  return Math.max(input.minTravelTimeSeconds, multiplied);
}

export function canStartTransport(input: {
  originPortLevel: number;
  originAndDestinationAreDifferent: boolean;
  destinationBelongsToPlayer: boolean;
  hasAtLeastOneResource: boolean;
  totalLoad: number;
  capacity: number;
  hasEnoughResources: boolean;
  availableShips?: number;
  shipsRequired?: number;
}): TransportValidationResult {
  if (input.originPortLevel < 1) {
    return { canStart: false, reason: 'PORT_REQUIRED' };
  }
  if (!input.originAndDestinationAreDifferent) {
    return { canStart: false, reason: 'SAME_CITY_TRANSPORT' };
  }
  if (!input.destinationBelongsToPlayer) {
    return { canStart: false, reason: 'DESTINATION_CITY_NOT_OWNED' };
  }
  if (!input.hasAtLeastOneResource) {
    return { canStart: false, reason: 'NO_RESOURCES_SELECTED' };
  }
  if (input.availableShips !== undefined && input.availableShips < 1) {
    return { canStart: false, reason: 'NO_TRADE_SHIPS_AVAILABLE' };
  }
  if (
    input.availableShips !== undefined &&
    input.shipsRequired !== undefined &&
    input.shipsRequired > input.availableShips
  ) {
    return { canStart: false, reason: 'NO_TRADE_SHIPS_AVAILABLE' };
  }
  if (input.totalLoad > input.capacity) {
    return { canStart: false, reason: 'TRANSPORT_CAPACITY_EXCEEDED' };
  }
  if (!input.hasEnoughResources) {
    return { canStart: false, reason: 'NOT_ENOUGH_RESOURCES' };
  }

  return { canStart: true };
}

export function canTransportResources(input: {
  originCityId: string;
  destinationCityId: string;
  payloadTotal: number;
  availableCapacity: number;
  hasEnoughResources: boolean;
  hasAvailableShips: boolean;
}): TransportRequirementResult {
  const result = canStartTransport({
    originPortLevel: input.hasAvailableShips ? 1 : 0,
    originAndDestinationAreDifferent: input.originCityId !== input.destinationCityId,
    destinationBelongsToPlayer: true,
    hasAtLeastOneResource: input.payloadTotal > 0,
    totalLoad: input.payloadTotal,
    capacity: input.availableCapacity,
    hasEnoughResources: input.hasEnoughResources,
    availableShips: input.hasAvailableShips ? 1 : 0,
  });

  return { canTransport: result.canStart, reason: result.reason };
}
