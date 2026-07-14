import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type GameAnalyticsEventType =
  | 'resource_balance_changed'
  | 'building_upgrade_started'
  | 'building_upgrade_completed'
  | 'research_started'
  | 'research_completed'
  | 'unit_training_started'
  | 'unit_training_completed'
  | 'pve_attack_started'
  | 'pve_attack_completed'
  | 'naval_attack_started'
  | 'naval_attack_blocked'
  | 'naval_attack_completed'
  | 'spy_training_started'
  | 'spy_training_completed'
  | 'spy_mission_started'
  | 'spy_mission_resolved'
  | 'live_event_launched'
  | 'live_event_ended'
  | 'live_event_cancelled'
  | 'live_event_joined'
  | 'live_event_participation_recorded'
  | 'live_event_reward_claimed'
  | 'quest_completed'
  | 'quest_claimed'
  | 'colonization_started'
  | 'colonization_completed'
  | 'registration_completed'
  | 'beta_invite_code_used'
  | 'beta_email_allowlist_used'
  | 'beta_feedback_submitted';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(input: {
    worldId: string;
    playerId: string;
    eventType: GameAnalyticsEventType;
    payload?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.gameAnalyticsEvent.create({
      data: {
        worldId: input.worldId,
        playerId: input.playerId,
        eventType: input.eventType,
        payload: input.payload ?? undefined,
      },
    });
  }
}
