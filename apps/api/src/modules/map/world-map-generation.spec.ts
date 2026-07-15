import { MAP_CONFIG } from '@island-empires/config';
import { buildInitialIslands, ensureWorldMapGenerated, getWorldMapDimensions } from './world-map-generation';

describe('world map generation', () => {
  it('builds a scattered archipelago with deterministic resources', () => {
    const islands = buildInitialIslands('world-1');
    const mapDimensions = getWorldMapDimensions();
    const minimumDistance = islands.reduce((closestDistance, island, islandIndex) => {
      const nextClosestDistance = islands
        .slice(islandIndex + 1)
        .reduce((closestForIsland, candidate) => {
          const deltaX = island.x - candidate.x;
          const deltaY = island.y - candidate.y;
          return Math.min(closestForIsland, Math.hypot(deltaX, deltaY));
        }, Number.POSITIVE_INFINITY);

      return Math.min(closestDistance, nextClosestDistance);
    }, Number.POSITIVE_INFINITY);
    const visuallyOverlappingPair = islands.some((island, islandIndex) =>
      islands.slice(islandIndex + 1).some((candidate) => {
        const deltaX = Math.abs(island.x - candidate.x);
        const deltaY = Math.abs(island.y - candidate.y);
        return deltaX < 1260 && deltaY < 495;
      }),
    );

    expect(islands).toHaveLength(MAP_CONFIG.islandCount);
    expect(islands[0]).toMatchObject({
      worldId: 'world-1',
      x: MAP_CONFIG.startingIsland.x,
      y: MAP_CONFIG.startingIsland.y,
      mainResource: 'wood',
      luxuryResource: 'marble',
      maxSlots: MAP_CONFIG.defaultIslandSlots,
    });
    expect(new Set(islands.map((island) => `${island.x}:${island.y}`)).size).toBe(islands.length);
    expect(minimumDistance).toBeGreaterThanOrEqual(900);
    expect(visuallyOverlappingPair).toBe(false);
    expect(mapDimensions.width).toBeGreaterThanOrEqual(MAP_CONFIG.width);
    expect(mapDimensions.height).toBeGreaterThanOrEqual(MAP_CONFIG.height);
    expect(islands.every((island) => island.x >= 0 && island.x <= mapDimensions.width)).toBe(true);
    expect(islands.every((island) => island.y >= 0 && island.y <= mapDimensions.height)).toBe(true);
  });

  it('creates islands when a world has no islands', async () => {
    const island = {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: MAP_CONFIG.islandCount }),
    };

    await ensureWorldMapGenerated({ island } as never, 'world-1');

    expect(island.createMany).toHaveBeenCalledTimes(1);
    expect(island.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ x: MAP_CONFIG.startingIsland.x, y: MAP_CONFIG.startingIsland.y }),
      ]),
      skipDuplicates: true,
    });
  });

  it('expands map dimensions as island count increases', () => {
    const baseDimensions = getWorldMapDimensions(100);
    const expandedDimensions = getWorldMapDimensions(10_000);

    expect(baseDimensions.width).toBeGreaterThanOrEqual(MAP_CONFIG.width);
    expect(baseDimensions.height).toBeGreaterThanOrEqual(MAP_CONFIG.height);
    expect(expandedDimensions.width).toBeGreaterThan(baseDimensions.width);
    expect(expandedDimensions.height).toBeGreaterThan(baseDimensions.height);
  });

  it('backfills a legacy 5 x 5 world into the scattered archipelago', async () => {
    const legacyIslands = Array.from({ length: 25 }, (_, index) => ({
      id: `island-${index}`,
      worldId: 'world-1',
      x: index % 5,
      y: Math.floor(index / 5),
      name: `Island ${index % 5}:${Math.floor(index / 5)}`,
      mainResource: 'wood',
      luxuryResource: 'marble',
      maxSlots: MAP_CONFIG.defaultIslandSlots,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    const updatedIslands = buildInitialIslands('world-1').slice(0, 25).map((island, index) => ({
      ...legacyIslands[index],
      ...island,
    }));
    const island = {
      count: jest.fn().mockResolvedValue(25),
      findMany: jest
        .fn()
        .mockResolvedValueOnce(legacyIslands)
        .mockResolvedValueOnce(updatedIslands)
        .mockResolvedValueOnce(updatedIslands),
      update: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: MAP_CONFIG.islandCount - 25 }),
    };

    await ensureWorldMapGenerated({ island } as never, 'world-1');

    expect(island.update).toHaveBeenCalledTimes(25);
    expect(island.update).toHaveBeenCalledWith({
      where: { id: 'island-0' },
      data: expect.objectContaining({
        x: MAP_CONFIG.startingIsland.x,
        y: MAP_CONFIG.startingIsland.y,
      }),
    });
    expect(island.createMany).toHaveBeenCalledWith({
      data: expect.any(Array),
      skipDuplicates: true,
    });
  });

  it('scales previous-map islands into the larger world before adding missing islands', async () => {
    const previousArchipelago = [
      {
        id: 'island-0',
        worldId: 'world-1',
        x: 500,
        y: 340,
        name: 'New Haven Atoll',
        mainResource: 'wood',
        luxuryResource: 'marble',
        maxSlots: MAP_CONFIG.defaultIslandSlots,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'island-1',
        worldId: 'world-1',
        x: 560,
        y: 128,
        name: 'Goldcrest',
        mainResource: 'wood',
        luxuryResource: 'wine',
        maxSlots: MAP_CONFIG.defaultIslandSlots,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'island-2',
        worldId: 'world-1',
        x: 72000,
        y: 28000,
        name: 'Already Scaled',
        mainResource: 'wood',
        luxuryResource: 'crystal',
        maxSlots: MAP_CONFIG.defaultIslandSlots,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const scaledArchipelago = previousArchipelago.map((island) => {
      if (island.id === 'island-0') {
        return {
          ...island,
          x: Math.round((122 / 1000) * MAP_CONFIG.width),
          y: Math.round((118 / 680) * MAP_CONFIG.height),
        };
      }

      return island.x <= 1000 && island.y <= 680
        ? {
            ...island,
            x: Math.round((island.x / 1000) * MAP_CONFIG.width),
            y: Math.round((island.y / 680) * MAP_CONFIG.height),
          }
        : island;
    });
    const island = {
      count: jest.fn().mockResolvedValue(previousArchipelago.length),
      findMany: jest
        .fn()
        .mockResolvedValueOnce(previousArchipelago)
        .mockResolvedValueOnce(scaledArchipelago)
        .mockResolvedValueOnce(scaledArchipelago),
      update: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: MAP_CONFIG.islandCount - previousArchipelago.length }),
    };

    await ensureWorldMapGenerated({ island } as never, 'world-1');

    expect(island.update).toHaveBeenCalledTimes(2);
    const firstIslandUpdate = island.update.mock.calls.find(
      ([call]) => call.where.id === 'island-0',
    )?.[0];
    expect(firstIslandUpdate).toEqual({
      where: { id: 'island-0' },
      data: expect.objectContaining({
        x: MAP_CONFIG.startingIsland.x,
        y: MAP_CONFIG.startingIsland.y,
      }),
    });
    expect(island.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'island-2' } }),
    );
    expect(island.createMany).toHaveBeenCalledWith({
      data: expect.any(Array),
      skipDuplicates: true,
    });
    expect(island.createMany.mock.calls[0][0].data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'New Haven Atoll' })]),
    );
  });
});
