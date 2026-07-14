export type MapCoordinate = {
  x: number;
  y: number;
};

export type CalculateMapDistanceInput = {
  from: MapCoordinate;
  to: MapCoordinate;
};

export function calculateMapDistance(input: CalculateMapDistanceInput): number {
  const xDistance = input.to.x - input.from.x;
  const yDistance = input.to.y - input.from.y;
  const distance = Math.sqrt(xDistance ** 2 + yDistance ** 2);

  return Math.round(distance * 100) / 100;
}
