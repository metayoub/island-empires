import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import {
  EVENT_CONFIG,
  EVENT_STATUS,
  type EventRewardDefinition,
  type EventType,
} from '@island-empires/config';
import {
  calculateEventParticipationPoints,
  applyEventBonusPercent,
  getLiveEventStatus,
} from '@island-empires/game-engine';
import type {
  AdminLiveEventsResponse,
  ClaimLiveEventRewardResponse,
  JoinLiveEventResponse,
  LiveEventDetailResponse,
  LiveEventRankingRow,
  LiveEventReward,
  LiveEventsResponse,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { LaunchLiveEventDto } from './dto/live-event.dto';

const RESOURCE_KEYS = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;
const RANKING_LIMIT = 50;

type Db = Record<string, any>;
type LiveEventRecord = Record<string, any>;
type ParticipationRecord = Record<string, any>;

@Injectable()
export class LiveEventsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly analyticsService: AnalyticsService | undefined,
  ) {}

  async listEvents(playerId: string, worldId: string): Promise<LiveEventsResponse> {
    await this.syncEventStatuses(worldId);
    const events = await this.db().liveEvent.findMany({
      where: {
        worldId,
        status: { in: [EVENT_STATUS.SCHEDULED, EVENT_STATUS.ACTIVE, EVENT_STATUS.ENDED] },
      },
      include: { participations: { where: { playerId } } },
      orderBy: [{ startsAt: 'asc' }],
      take: 50,
    });
    const rankByEventId = await this.getPlayerRanks(
      events.map((event: LiveEventRecord) => event.id),
      playerId,
    );

    return {
      events: events.map((event: LiveEventRecord) =>
        this.toEventSummary(event, event.participations?.[0] ?? null, rankByEventId.get(event.id) ?? null),
      ),
    };
  }

  async getEvent(eventId: string, playerId: string, worldId: string): Promise<LiveEventDetailResponse> {
    await this.syncEventStatuses(worldId);
    const event = await this.findEventOrThrow(eventId, worldId, {
      participations: { where: { playerId } },
    });
    const rankings = await this.getRankings(event.id);
    const playerRank = rankings.find((row) => row.playerId === playerId)?.rank ?? null;

    return {
      event: this.toEventSummary(event, event.participations?.[0] ?? null, playerRank),
      rankings,
    };
  }

  async joinEvent(eventId: string, playerId: string, worldId: string): Promise<JoinLiveEventResponse> {
    const event = await this.assertJoinableEvent(eventId, worldId);
    const participation = await this.db().liveEventParticipation.upsert({
      where: { eventId_playerId: { eventId: event.id, playerId } },
      update: {},
      create: {
        worldId,
        eventId: event.id,
        playerId,
      },
    });
    await this.track(worldId, playerId, 'live_event_joined', { eventId: event.id, type: event.type });

    return { event: this.toEventSummary(event, participation, await this.getPlayerRank(event.id, playerId)) };
  }

  async recordParticipation(input: {
    eventId: string;
    playerId: string;
    worldId: string;
    actionCount?: number;
  }): Promise<JoinLiveEventResponse> {
    const event = await this.assertJoinableEvent(input.eventId, input.worldId);
    const definition = this.getDefinition(event.type);
    const points = calculateEventParticipationPoints({
      basePoints: definition.participationPoints,
      actionCount: input.actionCount,
    });
    const participation = await this.db().liveEventParticipation.upsert({
      where: { eventId_playerId: { eventId: event.id, playerId: input.playerId } },
      update: { points: { increment: points } },
      create: {
        worldId: input.worldId,
        eventId: event.id,
        playerId: input.playerId,
        points,
      },
    });
    await this.track(input.worldId, input.playerId, 'live_event_participation_recorded', {
      eventId: event.id,
      type: event.type,
      points,
    });

    return {
      event: this.toEventSummary(
        event,
        participation,
        await this.getPlayerRank(event.id, input.playerId),
      ),
    };
  }

  async claimReward(
    eventId: string,
    playerId: string,
    worldId: string,
  ): Promise<ClaimLiveEventRewardResponse> {
    const event = await this.findEventOrThrow(eventId, worldId);
    const reward = this.normalizeReward(event.reward ?? this.getDefinition(event.type).reward);

    const result = await this.db().$transaction(async (tx: Db) => {
      const participation = await tx.liveEventParticipation.findUnique({
        where: { eventId_playerId: { eventId: event.id, playerId } },
      });
      if (!participation || participation.points <= 0) {
        throw new ApiErrorException(
          'Earn event participation before claiming this reward.',
          'EVENT_REWARD_NOT_EARNED',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (participation.rewardClaimedAt) {
        throw new ApiErrorException(
          'This event reward has already been claimed.',
          'EVENT_REWARD_ALREADY_CLAIMED',
          HttpStatus.CONFLICT,
        );
      }

      const city = await tx.city.findFirst({
        where: { worldId, playerId },
        include: { resources: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!city || !city.resources) {
        throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      const resourceUpdates = this.getResourceUpdates(reward);
      if (Object.keys(resourceUpdates).length > 0) {
        const updatedResources = await tx.cityResource.update({
          where: { cityId: city.id },
          data: resourceUpdates,
        });
        await Promise.all(
          RESOURCE_KEYS.filter((resourceType) => (reward[resourceType] ?? 0) > 0).map(
            (resourceType) =>
              tx.resourceTransaction.create({
                data: {
                  worldId,
                  cityId: city.id,
                  playerId,
                  transactionType: 'event_reward',
                  resourceType,
                  amount: reward[resourceType],
                  balanceAfter: updatedResources[resourceType],
                  referenceType: 'live_event',
                  referenceId: event.id,
                },
              }),
          ),
        );
      }

      if ((reward.researchPoints ?? 0) > 0) {
        const researchState = await tx.playerResearchState.upsert({
          where: { playerId },
          update: { researchPoints: { increment: reward.researchPoints } },
          create: {
            playerId,
            worldId,
            researchPoints: reward.researchPoints,
            researchLastCalculatedAt: new Date(),
          },
        });
        await tx.researchPointTransaction.create({
          data: {
            worldId,
            playerId,
            transactionType: 'event_reward',
            amount: reward.researchPoints,
            balanceAfter: researchState.researchPoints,
            referenceType: 'live_event',
            referenceId: event.id,
          },
        });
      }

      const updatedParticipation = await tx.liveEventParticipation.update({
        where: { eventId_playerId: { eventId: event.id, playerId } },
        data: { rewardClaimedAt: new Date() },
      });
      await tx.report.create({
        data: {
          worldId,
          playerId,
          cityId: city.id,
          type: 'event_reward',
          title: `${event.title} reward claimed`,
          message: 'Your event reward has been added to your empire.',
          payload: { eventId: event.id, reward },
        },
      });

      return updatedParticipation;
    });
    await this.track(worldId, playerId, 'live_event_reward_claimed', { eventId: event.id, reward });

    return {
      event: this.toEventSummary(event, result, await this.getPlayerRank(event.id, playerId)),
      reward,
    };
  }

  async listAdminEvents(worldId: string, playerId: string): Promise<AdminLiveEventsResponse> {
    await this.assertAdmin(playerId);
    await this.syncEventStatuses(worldId);
    const events = await this.db().liveEvent.findMany({
      where: { worldId },
      include: { participations: { where: { playerId } } },
      orderBy: [{ startsAt: 'desc' }],
      take: 100,
    });
    const aggregates = await Promise.all(
      events.map((event: LiveEventRecord) => this.getEventAnalytics(event.id)),
    );

    return {
      events: events.map((event: LiveEventRecord, index: number) => ({
        ...this.toEventSummary(event, event.participations?.[0] ?? null, null),
        analytics: aggregates[index],
      })),
    };
  }

  async launchEvent(
    input: LaunchLiveEventDto,
    worldId: string,
    adminPlayerId: string,
  ): Promise<LiveEventDetailResponse> {
    await this.assertAdmin(adminPlayerId);
    const definition = this.getDefinition(input.type);
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const now = new Date();
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      throw new ApiErrorException(
        'Event end time must be after start time.',
        'INVALID_EVENT_WINDOW',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (endsAt <= now) {
      throw new ApiErrorException(
        'Event end time must be in the future.',
        'EVENT_ALREADY_ENDED',
        HttpStatus.BAD_REQUEST,
      );
    }

    const status =
      getLiveEventStatus({ startsAt, endsAt, now }) === EVENT_STATUS.ACTIVE
        ? EVENT_STATUS.ACTIVE
        : EVENT_STATUS.SCHEDULED;
    const reward = this.normalizeReward(input.reward ?? definition.reward);
    const event = await this.db().liveEvent.create({
      data: {
        worldId,
        type: input.type,
        status,
        title: input.title?.trim() || definition.name,
        description: input.description?.trim() || definition.description,
        startsAt,
        endsAt,
        announcement: input.announcement?.trim() || null,
        bonusPercent: input.bonusPercent ?? definition.bonusPercent ?? null,
        reward,
        createdBy: adminPlayerId,
      },
    });
    await this.announceEvent(event, adminPlayerId);
    await this.track(worldId, adminPlayerId, 'live_event_launched', {
      eventId: event.id,
      type: event.type,
      status,
    });

    return this.getEvent(event.id, adminPlayerId, worldId);
  }

  async endEvent(
    eventId: string,
    worldId: string,
    adminPlayerId: string,
  ): Promise<LiveEventDetailResponse> {
    await this.assertAdmin(adminPlayerId);
    const event = await this.findEventOrThrow(eventId, worldId);
    const updated = await this.db().liveEvent.update({
      where: { id: event.id },
      data: { status: EVENT_STATUS.ENDED, endedAt: new Date() },
    });
    await this.track(worldId, adminPlayerId, 'live_event_ended', { eventId: event.id });

    return {
      event: this.toEventSummary(updated, null, null),
      rankings: await this.getRankings(updated.id),
    };
  }

  async cancelEvent(
    eventId: string,
    worldId: string,
    adminPlayerId: string,
  ): Promise<LiveEventDetailResponse> {
    await this.assertAdmin(adminPlayerId);
    const event = await this.findEventOrThrow(eventId, worldId);
    const updated = await this.db().liveEvent.update({
      where: { id: event.id },
      data: { status: EVENT_STATUS.CANCELLED, cancelledAt: new Date() },
    });
    await this.track(worldId, adminPlayerId, 'live_event_cancelled', { eventId: event.id });

    return {
      event: this.toEventSummary(updated, null, null),
      rankings: await this.getRankings(updated.id),
    };
  }

  async getActiveBonusPercent(worldId: string, type: EventType): Promise<number> {
    await this.syncEventStatuses(worldId);
    const events = await this.db().liveEvent.findMany({
      where: {
        worldId,
        type,
        status: EVENT_STATUS.ACTIVE,
      },
      select: { bonusPercent: true },
    });

    return Math.max(0, ...events.map((event: { bonusPercent: number | null }) => event.bonusPercent ?? 0));
  }

  async applyActiveEventBonus(input: {
    worldId: string;
    type: EventType;
    amount: number;
  }): Promise<number> {
    const bonusPercent = await this.getActiveBonusPercent(input.worldId, input.type);
    return applyEventBonusPercent({ amount: input.amount, bonusPercent });
  }

  async recordParticipationForActiveEvents(input: {
    worldId: string;
    playerId: string;
    type: EventType;
    actionCount?: number;
    tx?: Db;
  }): Promise<void> {
    await this.syncEventStatuses(input.worldId);
    const client = input.tx ?? this.db();
    const events = await client.liveEvent.findMany({
      where: {
        worldId: input.worldId,
        type: input.type,
        status: EVENT_STATUS.ACTIVE,
      },
      select: { id: true, type: true },
    });
    const definition = this.getDefinition(input.type);
    const points = calculateEventParticipationPoints({
      basePoints: definition.participationPoints,
      actionCount: input.actionCount,
    });
    await Promise.all(
      events.map((event: { id: string; type: string }) =>
        client.liveEventParticipation.upsert({
          where: { eventId_playerId: { eventId: event.id, playerId: input.playerId } },
          update: { points: { increment: points } },
          create: {
            worldId: input.worldId,
            eventId: event.id,
            playerId: input.playerId,
            points,
          },
        }),
      ),
    );
    if (events.length > 0) {
      await this.track(input.worldId, input.playerId, 'live_event_participation_recorded', {
        type: input.type,
        eventIds: events.map((event: { id: string }) => event.id),
        points,
      });
    }
  }

  private async syncEventStatuses(worldId: string): Promise<void> {
    const now = new Date();
    await this.emitEventEndingReports(worldId, now);
    await this.db().liveEvent.updateMany({
      where: {
        worldId,
        status: EVENT_STATUS.SCHEDULED,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      data: { status: EVENT_STATUS.ACTIVE },
    });
    await this.db().liveEvent.updateMany({
      where: {
        worldId,
        status: { in: [EVENT_STATUS.SCHEDULED, EVENT_STATUS.ACTIVE] },
        endsAt: { lte: now },
      },
      data: { status: EVENT_STATUS.ENDED, endedAt: now },
    });
  }

  private async emitEventEndingReports(worldId: string, now: Date): Promise<void> {
    const endingSoon = await this.db().liveEvent.findMany({
      where: {
        worldId,
        status: { in: [EVENT_STATUS.SCHEDULED, EVENT_STATUS.ACTIVE] },
        endsAt: {
          gt: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true, title: true, endsAt: true },
      take: 20,
    });
    if (endingSoon.length === 0) return;

    const players = await this.db().player.findMany({
      where: { worldId },
      select: { id: true, selectedCityId: true },
    });
    for (const event of endingSoon as Array<{ id: string; title: string; endsAt: Date }>) {
      const existingReports = await this.db().report.findMany({
        where: {
          worldId,
          type: 'event_ending',
          title: `${event.title} ending soon`,
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
        select: { playerId: true },
      });
      const alreadyNotified = new Set(
        existingReports.map((report: { playerId: string }) => report.playerId),
      );
      const data = players
        .filter((player: { id: string }) => !alreadyNotified.has(player.id))
        .map((player: { id: string; selectedCityId: string | null }) => ({
          worldId,
          playerId: player.id,
          cityId: player.selectedCityId,
          type: 'event_ending',
          title: `${event.title} ending soon`,
          message: `${event.title} ends at ${event.endsAt.toISOString()}. You can review it when convenient.`,
          payload: { eventId: event.id },
        }));
      if (data.length > 0) {
        await this.db().report.createMany({ data });
      }
    }
  }

  private async assertJoinableEvent(eventId: string, worldId: string): Promise<LiveEventRecord> {
    await this.syncEventStatuses(worldId);
    const event = await this.findEventOrThrow(eventId, worldId);
    if (event.status !== EVENT_STATUS.ACTIVE) {
      throw new ApiErrorException(
        'This event is not active.',
        'EVENT_NOT_ACTIVE',
        HttpStatus.BAD_REQUEST,
      );
    }
    return event;
  }

  private async assertAdmin(playerId: string): Promise<void> {
    const player = await this.db().player.findUnique({
      where: { id: playerId },
      include: {
        user: {
          include: { adminRoles: { where: { revokedAt: null } } },
        },
      },
    });
    const allowedRoles = new Set(['super_admin', 'operator']);
    const roles = player?.user?.adminRoles?.map((entry: { role: string }) => entry.role) ?? [];
    if (player?.user?.adminRole) roles.push(player.user.adminRole);
    if (
      !player?.user?.isAdmin ||
      player.user.accountStatus !== 'active' ||
      !player.user.emailVerifiedAt ||
      !roles.some((role: string) => allowedRoles.has(role))
    ) {
      throw new ApiErrorException(
        'Admin privileges are required for event controls.',
        'ADMIN_REQUIRED',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async findEventOrThrow(
    eventId: string,
    worldId: string,
    include?: Record<string, unknown>,
  ): Promise<LiveEventRecord> {
    const event = await this.db().liveEvent.findUnique({
      where: { id: eventId },
      ...(include ? { include } : {}),
    });
    if (!event || event.worldId !== worldId) {
      throw new ApiErrorException('Event not found.', 'EVENT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return event;
  }

  private async getRankings(eventId: string): Promise<LiveEventRankingRow[]> {
    const participations = await this.db().liveEventParticipation.findMany({
      where: { eventId, points: { gt: 0 } },
      include: { player: true },
      orderBy: [{ points: 'desc' }, { joinedAt: 'asc' }],
      take: RANKING_LIMIT,
    });

    return participations.map((participation: ParticipationRecord, index: number) => ({
      rank: index + 1,
      playerId: participation.playerId,
      playerName: participation.player?.name ?? 'Unknown player',
      points: participation.points,
      rewardClaimed: Boolean(participation.rewardClaimedAt),
    }));
  }

  private async getPlayerRanks(eventIds: string[], playerId: string): Promise<Map<string, number>> {
    const ranks = new Map<string, number>();
    await Promise.all(
      eventIds.map(async (eventId) => {
        const rank = await this.getPlayerRank(eventId, playerId);
        if (rank) ranks.set(eventId, rank);
      }),
    );
    return ranks;
  }

  private async getPlayerRank(eventId: string, playerId: string): Promise<number | null> {
    const rankings = await this.getRankings(eventId);
    return rankings.find((row) => row.playerId === playerId)?.rank ?? null;
  }

  private async getEventAnalytics(eventId: string) {
    const [participants, sum, rewardsClaimed] = await Promise.all([
      this.db().liveEventParticipation.count({ where: { eventId } }),
      this.db().liveEventParticipation.aggregate({ where: { eventId }, _sum: { points: true } }),
      this.db().liveEventParticipation.count({
        where: { eventId, rewardClaimedAt: { not: null } },
      }),
    ]);

    return {
      eventId,
      participants,
      totalPoints: sum._sum?.points ?? 0,
      rewardsClaimed,
    };
  }

  private async announceEvent(event: LiveEventRecord, adminPlayerId: string): Promise<void> {
    const players = await this.db().player.findMany({
      where: { worldId: event.worldId },
      select: { id: true, selectedCityId: true },
    });
    await this.db().report.createMany({
      data: players.map((player: { id: string; selectedCityId: string | null }) => ({
        worldId: event.worldId,
        playerId: player.id,
        cityId: player.selectedCityId,
        type: 'event_announcement',
        title: event.title,
        message:
          event.announcement ||
          `${event.title} runs from ${event.startsAt.toISOString()} to ${event.endsAt.toISOString()}.`,
        payload: {
          eventId: event.id,
          eventType: event.type,
          announcedBy: adminPlayerId,
        },
      })),
    });
  }

  private toEventSummary(
    event: LiveEventRecord,
    participation: ParticipationRecord | null,
    rank: number | null,
  ) {
    const definition = this.getDefinition(event.type);
    return {
      id: event.id,
      type: event.type,
      status: event.status,
      title: event.title,
      description: event.description,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      announcement: event.announcement ?? null,
      bonusPercent: event.bonusPercent ?? null,
      reward: this.normalizeReward(event.reward ?? definition.reward),
      participationAction: definition.participationAction,
      playerProgress: {
        joined: Boolean(participation),
        points: participation?.points ?? 0,
        rewardClaimed: Boolean(participation?.rewardClaimedAt),
        rank,
      },
    };
  }

  private getDefinition(type: string) {
    const definition = EVENT_CONFIG[type as EventType];
    if (!definition) {
      throw new ApiErrorException('Unsupported event type.', 'EVENT_TYPE_UNSUPPORTED', HttpStatus.BAD_REQUEST);
    }
    return definition;
  }

  private normalizeReward(reward: EventRewardDefinition | LiveEventReward): Required<LiveEventReward> {
    return {
      wood: Math.max(0, Math.floor(reward.wood ?? 0)),
      gold: Math.max(0, Math.floor(reward.gold ?? 0)),
      marble: Math.max(0, Math.floor(reward.marble ?? 0)),
      wine: Math.max(0, Math.floor(reward.wine ?? 0)),
      crystal: Math.max(0, Math.floor(reward.crystal ?? 0)),
      sulfur: Math.max(0, Math.floor(reward.sulfur ?? 0)),
      researchPoints: Math.max(0, Math.floor(reward.researchPoints ?? 0)),
    };
  }

  private getResourceUpdates(reward: Required<LiveEventReward>): Record<string, { increment: number }> {
    return RESOURCE_KEYS.reduce<Record<string, { increment: number }>>((updates, resourceType) => {
      const amount = reward[resourceType] ?? 0;
      if (amount > 0) {
        updates[resourceType] = { increment: amount };
      }
      return updates;
    }, {});
  }

  private async track(worldId: string, playerId: string, eventType: string, payload: Record<string, unknown>) {
    await this.analyticsService?.track({
      worldId,
      playerId,
      eventType: eventType as any,
      payload: payload as any,
    });
  }

  private db(): Db {
    return this.prisma as any;
  }
}
