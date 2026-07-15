import type { Prisma } from '@prisma/client';
import { MAP_CONFIG } from '@island-empires/config';

const LUXURY_RESOURCES = ['marble', 'wine', 'crystal', 'sulfur'] as const;

type WorldMapClient = Pick<Prisma.TransactionClient, 'island'>;

type ArchipelagoPoint = { x: number; y: number; name: string };
type WorldMapDimensions = { width: number; height: number };
type GridLayout = WorldMapDimensions & {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
};

const BASE_MAP_WIDTH = 1000;
const BASE_MAP_HEIGHT = 680;
const PREVIOUS_MAP_SIZES = [
  { width: 1000, height: 680 },
  { width: 5000, height: 3400 },
  { width: 15000, height: 10200 },
  { width: 50000, height: 34000 },
] as const;
const MIN_DISTANCE_SCALE = 0.038;
const MIN_VISUAL_HORIZONTAL_FACTOR = 1.4;
const MIN_VISUAL_VERTICAL_FACTOR = 0.55;
const GRID_PADDING = 2200;
const GRID_CELL_WIDTH = 2200;
const GRID_CELL_HEIGHT = 1200;
const GRID_JITTER_X = 260;
const GRID_JITTER_Y = 120;

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

function getGeneratedIslandName(index: number): string {
  const prefix = GENERATED_NAME_PREFIXES[index % GENERATED_NAME_PREFIXES.length];
  const suffix =
    GENERATED_NAME_SUFFIXES[
      Math.floor(index / GENERATED_NAME_PREFIXES.length) % GENERATED_NAME_SUFFIXES.length
    ];

  return `${prefix}${suffix}`;
}

function scaleBaseCoordinate(value: number, baseSize: number, targetSize: number): number {
  return Math.round((value / baseSize) * targetSize);
}

function scaleCuratedPoint(point: ArchipelagoPoint): ArchipelagoPoint {
  return {
    ...point,
    x: scaleBaseCoordinate(point.x, BASE_MAP_WIDTH, getWorldMapDimensions().width),
    y: scaleBaseCoordinate(point.y, BASE_MAP_HEIGHT, getWorldMapDimensions().height),
  };
}

function getPreviousMapSize(point: { x: number; y: number }) {
  const currentDimensions = getWorldMapDimensions();

  return PREVIOUS_MAP_SIZES.find(
    (size) =>
      currentDimensions.width > size.width &&
      currentDimensions.height > size.height &&
      point.x <= size.width &&
      point.y <= size.height,
  );
}

function isPreviousMapCoordinate(point: { x: number; y: number }): boolean {
  return Boolean(getPreviousMapSize(point));
}

function getMinimumIslandDistance(): number {
  return Math.max(900, Math.round(Math.min(getWorldMapDimensions().width, getWorldMapDimensions().height) * 0.012));
}

function conflictsWithPoint(
  point: { x: number; y: number },
  candidate: { x: number; y: number },
  minDistance: number,
): boolean {
  const deltaX = Math.abs(point.x - candidate.x);
  const deltaY = Math.abs(point.y - candidate.y);
  const minDistanceSquared = minDistance * minDistance;
  const minVisualHorizontal = minDistance * MIN_VISUAL_HORIZONTAL_FACTOR;
  const minVisualVertical = minDistance * MIN_VISUAL_VERTICAL_FACTOR;

  return (
    deltaX * deltaX + deltaY * deltaY < minDistanceSquared ||
    (deltaX < minVisualHorizontal && deltaY < minVisualVertical)
  );
}

function hasConflictingPoint(
  points: Array<{ x: number; y: number }>,
  x: number,
  y: number,
  minDistance: number,
): boolean {
  return points.some((point) => conflictsWithPoint(point, { x, y }, minDistance));
}

