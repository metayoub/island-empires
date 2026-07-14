import { Test } from '@nestjs/testing';
import type { QuestOverview } from '@island-empires/shared-types';
import { QuestsService } from '../quests/quests.service';
import { GuideService } from './guide.service';

const PLAYER_ID = 'player-1';

function buildQuestsServiceStub(overview: QuestOverview) {
  return { getQuestOverview: jest.fn().mockResolvedValue(overview) };
}

describe('GuideService', () => {
  async function createService(questsService: unknown): Promise<GuideService> {
    const moduleRef = await Test.createTestingModule({
      providers: [GuideService, { provide: QuestsService, useValue: questsService }],
    }).compile();

    return moduleRef.get(GuideService);
  }

  it('maps the current quest to a next recommended action', async () => {
    const questsServiceStub = buildQuestsServiceStub({
      currentQuest: {
        id: 'upgrade_warehouse',
        title: 'Upgrade the Warehouse',
        description: 'The Warehouse increases how many resources your city can store.',
        objectiveLabel: 'Start a Warehouse upgrade',
        status: 'active',
        progress: 0,
        target: 1,
        rewards: { resources: { wood: 100 } },
      },
      quests: [],
    });
    const service = await createService(questsServiceStub);

    const action = await service.getNextRecommendedAction(PLAYER_ID);

    expect(action.id).toBe('upgrade_warehouse');
    expect(action.targetScreen).toBe('city');
    expect(action.targetElement).toBe('building_warehouse');
    expect(action.questId).toBe('upgrade_warehouse');
  });

  it('returns a fallback action once the tutorial is complete', async () => {
    const questsServiceStub = buildQuestsServiceStub({ currentQuest: null, quests: [] });
    const service = await createService(questsServiceStub);

    const action = await service.getNextRecommendedAction(PLAYER_ID);

    expect(action.id).toBe('all_caught_up');
    expect(action.questId).toBeUndefined();
  });
});
