import type { Prisma } from '@prisma/client';
import { MAP_CONFIG } from '@island-empires/config';

const LUXURY_RESOURCES = ['marble', 'wine', 'crystal', 'sulfur'] as const;

type WorldMapClient = Pick<Prisma.TransactionClient, 'island'>;

type ArchipelagoPoint = { x: number; y: number; name: string };

const CURATED_ARCHIPELAGO_POINTS: ArchipelagoPoint[] = [
  { x: 500, y: 340, name: 'New Haven Atoll' },
  { x: 122, y: 118, name: 'Olivewind Cay' },
  { x: 307, y: 87, name: 'Aster Shoal' },
  { x: 684, y: 92, name: 'Sunspire Isle' },
  { x: 872, y: 118, name: 'Pearlwatch' },
  { x: 205, y: 202, name: 'Cypress Hook' },
  { x: 420, y: 184, name: 'Marble Crown' },
  { x: 586, y: 214, name: 'Wineglass Isle' },
  { x: 777, y: 218, name: 'Lowtide Green' },
  { x: 102, y: 312, name: 'Saffron Reef' },
  { x: 306, y: 315, name: 'Harbor Mound' },
  { x: 701, y: 332, name: 'Crystal Fen' },
  { x: 910, y: 322, name: 'East Lantern' },
  { x: 158, y: 452, name: 'South Olive Key' },
  { x: 388, y: 438, name: 'Fisher Crown' },
  { x: 612, y: 456, name: 'Amber Coast' },
  { x: 829, y: 448, name: 'Sulfur Bluff' },
  { x: 264, y: 563, name: 'Moonwake Isle' },
  { x: 511, y: 582, name: 'Saltgarden' },
  { x: 735, y: 572, name: 'Dawnneedle' },
  { x: 939, y: 548, name: 'Mistral Rock' },
  { x: 61, y: 610, name: 'West Foam' },
  { x: 941, y: 52, name: 'Northglass' },
  { x: 52, y: 62, name: 'Old Sail Cay' },
  { x: 472, y: 56, name: 'Highwater Holm' },
  { x: 835, y: 618, name: 'Red Harbor' },
  { x: 75, y: 418, name: 'Turtle Sand' },
  { x: 955, y: 414, name: 'Far Beacon' },
  { x: 225, y: 35, name: 'Pine Needle' },
  { x: 636, y: 37, name: 'Blue Quarry' },
  { x: 347, y: 652, name: 'Lower Garland' },
  { x: 621, y: 642, name: 'Deepwine Cay' },
  { x: 156, y: 666, name: 'Last Current' },
  { x: 970, y: 666, name: 'Outer Gate' },
  { x: 26, y: 232, name: 'Foamwatch' },
  { x: 973, y: 232, name: 'Bright Spur' },
  { x: 352, y: 220, name: 'Inner Shell' },
  { x: 647, y: 283, name: 'Caldera Green' },
  { x: 450, y: 508, name: 'Sage Landing' },
  { x: 560, y: 128, name: 'Goldcrest' },
  { x: 238, y: 410, name: 'Vineyard Strand' },
  { x: 790, y: 86, name: 'Whitecap Rise' },
];

const GENERATED_NAME_PREFIXES = [
  'Azure',
  'Bright',
  'Cinder',
  'Coral',
  'Dawn',
  'Deep',
  'Emerald',
  'Far',
  'Golden',
  'Green',
  'Harbor',
  'Ivory',
  'Jade',
  'Lagoon',
  'Misty',
  'North',
  'Opal',
  'Palm',
  'Quiet',
  'Ruby',
  'Salt',
  'Silver',
  'Storm',
  'Sun',
  'Tide',
  'Verdant',
  'White',
  'Wind',
] as const;

const GENERATED_NAME_SUFFIXES = [
  'Atoll',
  'Cay',
  'Coast',
  'Crown',
  'Fen',
  'Harbor',
  'Holm',
  'Isle',
  'Key',
  'Lagoon',
  'Mound',
  'Needle',
  'Reef',
  'Rise',
  'Rock',
  'Shoal',
  'Spur',
  'Strand',
  'Watch',
  'Way',
] as const;

function halton(index: number, base: number): number {
  let result = 0;
  let fraction = 1 / base;
  let current = index;

  while (current > 0) {
    result += fraction * (current % base);
    current = Math.floor(current / base);
    fraction /= base;
  }

  return result;
}

function getGeneratedIslandName(index: number): string {
  const prefix = GENERATED_NAME_PREFIXES[index % GENERATED_NAME_PREFIXES.length];
  const suffix =
    GENERATED_NAME_SUFFIXES[
      Math.floor(index / GENERATED_NAME_PREFIXES.length) % GENERATED_NAME_SUFFIXES.length
    ];

  return `${prefix}${suffix}`;
}