function getStableNumber(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getGridLayout(targetCount: number = MAP_CONFIG.islandCount): GridLayout {
  const capacityCount = targetCount + Math.ceil(Math.sqrt(targetCount)) * 4;
  const aspectRatio = MAP_CONFIG.width / MAP_CONFIG.height;
  const columns = Math.max(1, Math.ceil(Math.sqrt(capacityCount * aspectRatio)));
  const rows = Math.max(1, Math.ceil(capacityCount / columns));

  return {
    columns,
    rows,
    cellWidth: GRID_CELL_WIDTH,
    cellHeight: GRID_CELL_HEIGHT,
    width: Math.max(MAP_CONFIG.width, GRID_PADDING * 2 + (columns - 1) * GRID_CELL_WIDTH),
    height: Math.max(MAP_CONFIG.height, GRID_PADDING * 2 + (rows - 1) * GRID_CELL_HEIGHT),
  };
}

export function getWorldMapDimensions(targetCount: number = MAP_CONFIG.islandCount): WorldMapDimensions {
  const { width, height } = getGridLayout(targetCount);

  return { width, height };
}

function getGridPoint({
  column,
  row,
  index,
  name,
  layout,
}: {
  column: number;
  row: number;
  index: number;
  name: string;
  layout: GridLayout;
}): ArchipelagoPoint {
  const seed = getStableNumber(`${index}:${name}:${column}:${row}`);
  const jitterX = index === 0 ? 0 : (seed % (GRID_JITTER_X * 2 + 1)) - GRID_JITTER_X;
  const jitterY =
    index === 0 ? 0 : (Math.floor(seed / 997) % (GRID_JITTER_Y * 2 + 1)) - GRID_JITTER_Y;

  return {
    name,
    x: Math.round(GRID_PADDING + column * layout.cellWidth + jitterX),
    y: Math.round(GRID_PADDING + row * layout.cellHeight + jitterY),
  };
}

function buildArchipelagoPoints(targetCount: number): ArchipelagoPoint[] {
  const layout = getGridLayout(targetCount);
  const centerColumn = Math.floor(layout.columns / 2);
  const centerRow = Math.floor(layout.rows / 2);
  const cells = Array.from({ length: layout.columns * layout.rows }, (_, index) => {
    const column = index % layout.columns;
    const row = Math.floor(index / layout.columns);

    return {
      column,
      row,
      distanceFromCenter:
        Math.abs(column - centerColumn) + Math.abs(row - centerRow),
      tieBreaker: getStableNumber(`${column}:${row}`),
    };
  }).sort((left, right) => {
    const distanceDelta = left.distanceFromCenter - right.distanceFromCenter;
    if (distanceDelta !== 0) {
      return distanceDelta;
    }

    return left.tieBreaker - right.tieBreaker;
  });

  const points: ArchipelagoPoint[] = [{
    name: CURATED_ARCHIPELAGO_POINTS[0]?.name ?? getGeneratedIslandName(0),
    x: MAP_CONFIG.startingIsland.x,
    y: MAP_CONFIG.startingIsland.y,
  }];
  const minDistance = getMinimumIslandDistance();

  for (const cell of cells) {
    if (points.length >= targetCount) {
      break;
    }

    const index = points.length;
    const candidate = getGridPoint({
      ...cell,
      index,
      layout,
      name:
        index < CURATED_ARCHIPELAGO_POINTS.length
          ? CURATED_ARCHIPELAGO_POINTS[index].name
          : getGeneratedIslandName(index - CURATED_ARCHIPELAGO_POINTS.length),
    });

    if (hasConflictingPoint(points, candidate.x, candidate.y, minDistance)) {
      continue;
    }

    points.push(candidate);
  }

  if (points.length < targetCount) {
    throw new Error(
      `Unable to generate ${targetCount} non-overlapping islands in ${layout.width}x${layout.height}.`,
    );
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

  const previousMapIslands = isLegacyGrid
    ? []
    : existingIslands.filter((island) => isPreviousMapCoordinate(island));

  if (previousMapIslands.length > 0) {
    const occupiedCoordinates = new Set(
      existingIslands.map((island) => `${island.x}:${island.y}`),
    );
    let fallbackPointIndex = 0;

    for (const island of previousMapIslands) {
      const previousMapSize = getPreviousMapSize(island);

      if (!previousMapSize) {
        continue;
      }

      occupiedCoordinates.delete(`${island.x}:${island.y}`);
      let targetX = scaleBaseCoordinate(island.x, previousMapSize.width, MAP_CONFIG.width);
      let targetY = scaleBaseCoordinate(island.y, previousMapSize.height, MAP_CONFIG.height);
      let coordinateKey = `${targetX}:${targetY}`;

      while (occupiedCoordinates.has(coordinateKey)) {
        const fallbackPoint = ARCHIPELAGO_POINTS[fallbackPointIndex];
        fallbackPointIndex += 1;
        targetX = fallbackPoint.x;
        targetY = fallbackPoint.y;
        coordinateKey = `${targetX}:${targetY}`;
      }

      occupiedCoordinates.add(coordinateKey);

      await client.island.update({
        where: { id: island.id },
        data: {
          x: targetX,
          y: targetY,
        },
      });
    }
  }

  await repairCrowdedIslands(client, worldId);

  const existingAfterBackfill = await client.island.findMany({
    where: { worldId },
    orderBy: [{ y: 'asc' }, { x: 'asc' }],
  });
  const occupiedCoordinates = new Set(
    existingAfterBackfill.map((island) => `${island.x}:${island.y}`),
  );
  const occupiedNames = new Set(
    existingAfterBackfill.map((island) => island.name).filter((name): name is string => Boolean(name)),
  );
  const missingIslands = ARCHIPELAGO_POINTS.slice(0, MAP_CONFIG.islandCount)
    .filter(
      (point) =>
        !occupiedCoordinates.has(`${point.x}:${point.y}`) && !occupiedNames.has(point.name),
    )
    .map((point, index) => buildIsland(worldId, point, existingAfterBackfill.length + index));

  if (missingIslands.length > 0) {
    await client.island.createMany({
      data: missingIslands,
      skipDuplicates: true,
    });
  }
}

async function repairCrowdedIslands(client: WorldMapClient, worldId: string): Promise<void> {
  const islands = await client.island.findMany({
    where: { worldId },
    orderBy: [{ y: 'asc' }, { x: 'asc' }],
  });
  const minDistance = getMinimumIslandDistance();
  const occupiedCoordinates = new Set(islands.map((island) => `${island.x}:${island.y}`));
  const acceptedPoints: Array<{ x: number; y: number }> = [];
  let fallbackPointIndex = 0;

  for (const island of islands) {
    const originalCoordinateKey = `${island.x}:${island.y}`;
    const needsRepair = acceptedPoints.some((point) =>
      conflictsWithPoint(point, island, minDistance),
    );

    if (!needsRepair) {
      acceptedPoints.push({ x: island.x, y: island.y });
      continue;
    }

    occupiedCoordinates.delete(originalCoordinateKey);

    let fallbackPoint = ARCHIPELAGO_POINTS[fallbackPointIndex];
    while (
      fallbackPoint &&
      (occupiedCoordinates.has(`${fallbackPoint.x}:${fallbackPoint.y}`) ||
        hasConflictingPoint(acceptedPoints, fallbackPoint.x, fallbackPoint.y, minDistance))
    ) {
      fallbackPointIndex += 1;
      fallbackPoint = ARCHIPELAGO_POINTS[fallbackPointIndex];
    }

    if (!fallbackPoint) {
      occupiedCoordinates.add(originalCoordinateKey);
      acceptedPoints.push({ x: island.x, y: island.y });
      continue;
    }

    await client.island.update({
      where: { id: island.id },
      data: {
        x: fallbackPoint.x,
        y: fallbackPoint.y,
      },
    });

    occupiedCoordinates.add(`${fallbackPoint.x}:${fallbackPoint.y}`);
    acceptedPoints.push({ x: fallbackPoint.x, y: fallbackPoint.y });
    fallbackPointIndex += 1;
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
