import { MAP_CONFIG } from '@island-empires/config';
import { buildInitialIslands, ensureWorldMapGenerated } from './world-map-generation';

describe('world map generation', () => {
  it('builds a scattered archipelago with deterministic resources', () => {
    const islands = buildInitialIslands('world-1');

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
    expect(islands.some((island) => island.x < 100 && island.y > 500)).toBe(true);
    expect(islands.some((island) => island.x > 900 && island.y < 100)).toBe(true);
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
      findMany: jest.fn().mockResolvedValueOnce(legacyIslands).mockResolvedValueOnce(updatedIslands),
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
});
