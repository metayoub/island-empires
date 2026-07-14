import { Test } from '@nestjs/testing';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { WorkersService } from './workers.service';

const CITY_ID = 'city-1';

function buildFakePrisma(options?: { population?: number; academyLevel?: number | null }) {
  const state = {
    city: { id: CITY_ID, population: options?.population ?? 50 },
    assignment: {
      cityId: CITY_ID,
      woodWorkers: 5,
      goldWorkers: 5,
      luxuryWorkers: 0,
      scientists: 0,
      idleCitizens: 40,
    },
    academyBuilding:
      options?.academyLevel == null
        ? null
        : { cityId: CITY_ID, buildingType: 'academy', level: options.academyLevel },
  };

  const prisma = {
    city: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.city)),
    },
    cityBuilding: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(state.academyBuilding)),
    },
    cityWorkerAssignment: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.assignment)),
      upsert: jest.fn().mockImplementation(({ create }) => {
        state.assignment = { ...state.assignment, ...create };
        return Promise.resolve(state.assignment);
      }),
    },
  };

  return { prisma, state };
}

describe('WorkersService', () => {
  async function createService(prisma: unknown): Promise<WorkersService> {
    const moduleRef = await Test.createTestingModule({
      providers: [WorkersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    return moduleRef.get(WorkersService);
  }

  it('returns the current worker assignment', async () => {
    const { prisma } = buildFakePrisma();
    const service = await createService(prisma);

    const result = await service.getAssignment(CITY_ID);

    expect(result).toEqual({
      woodWorkers: 5,
      goldWorkers: 5,
      luxuryWorkers: 0,
      scientists: 0,
      idleCitizens: 40,
    });
  });

  it('updates production-affecting worker assignment and recomputes idle citizens', async () => {
    const { prisma } = buildFakePrisma();
    const service = await createService(prisma);

    const result = await service.assignWorkers(CITY_ID, {
      woodWorkers: 8,
      goldWorkers: 4,
      luxuryWorkers: 0,
      scientists: 0,
    });

    expect(result).toEqual({
      woodWorkers: 8,
      goldWorkers: 4,
      luxuryWorkers: 0,
      scientists: 0,
      idleCitizens: 38,
    });
  });

  it('rejects negative worker counts', async () => {
    const { prisma } = buildFakePrisma();
    const service = await createService(prisma);

    await expect(
      service.assignWorkers(CITY_ID, {
        woodWorkers: -1,
        goldWorkers: 4,
        luxuryWorkers: 0,
        scientists: 0,
      }),
    ).rejects.toThrow(ApiErrorException);
  });

  it('rejects assignments that exceed city population', async () => {
    const { prisma } = buildFakePrisma({ population: 10 });
    const service = await createService(prisma);

    await expect(
      service.assignWorkers(CITY_ID, {
        woodWorkers: 8,
        goldWorkers: 4,
        luxuryWorkers: 0,
        scientists: 0,
      }),
    ).rejects.toThrow(ApiErrorException);
  });

  it('rejects scientist assignment when the Academy is not built', async () => {
    const { prisma } = buildFakePrisma({ academyLevel: null });
    const service = await createService(prisma);

    await expect(
      service.assignWorkers(CITY_ID, {
        woodWorkers: 5,
        goldWorkers: 5,
        luxuryWorkers: 0,
        scientists: 5,
      }),
    ).rejects.toThrow('Build the Academy before assigning scientists.');
  });

  it('allows scientist assignment once the Academy is built', async () => {
    const { prisma } = buildFakePrisma({ academyLevel: 1 });
    const service = await createService(prisma);

    const result = await service.assignWorkers(CITY_ID, {
      woodWorkers: 5,
      goldWorkers: 5,
      luxuryWorkers: 0,
      scientists: 5,
    });

    expect(result).toEqual({
      woodWorkers: 5,
      goldWorkers: 5,
      luxuryWorkers: 0,
      scientists: 5,
      idleCitizens: 35,
    });
  });
});
