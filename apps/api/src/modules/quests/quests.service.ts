import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { canClaimQuestReward, evaluateQuestTrigger } from '@island-empires/game-engine';
import { TUTORIAL_QUESTS, type QuestTrigger, type TutorialQuestDefinition } from '@island-empires/config';
import type {
  ClaimQuestRewardResponse,
  QuestOverview,
  QuestReward,
  QuestStatus,
  QuestSummary,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';

const QUEST_REWARD_TRANSACTION_TYPE = 'quest_reward';
const FACT_CHECK_QUEST_IDS = new Set([
  'complete_construction',
  'build_academy',
  'build_port',
  'complete_research',
  'prepare_for_world',
]);

type QuestProgressRow = {
  id: string;
  playerId: string;
  worldId: string;
  questId: string;
  status: string;
  progress: number;
  target: number;
  completedAt: Date | null;
  claimedAt: Date | null;
};

@Injectable()
export class QuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateQuestProgress(playerId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
      const existingRows = await tx.playerQuestProgress.findMany({ where: { playerId } });
      const rowsByQuestId = new Map<string, QuestProgressRow>(
        existingRows.map((row) => [row.questId, row]),
      );
      const hasAnyStarted = existingRows.length > 0;

      for (const quest of TUTORIAL_QUESTS) {
        if (rowsByQuestId.has(quest.id)) {
          continue;
        }

        const status = !hasAnyStarted && quest.order === 1 ? 'active' : 'locked';
        const created = await tx.playerQuestProgress.create({
          data: {
            worldId: player.worldId,
            playerId,
            questId: quest.id,
            status,
            progress: 0,
            target: quest.target,
          },
        });
        rowsByQuestId.set(quest.id, created);
      }

      const hasActiveOrCompleted = [...rowsByQuestId.values()].some((row) =>
        ['active', 'completed'].includes(row.status),
      );
      if (!hasActiveOrCompleted) {
        const nextQuest = [...TUTORIAL_QUESTS]
          .sort((a, b) => a.order - b.order)
          .find((quest) => rowsByQuestId.get(quest.id)?.status === 'locked');
        const row = nextQuest ? rowsByQuestId.get(nextQuest.id) : undefined;
        if (nextQuest && row) {
          const updated = await tx.playerQuestProgress.update({
            where: { id: row.id },
            data: { status: 'active' },
          });
          rowsByQuestId.set(nextQuest.id, updated);
        }
      }

      for (const quest of TUTORIAL_QUESTS) {
        if (!FACT_CHECK_QUEST_IDS.has(quest.id)) {
          continue;
        }

        const row = rowsByQuestId.get(quest.id);
        if (!row || row.status !== 'active') {
          continue;
        }

        const factSatisfied = await this.checkQuestFact(tx, playerId, quest.id);
        if (!factSatisfied) {
          continue;
        }

        await tx.playerQuestProgress.update({
          where: { id: row.id },
          data: { status: 'completed', progress: quest.target, completedAt: new Date() },
        });
        await tx.gameAnalyticsEvent?.create({
          data: {
            worldId: row.worldId,
            playerId,
            eventType: 'quest_completed',
            payload: { questId: quest.id, source: 'fact_recalculation' },
          },
        });
      }
    });
  }

  async handleQuestTrigger(
    playerId: string,
    trigger: QuestTrigger,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.playerQuestProgress.findFirst({ where: { playerId, status: 'active' } });
      if (!row) {
        return;
      }

      const quest = TUTORIAL_QUESTS.find((candidate) => candidate.id === row.questId);
      if (!quest) {
        return;
      }

      const evaluation = evaluateQuestTrigger({
        currentStatus: row.status,
        currentProgress: row.progress,
        target: quest.target,
        questTrigger: quest.trigger,
        firedTrigger: trigger,
        payloadMatch: quest.payloadMatch,
        payload,
      });

      if (!evaluation.matched) {
        return;
      }

      await tx.playerQuestProgress.update({
        where: { id: row.id },
        data: {
          progress: evaluation.newProgress,
          status: evaluation.isNewlyCompleted ? 'completed' : row.status,
          completedAt: evaluation.isNewlyCompleted ? new Date() : row.completedAt,
        },
      });
      if (evaluation.isNewlyCompleted) {
        await tx.gameAnalyticsEvent?.create({
          data: {
            worldId: row.worldId,
            playerId,
            eventType: 'quest_completed',
            payload: { questId: quest.id, trigger, progress: evaluation.newProgress },
          },
        });
      }
    });
  }

  async getQuestOverview(playerId: string): Promise<QuestOverview> {
    await this.recalculateQuestProgress(playerId);

    const rows = await this.prisma.playerQuestProgress.findMany({ where: { playerId } });
    const rowsByQuestId = new Map(rows.map((row) => [row.questId, row]));

    const quests: QuestSummary[] = TUTORIAL_QUESTS.map((quest) =>
      this.toQuestSummary(quest, rowsByQuestId.get(quest.id)),
    );

    const currentQuest =
      quests.find((quest) => quest.status === 'active' || quest.status === 'completed') ?? null;

    return { currentQuest, quests };
  }

  async claimQuestReward(playerId: string, questId: string): Promise<ClaimQuestRewardResponse> {
    await this.recalculateQuestProgress(playerId);

    const quest = TUTORIAL_QUESTS.find((candidate) => candidate.id === questId);
    if (!quest) {
      throw new ApiErrorException('Quest not found.', 'QUEST_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.playerQuestProgress.findUnique({
        where: { playerId_questId: { playerId, questId } },
      });

      if (!row) {
        throw new ApiErrorException('Quest not found.', 'QUEST_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      const gate = canClaimQuestReward({ status: row.status });
      if (!gate.canClaim) {
        if (row.status === 'claimed') {
          throw new ApiErrorException(
            'This quest reward has already been claimed.',
            'QUEST_ALREADY_CLAIMED',
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new ApiErrorException(
          'This quest is not completed yet.',
          'QUEST_NOT_COMPLETED',
          HttpStatus.BAD_REQUEST,
        );
      }

      const claimResult = await tx.playerQuestProgress.updateMany({
        where: { playerId, questId, status: 'completed' },
        data: { status: 'claimed', claimedAt: new Date() },
      });

      if (claimResult.count === 0) {
        throw new ApiErrorException(
          'Quest cannot be updated from the current state.',
          'INVALID_QUEST_STATE',
          HttpStatus.CONFLICT,
        );
      }

      const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });

      if (quest.rewards.resources) {
        const city = await tx.city.findFirstOrThrow({
          where: { playerId },
          orderBy: { createdAt: 'asc' },
        });
        const resources = await tx.cityResource.findUniqueOrThrow({ where: { cityId: city.id } });
        const resourceKeys = Object.keys(quest.rewards.resources) as Array<'wood' | 'gold'>;
        const updateData: Record<string, number> = {};

        for (const key of resourceKeys) {
          const amount = quest.rewards.resources[key] ?? 0;
          updateData[key] = resources[key] + amount;
        }

        const updatedResources = await tx.cityResource.update({
          where: { cityId: city.id },
          data: updateData,
        });

        for (const key of resourceKeys) {
          const amount = quest.rewards.resources[key] ?? 0;
          if (amount === 0) {
            continue;
          }

          await tx.resourceTransaction.create({
            data: {
              worldId: player.worldId,
              cityId: city.id,
              playerId,
              transactionType: QUEST_REWARD_TRANSACTION_TYPE,
              resourceType: key,
              amount,
              balanceAfter: updatedResources[key],
              referenceType: 'quest',
              referenceId: questId,
            },
          });
        }
      }

      if (quest.rewards.researchPoints) {
        const researchState = await tx.playerResearchState.upsert({
          where: { playerId },
          update: {},
          create: {
            playerId,
            worldId: player.worldId,
            researchPoints: 0,
            researchLastCalculatedAt: new Date(),
          },
        });
        const updatedState = await tx.playerResearchState.update({
          where: { playerId },
          data: { researchPoints: researchState.researchPoints + quest.rewards.researchPoints },
        });

        await tx.researchPointTransaction.create({
          data: {
            worldId: player.worldId,
            playerId,
            transactionType: QUEST_REWARD_TRANSACTION_TYPE,
            amount: quest.rewards.researchPoints,
            balanceAfter: updatedState.researchPoints,
            referenceType: 'quest',
            referenceId: questId,
          },
        });
      }

      const nextQuestDef = TUTORIAL_QUESTS.find((candidate) => candidate.order === quest.order + 1);
      let nextQuest: ClaimQuestRewardResponse['nextQuest'] = null;

      if (nextQuestDef) {
        const activatedNext = await tx.playerQuestProgress.upsert({
          where: { playerId_questId: { playerId, questId: nextQuestDef.id } },
          update: { status: 'active' },
          create: {
            worldId: player.worldId,
            playerId,
            questId: nextQuestDef.id,
            status: 'active',
            progress: 0,
            target: nextQuestDef.target,
          },
        });
        nextQuest = { id: nextQuestDef.id, title: nextQuestDef.title, status: activatedNext.status as QuestStatus };

        await tx.playerOnboardingState.upsert({
          where: { playerId },
          update: { currentQuestId: nextQuestDef.id },
          create: {
            playerId,
            worldId: player.worldId,
            currentQuestId: nextQuestDef.id,
          },
        });
      } else {
        await tx.playerOnboardingState.upsert({
          where: { playerId },
          update: { hasCompletedTutorial: true, currentQuestId: null },
          create: {
            playerId,
            worldId: player.worldId,
            hasCompletedTutorial: true,
            currentQuestId: null,
          },
        });
      }

      await tx.report.create({
        data: {
          worldId: player.worldId,
          playerId,
          type: 'quest_reward_claimed',
          title: 'Quest reward claimed',
          message: `${quest.title} reward has been claimed.`,
          payload: { questId },
        },
      });
      await tx.gameAnalyticsEvent?.create({
        data: {
          worldId: player.worldId,
          playerId,
          eventType: 'quest_claimed',
          payload: { questId, rewards: quest.rewards },
        },
      });

      return {
        claimedQuestId: questId,
        rewardsApplied: quest.rewards as QuestReward,
        nextQuest,
      };
    });
  }

  private async checkQuestFact(
    tx: Prisma.TransactionClient,
    playerId: string,
    questId: string,
  ): Promise<boolean> {
    switch (questId) {
      case 'complete_construction': {
        const report = await tx.report.findFirst({ where: { playerId, type: 'building_completed' } });
        return Boolean(report);
      }
      case 'build_academy': {
        const building = await tx.cityBuilding.findFirst({
          where: { buildingType: 'academy', level: { gte: 1 }, city: { playerId } },
        });
        return Boolean(building);
      }
      case 'build_port': {
        const building = await tx.cityBuilding.findFirst({
          where: { buildingType: 'port', level: { gte: 1 }, city: { playerId } },
        });
        return Boolean(building);
      }
      case 'complete_research': {
        const technology = await tx.playerTechnology.findFirst({ where: { playerId } });
        return Boolean(technology);
      }
      case 'prepare_for_world': {
        const building = await tx.cityBuilding.findFirst({
          where: { buildingType: 'city_hall', level: { gte: 2 }, city: { playerId } },
        });
        return Boolean(building);
      }
      default:
        return false;
    }
  }

  private toQuestSummary(
    quest: TutorialQuestDefinition,
    row?: { status: string; progress: number },
  ): QuestSummary {
    return {
      id: quest.id,
      title: quest.title,
      description: quest.description,
      objectiveLabel: quest.objectiveLabel,
      status: (row?.status as QuestStatus) ?? 'locked',
      progress: row?.progress ?? 0,
      target: quest.target,
      rewards: quest.rewards,
    };
  }
}
