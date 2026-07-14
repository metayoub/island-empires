import { HttpStatus, Injectable } from '@nestjs/common';
import { calculateIdleCitizens } from '@island-empires/game-engine';
import { BUILDING_TYPES } from '@island-empires/config';
import type { WorkerAssignment } from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssignment(cityId: string): Promise<WorkerAssignment> {
    const assignment = await this.prisma.cityWorkerAssignment.findUniqueOrThrow({
      where: { cityId },
    });

    return this.toWorkerAssignment(assignment);
  }

  async assignWorkers(
    cityId: string,
    input: { woodWorkers: number; goldWorkers: number; luxuryWorkers: number; scientists: number },
    currentPopulation?: number,
  ): Promise<WorkerAssignment> {
    const population =
      currentPopulation ??
      (await this.prisma.city.findUniqueOrThrow({ where: { id: cityId } })).population;

    if (
      input.woodWorkers < 0 ||
      input.goldWorkers < 0 ||
      input.luxuryWorkers < 0 ||
      input.scientists < 0
    ) {
      throw new ApiErrorException(
        'Worker counts cannot be negative.',
        'INVALID_WORKER_ASSIGNMENT',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      input.woodWorkers + input.goldWorkers + input.luxuryWorkers + input.scientists >
      population
    ) {
      throw new ApiErrorException(
        'Assigned citizens cannot exceed current population.',
        'INVALID_WORKER_ASSIGNMENT',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (input.scientists > 0) {
      const academyBuilding = await this.prisma.cityBuilding.findUnique({
        where: {
          cityId_buildingType: { cityId, buildingType: BUILDING_TYPES.ACADEMY },
        },
      });

      if (!academyBuilding || academyBuilding.level < 1) {
        throw new ApiErrorException(
          'Build the Academy before assigning scientists.',
          'ACADEMY_REQUIRED',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (input.luxuryWorkers > 0) {
      const luxuryExtractor = await this.prisma.cityBuilding.findUnique({
        where: {
          cityId_buildingType: { cityId, buildingType: BUILDING_TYPES.LUXURY_EXTRACTOR },
        },
      });

      if (!luxuryExtractor || luxuryExtractor.level < 1) {
        throw new ApiErrorException(
          'Build the Luxury Extractor before assigning luxury workers.',
          'LUXURY_EXTRACTOR_REQUIRED',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const idleCitizens = calculateIdleCitizens({
      population,
      woodWorkers: input.woodWorkers,
      goldWorkers: input.goldWorkers,
      luxuryWorkers: input.luxuryWorkers,
      scientists: input.scientists,
    });

    const assignment = await this.prisma.cityWorkerAssignment.upsert({
      where: { cityId },
      update: {
        woodWorkers: input.woodWorkers,
        goldWorkers: input.goldWorkers,
        luxuryWorkers: input.luxuryWorkers,
        scientists: input.scientists,
        idleCitizens,
      },
      create: {
        cityId,
        woodWorkers: input.woodWorkers,
        goldWorkers: input.goldWorkers,
        luxuryWorkers: input.luxuryWorkers,
        scientists: input.scientists,
        idleCitizens,
      },
    });

    return this.toWorkerAssignment(assignment);
  }

  private toWorkerAssignment(assignment: {
    woodWorkers: number;
    goldWorkers: number;
    luxuryWorkers: number;
    scientists: number;
    idleCitizens: number;
  }): WorkerAssignment {
    return {
      woodWorkers: assignment.woodWorkers,
      goldWorkers: assignment.goldWorkers,
      luxuryWorkers: assignment.luxuryWorkers,
      scientists: assignment.scientists,
      idleCitizens: assignment.idleCitizens,
    };
  }
}
