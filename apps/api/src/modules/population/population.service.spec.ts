import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { PopulationService } from './population.service';

const CITY_ID = 'city-1';
const HOUR_MS = 1000 * 60 * 60;

function buildFakePrisma(overrides?: {
  population?: number;
  populationCapacity?: number;
  happiness?: number;
  populationLastCalculatedAt?: Date;
  cityHallLevel?: number;
  tavernLevel?: number;
  hospitalLevel?: number;
  woodWorkers?: number;
  goldWorkers?: number;
  luxuryWorkers?: number;
}) {
  const state = {
    city: {
      id: CITY_ID,
      population: overrides?.population ?? 50,
      populationCapacity: overrides?.populationCapacity ?? 100,
      happiness: overrides?.happiness ?? 100,
      populationLastCalculatedAt:
        overrides?.populationLastCalculatedAt ?? new Date(Date.now() - HOUR_MS),
    },
    cityHall: { level: overrides?.cityHallLevel ?? 1 },
    tavern: { level: overrides?.tavernLevel ?? 0 },
    hospital: { level: overrides?.hospitalLevel ?? 0 },
    assignment: {
      cityId: CITY_ID,
      woodWorkers: overrides?.woodWorkers ?? 5,
      goldWorkers: overrides?.goldWorkers ?? 5,
      luxuryWorkers: overrides?.luxuryWorkers ?? 0,
      scientists: 0,
      idleCitizens: 40,
    },
  };

  const tx = {
    city: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.city)),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockImplementation(({ data }) => {
        state.city = { ...state.city, ...data };
        return Promise.resolve(state.city);
      }),
    },
    cityBuilding: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const buildingType = where.cityId_buildingType.buildingType;

        if (buildingType === 'city_hall') return Promise.resolve(state.cityHall);
        if (buildingType === 'tavern') return Promise.resolve(state.tavern);
        if (buildingType === 'hospital') return Promise.resolve(state.hospital);
        return Promise.resolve(null);
      }),
    },
    cityWorkerAssignment: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.assignment)),
      update: jest.fn().mockImplementation(({ data }) => {
        state.assignment = { ...state.assignment, ...data };
        return Promise.resolve(state.assignment);
      }),
    },
  };

  const prisma = {
    $transaction: jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => unknown) => callback(tx)),
  };

  return { prisma, state };
}

describe('PopulationService', () => {
  async function createService(prisma: unknown): Promise<PopulationService> {
    const moduleRef = await Test.createTestingModule({
      providers: [PopulationService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    return moduleRef.get(PopulationService);
  }

  it('recalculates population after elapsed time', async () => {
    const { prisma } = buildFakePrisma({
      populationLastCalculatedAt: new Date(Date.now() - HOUR_MS),
    });
    const service = await createService(prisma);

    const result = await service.recalculatePopulation(CITY_ID);

    expect(result.population.current).toBeGreaterThanOrEqual(52);
    expect(result.population.capacity).toBe(100);
    expect(result.citizens.idleCitizens).toBeGreaterThanOrEqual(42);
  });

  it('does not exceed population capacity', async () => {
    const { prisma } = buildFakePrisma({
      population: 99,
      populationLastCalculatedAt: new Date(Date.now() - HOUR_MS * 3),
    });
    const service = await createService(prisma);

    const result = await service.recalculatePopulation(CITY_ID);

    expect(result.population.current).toBe(100);
    expect(result.population.isAtCapacity).toBe(true);
  });

  it('updates populationLastCalculatedAt', async () => {
    const lastCalculatedAt = new Date(Date.now() - HOUR_MS);
    const { prisma } = buildFakePrisma({ populationLastCalculatedAt: lastCalculatedAt });
    const service = await createService(prisma);

    const result = await service.recalculatePopulation(CITY_ID);

    expect(new Date(result.population.lastCalculatedAt).getTime()).toBeGreaterThan(
      lastCalculatedAt.getTime(),
    );
  });

  it('uses City Hall level for capacity', async () => {
    const { prisma } = buildFakePrisma({ cityHallLevel: 2 });
    const service = await createService(prisma);

    const result = await service.recalculatePopulation(CITY_ID);

    expect(result.population.capacity).toBe(150);
  });

  it('uses Tavern level for happiness', async () => {
    const { prisma } = buildFakePrisma({ tavernLevel: 1 });
    const service = await createService(prisma);

    const result = await service.recalculatePopulation(CITY_ID);

    expect(result.happiness.tavernBonus).toBe(10);
    expect(result.happiness.value).toBe(110);
  });

  it('uses Hospital level for health support, pressure relief, and growth', async () => {
    const { prisma } = buildFakePrisma({
      population: 90,
      populationLastCalculatedAt: new Date(Date.now() - HOUR_MS),
      hospitalLevel: 5,
    });
    const service = await createService(prisma);

    const result = await service.recalculatePopulation(CITY_ID);

    expect(result.happiness.healthSupport).toBe(20);
    expect(result.happiness.healthPressureRelief).toBe(5);
    expect(result.happiness.healthGrowthBonusPercent).toBe(10);
    expect(result.happiness.populationPressure).toBeLessThan(20);
    expect(result.population.growthPerHour).toBeGreaterThan(1.6);
  });

  it('validates worker assignment against current population', async () => {
    const { prisma } = buildFakePrisma();
    const service = await createService(prisma);

    await expect(
      service.assertWorkerAssignmentAllowed({
        population: 10,
        woodWorkers: 8,
        goldWorkers: 4,
        luxuryWorkers: 0,
        scientists: 0,
      }),
    ).rejects.toThrow('Assigned citizens cannot exceed current population.');
  });
});
