import { HttpStatus, Injectable, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  calculateGeneratedResearchPoints,
  calculateResearchProduction,
  canStartResearch,
  getTechnologyState,
} from '@island-empires/game-engine';
import {
  BUILDING_TYPES,
  EVENT_TYPES,
  RESEARCH_CATEGORIES,
  RESEARCH_PRODUCTION_CONFIG,
  TECHNOLOGY_CONFIG,
  type TechnologyDefinition,
} from '@island-empires/config';
import type {
  ActiveResearch,
  ResearchOverview,
  StartResearchResponse,
  TechnologySummary,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { LiveEventsService } from '../live-events/live-events.service';

const RESEARCH_COMPLETE_JOB_NAME = 'research.complete';
const QUEUE_NAME = 'island-empires-default';
const RESEARCH_CATEGORY_LABELS: Record<string, string> = {
  [RESEARCH_CATEGORIES.ECONOMY]: 'Economy',
  [RESEARCH_CATEGORIES.MILITARY]: 'Military',
  [RESEARCH_CATEGORIES.NAVAL]: 'Naval',
  [RESEARCH_CATEGORIES.CONSTRUCTION]: 'Construction',
  [RESEARCH_CATEGORIES.SCIENCE]: 'Science',
  [RESEARCH_CATEGORIES.GOVERNANCE]: 'Governance',
  [RESEARCH_CATEGORIES.TRADE]: 'Trade',
  [RESEARCH_CATEGORIES.DEFENSE]: 'Defense',
  [RESEARCH_CATEGORIES.LUXURY]: 'Luxury',
  [RESEARCH_CATEGORIES.ESPIONAGE]: 'Espionage',
};

@Injectable()
export class ResearchService implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly analyticsService: AnalyticsService | undefined,
    @Optional() private readonly liveEventsService: LiveEventsService | undefined,
    configService: ConfigService,
  ) {
    const redisUrl = new URL(configService.get<string>('redis.url') ?? 'redis://localhost:6379');
    this.queue = new Queue(QUEUE_NAME, {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
        username: redisUrl.username || undefined,
        password: redisUrl.password || undefined,
        db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1) || 0) : 0,
        maxRetriesPerRequest: null,
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  async recalculateResearchPoints(playerId: string): Promise<{
    researchPoints: number;
    researchPointsPerHour: number;
    scientists: number;
    academyLevel: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
      const now = new Date();
      const state = await tx.playerResearchState.upsert({
        where: { playerId },
        update: {},
        create: {
          playerId,
          worldId: player.worldId,
          researchPoints: 0,
          researchLastCalculatedAt: now,
        },
      });
      const city = await tx.city.findFirstOrThrow({
        where: { playerId },
        orderBy: { createdAt: 'asc' },
      });
      const [assignment, academyBuilding] = await Promise.all([
        tx.cityWorkerAssignment.findUniqueOrThrow({ where: { cityId: city.id } }),
        tx.cityBuilding.findUnique({
          where: {
            cityId_buildingType: { cityId: city.id, buildingType: BUILDING_TYPES.ACADEMY },
          },
        }),
      ]);

      const academyLevel = academyBuilding?.level ?? 0;
      const production = calculateResearchProduction({
        scientists: assignment.scientists,
        researchPerScientistPerHour: RESEARCH_PRODUCTION_CONFIG.researchPerScientistPerHour,
        academyLevel,
        academyBonusPerLevelAboveOne: RESEARCH_PRODUCTION_CONFIG.academyBonusPerLevelAboveOne,
      });
      const baseGeneratedPoints = calculateGeneratedResearchPoints({
        researchPointsPerHour: production.researchPointsPerHour,
        lastCalculatedAt: state.researchLastCalculatedAt,
        now,
      });
      const generatedPoints = this.liveEventsService
        ? await this.liveEventsService.applyActiveEventBonus({
            worldId: player.worldId,
            type: EVENT_TYPES.RESEARCH_BONUS,
            amount: baseGeneratedPoints,
          })
        : baseGeneratedPoints;

      const updatedState = await tx.playerResearchState.update({
        where: { playerId },
        data: {
          researchPoints: state.researchPoints + generatedPoints,
          researchLastCalculatedAt: now,
        },
      });

      if (generatedPoints > 0) {
        await this.liveEventsService?.recordParticipationForActiveEvents({
          tx,
          worldId: player.worldId,
          playerId,
          type: EVENT_TYPES.RESEARCH_BONUS,
        });
        await tx.researchPointTransaction.create({
          data: {
            worldId: player.worldId,
            playerId,
            transactionType: 'research_production',
            amount: generatedPoints,
            balanceAfter: updatedState.researchPoints,
          },
        });
      }

      return {
        researchPoints: updatedState.researchPoints,
        researchPointsPerHour: production.researchPointsPerHour,
        scientists: assignment.scientists,
        academyLevel,
      };
    });
  }

  async getResearchOverview(playerId: string): Promise<ResearchOverview> {
    await this.completeDueResearch(playerId);
    const recalculated = await this.recalculateResearchPoints(playerId);

    const [activeJob, completedTechnologies] = await Promise.all([
      this.prisma.researchJob.findFirst({ where: { playerId, status: 'active' } }),
      this.prisma.playerTechnology.findMany({ where: { playerId }, select: { technologyId: true } }),
    ]);
    const completedTechnologyIds = completedTechnologies.map((tech) => tech.technologyId);

    const technologies: TechnologySummary[] = Object.values(TECHNOLOGY_CONFIG).map((tech) =>
      this.toTechnologySummary(tech, {
        completedTechnologyIds,
        activeTechnologyId: activeJob?.technologyId ?? null,
      }),
    );

    return {
      researchPoints: recalculated.researchPoints,
      researchPointsPerHour: recalculated.researchPointsPerHour,
      scientists: recalculated.scientists,
      academyLevel: recalculated.academyLevel,
      activeResearch: activeJob ? this.toActiveResearch(activeJob) : null,
      technologies,
      categories: Object.values(RESEARCH_CATEGORIES).map((categoryId) => {
        const categoryTechnologies = technologies.filter(
          (technology) => (technology.category ?? technology.branch) === categoryId,
        );

        return {
          id: categoryId,
          name: RESEARCH_CATEGORY_LABELS[categoryId] ?? categoryId,
          count: categoryTechnologies.length,
          completed: categoryTechnologies.filter((technology) => technology.state === 'completed').length,
          available: categoryTechnologies.filter((technology) => technology.state === 'available').length,
        };
      }),
    };
  }

  async startResearch(playerId: string, technologyId: string): Promise<StartResearchResponse> {
    await this.completeDueResearch(playerId);
    await this.recalculateResearchPoints(playerId);

    const techDef = (TECHNOLOGY_CONFIG as Record<string, TechnologyDefinition>)[technologyId];
    if (!techDef) {
      throw new ApiErrorException('Technology not found', 'RESEARCH_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
      const state = await tx.playerResearchState.findUniqueOrThrow({ where: { playerId } });
      const completedTechnologies = await tx.playerTechnology.findMany({
        where: { playerId },
        select: { technologyId: true },
      });
      const completedTechnologyIds = completedTechnologies.map((tech) => tech.technologyId);
      const isAlreadyCompleted = completedTechnologyIds.includes(technologyId);
      const missingRequirements = techDef.requirements.filter(
        (requirementId) => !completedTechnologyIds.includes(requirementId),
      );
      const activeJob = await tx.researchJob.findFirst({ where: { playerId, status: 'active' } });

      const gate = canStartResearch({
        technologyId,
        technologyCost: techDef.cost,
        currentResearchPoints: state.researchPoints,
        isAlreadyCompleted,
        isAlreadyResearching: Boolean(activeJob),
        requirementsCompleted: missingRequirements.length === 0,
      });

      if (!gate.canStart) {
        if (isAlreadyCompleted) {
          throw new ApiErrorException(
            'This technology has already been researched.',
            'TECHNOLOGY_ALREADY_COMPLETED',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (missingRequirements.length > 0) {
          throw new ApiErrorException(
            'Technology requirements are not completed.',
            'TECHNOLOGY_LOCKED',
            HttpStatus.BAD_REQUEST,
            { missingRequirements },
          );
        }

        if (activeJob) {
          throw new ApiErrorException(
            'Another technology is already being researched.',
            'RESEARCH_QUEUE_BUSY',
            HttpStatus.CONFLICT,
          );
        }

        throw new ApiErrorException(
          'Not enough research points to start this technology.',
          'NOT_ENOUGH_RESEARCH_POINTS',
          HttpStatus.BAD_REQUEST,
          {
            required: techDef.cost,
            available: state.researchPoints,
            missing: techDef.cost - state.researchPoints,
          },
        );
      }

      const updatedState = await tx.playerResearchState.update({
        where: { playerId },
        data: { researchPoints: state.researchPoints - techDef.cost },
      });

      await tx.researchPointTransaction.create({
        data: {
          worldId: player.worldId,
          playerId,
          transactionType: 'research_cost',
          amount: -techDef.cost,
          balanceAfter: updatedState.researchPoints,
          referenceType: 'technology',
          referenceId: techDef.id,
        },
      });

      const startedAt = new Date();
      const finishesAt = new Date(startedAt.getTime() + techDef.durationSeconds * 1000);
      const job = await tx.researchJob.create({
        data: {
          worldId: player.worldId,
          playerId,
          technologyId: techDef.id,
          status: 'active',
          startedAt,
          finishesAt,
        },
      });

      return { researchPoints: updatedState.researchPoints, job };
    });

    await this.enqueueCompletionJob({
      playerId,
      researchJobId: result.job.id,
      technologyId: result.job.technologyId,
      finishesAt: result.job.finishesAt,
    });
    await this.analyticsService?.track({
      worldId: result.job.worldId,
      playerId,
      eventType: 'research_started',
      payload: {
        technologyId,
        cost: techDef.cost,
        durationSeconds: techDef.durationSeconds,
        finishesAt: result.job.finishesAt.toISOString(),
      },
    });

    return {
      researchPoints: result.researchPoints,
      activeResearch: this.toActiveResearch(result.job),
    };
  }

  async completeDueResearch(playerId?: string): Promise<void> {
    const dueJobs = await this.prisma.researchJob.findMany({
      where: {
        ...(playerId ? { playerId } : {}),
        status: 'active',
        finishesAt: { lte: new Date() },
      },
      select: { id: true },
    });

    for (const job of dueJobs) {
      await this.completeResearchJob(job.id);
    }
  }

  async completeResearchJob(researchJobId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.researchJob.findUnique({ where: { id: researchJobId } });

      if (!job || job.status !== 'active') {
        return false;
      }

      if (job.finishesAt > new Date()) {
        return false;
      }

      const updateResult = await tx.researchJob.updateMany({
        where: { id: job.id, status: 'active' },
        data: { status: 'completed', completedAt: new Date() },
      });

      if (updateResult.count === 0) {
        return false;
      }

      await tx.playerTechnology.upsert({
        where: {
          playerId_technologyId: { playerId: job.playerId, technologyId: job.technologyId },
        },
        update: {},
        create: {
          playerId: job.playerId,
          worldId: job.worldId,
          technologyId: job.technologyId,
          status: 'completed',
        },
      });

      const techDef = (TECHNOLOGY_CONFIG as Record<string, TechnologyDefinition>)[job.technologyId];
      await tx.report.create({
        data: {
          worldId: job.worldId,
          playerId: job.playerId,
          type: 'research_completed',
          title: 'Research completed',
          message: `${techDef?.name ?? job.technologyId} has been researched.`,
          payload: {
            technologyId: job.technologyId,
            researchJobId: job.id,
          },
        },
      });
      await tx.gameAnalyticsEvent?.create({
        data: {
          worldId: job.worldId,
          playerId: job.playerId,
          eventType: 'research_completed',
          payload: {
            technologyId: job.technologyId,
            researchJobId: job.id,
          },
        },
      });

      return true;
    });
  }

  private async enqueueCompletionJob(input: {
    playerId: string;
    researchJobId: string;
    technologyId: string;
    finishesAt: Date;
  }): Promise<void> {
    const delay = Math.max(0, input.finishesAt.getTime() - Date.now());

    await this.queue.add(
      RESEARCH_COMPLETE_JOB_NAME,
      {
        playerId: input.playerId,
        researchJobId: input.researchJobId,
        technologyId: input.technologyId,
      },
      {
        delay,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }

  private toTechnologySummary(
    tech: TechnologyDefinition,
    input: { completedTechnologyIds: string[]; activeTechnologyId: string | null },
  ): TechnologySummary {
    return {
      id: tech.id,
      name: tech.name,
      branch: tech.branch,
      category: tech.category,
      tier: tech.tier,
      description: tech.description,
      cost: tech.cost,
      durationSeconds: tech.durationSeconds,
      requirements: tech.requirements,
      unlocks: tech.unlocks,
      state: getTechnologyState({
        technologyId: tech.id,
        completedTechnologyIds: input.completedTechnologyIds,
        activeTechnologyId: input.activeTechnologyId,
        requirements: tech.requirements,
      }),
    };
  }

  private toActiveResearch(job: {
    id: string;
    technologyId: string;
    startedAt: Date;
    finishesAt: Date;
  }): ActiveResearch {
    const now = Date.now();
    const techDef = (TECHNOLOGY_CONFIG as Record<string, TechnologyDefinition>)[job.technologyId];

    return {
      id: job.id,
      technologyId: job.technologyId,
      technologyName: techDef?.name ?? job.technologyId,
      startedAt: job.startedAt.toISOString(),
      finishesAt: job.finishesAt.toISOString(),
      remainingSeconds: Math.max(0, Math.ceil((job.finishesAt.getTime() - now) / 1000)),
    };
  }
}