function hasNearbyPoint(points: ArchipelagoPoint[], x: number, y: number, minDistance: number): boolean {
  const minDistanceSquared = minDistance * minDistance;

  return points.some((point) => {
    const deltaX = point.x - x;
    const deltaY = point.y - y;
    return deltaX * deltaX + deltaY * deltaY < minDistanceSquared;
  });
}

function buildArchipelagoPoints(targetCount: number): ArchipelagoPoint[] {
  const points = CURATED_ARCHIPELAGO_POINTS.slice(0, targetCount);
  const occupiedCoordinates = new Set(points.map((point) => `${point.x}:${point.y}`));
  let candidateIndex = 1;
  let generatedIndex = 0;

  while (points.length < targetCount) {
    const minDistance = points.length < 72 ? 42 : 30;
    const x = 24 + Math.round(halton(candidateIndex, 2) * (MAP_CONFIG.width - 48));
    const y = 24 + Math.round(halton(candidateIndex, 3) * (MAP_CONFIG.height - 48));
    const coordinateKey = `${x}:${y}`;
    candidateIndex += 1;

    if (occupiedCoordinates.has(coordinateKey) || hasNearbyPoint(points, x, y, minDistance)) {
      continue;
    }

    occupiedCoordinates.add(coordinateKey);
    points.push({
      x,
      y,
      name: getGeneratedIslandName(generatedIndex),
    });
    generatedIndex += 1;
  }

  return points;
}

const ARCHIPELAGO_POINTS = buildArchipelagoPoints(MAP_CONFIG.islandCount);

export async function ensureWorldMapGenerated(
  client: WorldMapClient,
  worldId: string,
): Promise<void> {
  const existingIslandCount = await client.island.count({ where: { worldId } });

  if (existingIslandCount > 0) {
    await backfillArchipelago(client, worldId);
    return;
  }

  await client.island.createMany({
    data: buildInitialIslands(worldId),
    skipDuplicates: true,
  });
}

export function buildInitialIslands(worldId: string) {
  return ARCHIPELAGO_POINTS.slice(0, MAP_CONFIG.islandCount).map((point, index) =>
    buildIsland(worldId, point, index),
  );
}

function buildIsland(
  worldId: string,
  point: { x: number; y: number; name: string },
  index: number,
) {
  return {
    worldId,
    x: point.x,
    y: point.y,
    name: point.name,
    mainResource: 'wood',
    luxuryResource: LUXURY_RESOURCES[(index * 3 + point.x + point.y) % LUXURY_RESOURCES.length],
    maxSlots: MAP_CONFIG.defaultIslandSlots,
  };
}

async function backfillArchipelago(client: WorldMapClient, worldId: string): Promise<void> {
  const existingIslands = await client.island.findMany({
    where: { worldId },
    orderBy: [{ y: 'asc' }, { x: 'asc' }],
  });

  const isLegacyGrid =
    existingIslands.length > 0 &&
    existingIslands.length <= 25 &&
    existingIslands.every((island) => island.x < 10 && island.y < 10);

  if (isLegacyGrid) {
    await Promise.all(
      existingIslands.map((island, index) => {
        const point = ARCHIPELAGO_POINTS[index];
        return client.island.update({
          where: { id: island.id },
          data: {
            x: point.x,
            y: point.y,
            name: point.name,
            luxuryResource: LUXURY_RESOURCES[(index * 3 + point.x + point.y) % LUXURY_RESOURCES.length],
          },
        });
      }),
    );
  }

  const existingAfterBackfill = await client.island.findMany({
    where: { worldId },
    orderBy: [{ y: 'asc' }, { x: 'asc' }],
  });
  const occupiedCoordinates = new Set(
    existingAfterBackfill.map((island) => `${island.x}:${island.y}`),
  );
  const missingIslands = ARCHIPELAGO_POINTS.slice(0, MAP_CONFIG.islandCount)
    .filter((point) => !occupiedCoordinates.has(`${point.x}:${point.y}`))
    .map((point, index) => buildIsland(worldId, point, existingAfterBackfill.length + index));

  if (missingIslands.length > 0) {
    await client.island.createMany({
      data: missingIslands,
      skipDuplicates: true,
    });
  }
}

export function getArchipelagoPoints() {
  return ARCHIPELAGO_POINTS.slice(0, MAP_CONFIG.islandCount);
}

export function buildLegacyGridIslands(worldId: string) {
  const islands: Array<{
    worldId: string;
    x: number;
    y: number;
    name: string;
    mainResource: string;
    luxuryResource: string;
    maxSlots: number;
  }> = [];

  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      islands.push({
        worldId,
        x,
        y,
        name: `Island ${x}:${y}`,
        mainResource: 'wood',
        luxuryResource: LUXURY_RESOURCES[(x + y) % LUXURY_RESOURCES.length],
        maxSlots: MAP_CONFIG.defaultIslandSlots,
      });
    }
  }

  return islands;
}
