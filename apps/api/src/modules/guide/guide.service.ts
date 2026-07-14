import { Injectable } from '@nestjs/common';
import type { NextRecommendedAction, QuestSummary } from '@island-empires/shared-types';
import { QuestsService } from '../quests/quests.service';

type QuestActionTarget = { targetScreen: string; targetElement?: string };

const QUEST_ACTION_MAP: Record<string, QuestActionTarget> = {
  welcome_city: { targetScreen: 'city' },
  check_resources: { targetScreen: 'city' },
  assign_citizens: { targetScreen: 'city', targetElement: 'worker_assignment' },
  upgrade_warehouse: { targetScreen: 'city', targetElement: 'building_warehouse' },
  complete_construction: { targetScreen: 'city' },
  build_academy: { targetScreen: 'city', targetElement: 'building_academy' },
  assign_scientists: { targetScreen: 'city', targetElement: 'worker_assignment' },
  start_research: { targetScreen: 'research' },
  complete_research: { targetScreen: 'research' },
  prepare_for_world: { targetScreen: 'city', targetElement: 'building_city_hall' },
};

const FALLBACK_ACTION: NextRecommendedAction = {
  id: 'all_caught_up',
  title: "You're all caught up",
  description: 'You have completed the tutorial. Keep growing your city and researching new technologies.',
  targetScreen: 'city',
};

@Injectable()
export class GuideService {
  constructor(private readonly questsService: QuestsService) {}

  async getNextRecommendedAction(playerId: string): Promise<NextRecommendedAction> {
    const overview = await this.questsService.getQuestOverview(playerId);

    if (!overview.currentQuest) {
      return FALLBACK_ACTION;
    }

    return this.toNextRecommendedAction(overview.currentQuest);
  }

  private toNextRecommendedAction(quest: QuestSummary): NextRecommendedAction {
    const target = QUEST_ACTION_MAP[quest.id] ?? { targetScreen: 'city' };

    return {
      id: quest.id,
      title: quest.title,
      description: quest.description,
      targetScreen: target.targetScreen,
      targetElement: target.targetElement,
      questId: quest.id,
    };
  }
}
