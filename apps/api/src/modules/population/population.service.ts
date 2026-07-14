import { HttpStatus, Injectable } from '@nestjs/common';
import {
  calculateHappiness,
  calculateIdleCitizens,
  calculatePopulationCapacity,
  calculatePopulationGrowth,
} from '@island-empires/game-engine';
import {
  BUILDING_TYPES,
  HAPPINESS_CONFIG,
  HOSPITAL_HEALTH_CONFIG,
  POPULATION_CONFIG,
} from '@island-empires/config';
import type {
  CitizenSummary,
  CityPopulationResponse,
  HappinessSummary,
  PopulationSummary,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';

type HappinessBreakdown = {
  value: number;
  base: number;
  tavernBonus: number;
  healthSupport: number;
  healthPressureRelief: number;
  healthGrowthBonusPercent: number;
  populationPressure: number;
  administrationPenalty: number;
  status: HappinessSummary['status'];
};

@Injectable()
export class PopulationService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculatePopulation(cityId: string): Promise<CityPopulationResponse> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [city, cityHall, tavern, hospital, assignment] = await Promise.all([
          tx.city.findUniqueOrThrow({ where: { id: cityId } }),
          tx.cityBuilding.findUnique({
            where: {
              cityId_buildingType: { cityId, buildingType: BUILDING_TYPES.CITY_HALL },
            },
          }),
          tx.cityBuilding.findUnique({
            where: {
              cityId_buildingType: { cityId, buildingType: BUILDING_TYPES.TAVERN },
            },
          }),
          tx.cityBuilding.findUnique({
            where: {
              cityId_buildingType: { cityId, buildingType: BUILDING_TYPES.HOSPITAL },
            },
          }),
          tx.cityWorkerAssignment.findUniqueOrThrow({ where: { cityId } }),
        ]);
        const cityCount = await tx.city.count({ where: { playerId: city.playerId } });
        const administrationPenalty = Math.max(0, cityCount - 1) * 5;

        const now = new Date();
        const capacity = calculatePopulationCapacity({
          cityHallLevel: cityHall?.level ?? 0,
          basePopulationCapacity: POPULATION_CONFIG.basePopulationCapacity,
          populationCapacityPerCityHallLevel: POPULATION_CONFIG.populationCapacityPerCityHallLevel,
        });
        const growthHappiness = this.calculateHappinessBreakdown({
          population: city.population,
          populationCapacity: capacity,
          tavernLevel: tavern?.level ?? 0,
          hospitalLevel: hospital?.level ?? 0,
          administrationPenalty,
        });
        const healthGrowthBonusMultiplier = 1 + growthHappiness.healthGrowthBonusPercent / 100;
        const growth = calculatePopulationGrowth({
          currentPopulation: city.population,
          populationCapacity: capacity,
          happiness: growthHappiness.value,
          baseGrowthPerHour: POPULATION_CONFIG.baseGrowthPerHour * healthGrowthBonusMultiplier,
          lastCalculatedAt: city.populationLastCalculatedAt,
          now,
        });
        const finalHappiness = this.calculateHappinessBreakdown({
          population: growth.newPopulation,
          populationCapacity: capacity,
          tavernLevel: tavern?.level ?? 0,
          hospitalLevel: hospital?.level ?? 0,
          administrationPenalty,
        });

        const updatedCity = await tx.city.update({
          where: { id: cityId },
          data: {
            population: growth.newPopulation,
            populationCapacity: capacity,
            happiness: finalHappiness.value,
            populationLastCalculatedAt: now,
          },
        });

        const idleCitizens = calculateIdleCitizens({
          population: updatedCity.population,
          woodWorkers: assignment.woodWorkers,
          goldWorkers: assignment.goldWorkers,
          luxuryWorkers: assignment.luxuryWorkers,
          scientists: assignment.scientists,
        });
        await tx.cityWorkerAssignment.update({
          where: { cityId },
          data: { idleCitizens },
        });

        const population = this.toPopulationSummary({
          currentPopulation: updatedCity.population,
          populationCapacity: updatedCity.populationCapacity,
          happiness: updatedCity.happiness,
          healthGrowthBonusPercent: finalHappiness.healthGrowthBonusPercent,
          lastCalculatedAt: updatedCity.populationLastCalculatedAt,
        });
        const citizens = {
          woodWorkers: assignment.woodWorkers,
          goldWorkers: assignment.goldWorkers,
          luxuryWorkers: assignment.luxuryWorkers,
          scientists: assignment.scientists,
          idleCitizens,
        };

        return {
          population,
          happiness: finalHappiness,
          citizens,
        };
      });
    } catch (error) {
      if (error instanceof ApiErrorException) {
        throw error;
      }

      throw new ApiErrorException(
        'Unable to calculate city population.',
        'POPULATION_CALCULATION_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPopulationResponse(cityId: string): Promise<CityPopulationResponse> {
    return this.recalculatePopulation(cityId);
  }

  async assertWorkerAssignmentAllowed(input: {
    population: number;
    woodWorkers: number;
    goldWorkers: number;
    luxuryWorkers: number;
    scientists: number;
  }): Promise<void> {
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
      input.population
    ) {
      throw new ApiErrorException(
        'Assigned citizens cannot exceed current population.',
        'INVALID_WORKER_ASSIGNMENT',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  toCitizenSummary(input: {
    population: number;
    woodWorkers: number;
    goldWorkers: number;
    luxuryWorkers: number;
    scientists: number;
  }): CitizenSummary {
    return {
      woodWorkers: input.woodWorkers,
      goldWorkers: input.goldWorkers,
      luxuryWorkers: input.luxuryWorkers,
      scientists: input.scientists,
      idleCitizens: calculateIdleCitizens(input),
    };
  }

  private calculateHappinessBreakdown(input: {
    population: number;
    populationCapacity: number;
    tavernLevel: number;
    hospitalLevel: number;
    administrationPenalty: number;
  }): HappinessBreakdown {
    const populationRatio = input.population / Math.max(1, input.populationCapacity);
    const rawPressure =
      populationRatio <= HAPPINESS_CONFIG.populationPressureStartRatio
        ? 0
        : Math.min(
            (populationRatio - HAPPINESS_CONFIG.populationPressureStartRatio) * 100,
            HAPPINESS_CONFIG.maxPopulationPressure,
          );
    const healthPressureRelief = Math.min(
      HOSPITAL_HEALTH_CONFIG.maxPopulationPressureRelief,
      input.hospitalLevel * HOSPITAL_HEALTH_CONFIG.populationPressureReliefPerLevel,
    );
    const populationPressure = Math.round(Math.max(0, rawPressure - healthPressureRelief));
    const tavernBonus = input.tavernLevel * HAPPINESS_CONFIG.tavernHappinessPerLevel;
    const healthSupport = input.hospitalLevel * HOSPITAL_HEALTH_CONFIG.healthSupportPerLevel;
    const healthGrowthBonusPercent = Math.min(
      HOSPITAL_HEALTH_CONFIG.maxGrowthBonusPercent,
      input.hospitalLevel * HOSPITAL_HEALTH_CONFIG.growthBonusPercentPerLevel,
    );
    const value = calculateHappiness({
      population: input.population,
      populationCapacity: input.populationCapacity,
      tavernLevel: input.tavernLevel,
      hospitalLevel: input.hospitalLevel,
      baseHappiness: HAPPINESS_CONFIG.baseHappiness,
      tavernHappinessPerLevel: HAPPINESS_CONFIG.tavernHappinessPerLevel,
      populationPressureStartRatio: HAPPINESS_CONFIG.populationPressureStartRatio,
      maxPopulationPressure: HAPPINESS_CONFIG.maxPopulationPressure,
      hospitalPressureReliefPerLevel: HOSPITAL_HEALTH_CONFIG.populationPressureReliefPerLevel,
      maxHospitalPressureRelief: HOSPITAL_HEALTH_CONFIG.maxPopulationPressureRelief,
      administrationPenalty: input.administrationPenalty,
    });

    return {
      value,
      base: HAPPINESS_CONFIG.baseHappiness,
      tavernBonus,
      healthSupport,
      healthPressureRelief: Math.round(Math.min(rawPressure, healthPressureRelief)),
      healthGrowthBonusPercent,
      populationPressure,
      administrationPenalty: input.administrationPenalty,
      status: this.getHappinessStatus(value),
    };
  }

  private toPopulationSummary(input: {
    currentPopulation: number;
    populationCapacity: number;
    happiness: number;
    healthGrowthBonusPercent: number;
    lastCalculatedAt: Date;
  }): PopulationSummary {
    const isAtCapacity = input.currentPopulation >= input.populationCapacity;
    const healthGrowthMultiplier = 1 + Math.max(0, input.healthGrowthBonusPercent) / 100;
    const growthPerHour = isAtCapacity
      ? 0
      : Math.round(
          POPULATION_CONFIG.baseGrowthPerHour *
            healthGrowthMultiplier *
            (input.happiness / 100) *
            100,
        ) / 100;

    return {
      current: input.currentPopulation,
      capacity: input.populationCapacity,
      growthPerHour,
      isAtCapacity,
      lastCalculatedAt: input.lastCalculatedAt.toISOString(),
    };
  }

  private getHappinessStatus(value: number): HappinessSummary['status'] {
    if (value < 40) return 'unhappy';
    if (value < 80) return 'neutral';
    if (value < 120) return 'happy';
    return 'very_happy';
  }
}
