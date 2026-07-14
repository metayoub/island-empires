import { Test } from '@nestjs/testing';
import { TUTORIAL_QUESTS } from '@island-empires/config';
import { PrismaService } from '../../database/prisma.service';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { QuestsService } from './quests.service';

const PLAYER_ID = 'player-1';
const WORLD_ID = 'world-1';
const CITY_ID = 'city-1';

function buildFakePrisma() {
  const state = {
    player: { id: PLAYER_ID, worldId: WORLD_ID },
    city: { id: CITY_ID, playerId: PLAYER_ID, createdAt: new Date('2026-01-01T00:00:00.000Z') },
    resources: { cityId: CITY_ID, wood: 0, gold: 0 },
    questRows: [] as Array<{
      id: string;
      playerId: string;
      worldId: string;
      questId: string;
      status: string;
      progress: number;
      target: number;
      completedAt: Date | null;
      claimedAt: Date | null;
    }>,
    researchState: null as null | {
      playerId: string;
      worldId: string;
      researchPoints: number;
      researchLastCalculatedAt: Date;
    },
    onboardingState: null as null | {
      playerId: string;
      worldId: string;
      hasCompletedTutorial: boolean;
      currentQuestId: string | null;
    },
    resourceTransactions: [] as unknown[],
    researchPointTransactions: [] as unknown[],
    reports: [] as unknown[],
    buildings: [] as Array<{ buildingType: string; level: number; cityId: string }>,
    technologies: [] as Array<{ playerId: string; technologyId: string }>,
    rowCounter: 0,
  };

  const shared = {
    player: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.player)),
    },
    playerQuestProgress: {
      findMany: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(state.questRows.filter((row) => row.playerId === where.playerId)),
      ),
      findFirst: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          state.questRows.find(
            (row) => row.playerId === where.playerId && (!where.status || row.status === where.status),
          ) ?? null,
        ),
      ),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const key = where.playerId_questId;
        return Promise.resolve(
          state.questRows.find((row) => row.playerId === key.playerId && row.questId === key.questId) ?? null,
        );
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        state.rowCounter += 1;
        const row = { id: `qp-${state.rowCounter}`, completedAt: null, claimedAt: null, ...data };
        state.questRows.push(row);
        return Promise.resolve(row);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const row = state.questRows.find((candidate) => candidate.id === where.id);
        if (!row) {
          throw new Error(`quest row not found: ${where.id}`);
        }
        Object.assign(row, data);
        return Promise.resolve(row);
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }) => {
        const row = state.questRows.find(
          (candidate) =>
            candidate.playerId === where.playerId &&
            candidate.questId === where.questId &&
            candidate.status === where.status,
        );
        if (!row) {
          return Promise.resolve({ count: 0 });
        }
        Object.assign(row, data);
        return Promise.resolve({ count: 1 });
      }),
      upsert: jest.fn().mockImplementation(({ where, update, create }) => {
        const key = where.playerId_questId;
        const row = state.questRows.find(
          (candidate) => candidate.playerId === key.playerId && candidate.questId === key.questId,
        );
        if (row) {
          Object.assign(row, update);
          return Promise.resolve(row);
        }
        state.rowCounter += 1;
        const newRow = { id: `qp-${state.rowCounter}`, completedAt: null, claimedAt: null, ...create };
        state.questRows.push(newRow);
        return Promise.resolve(newRow);
      }),
    },
    city: {
      findFirstOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.city)),
    },
    cityResource: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => Promise.resolve(state.resources)),
      update: jest.fn().mockImplementation(({ data }) => {
        state.resources = { ...state.resources, ...data };
        return Promise.resolve(state.resources);
      }),
    },
    resourceTransaction: {
      create: jest.fn().mockImplementation(({ data }) => {
        state.resourceTransactions.push(data);
        return Promise.resolve(data);
      }),
    },
    playerResearchState: {
      upsert: jest.fn().mockImplementation(({ update, create }) => {
        state.researchState = state.researchState ? { ...state.researchState, ...update } : { ...create };
        return Promise.resolve(state.researchState);
      }),
      update: jest.fn().mockImplementation(({ data }) => {
        state.researchState = { ...state.researchState, ...data };
        return Promise.resolve(state.researchState);
      }),
    },
    researchPointTransaction: {
      create: jest.fn().mockImplementation(({ data }) => {
        state.researchPointTransactions.push(data);
        return Promise.resolve(data);
      }),
    },
    playerOnboardingState: {
      upsert: jest.fn().mockImplementation(({ update, create }) => {
        state.onboardingState = state.onboardingState ? { ...state.onboardingState, ...update } : { ...create };
        return Promise.resolve(state.onboardingState);
      }),
    },
    report: {
      create: jest.fn().mockImplementation(({ data }) => {
        state.reports.push(data);
        return Promise.resolve(data);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          state.reports.find(
            (report: any) => report.playerId === where.playerId && report.type === where.type,
          ) ?? null,
        ),
      ),
    },
    cityBuilding: {
      findFirst: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          state.buildings.find(
            (building) =>
              building.buildingType === where.buildingType &&
              building.level >= (where.level?.gte ?? 0) &&
              building.cityId === state.city.id,
          ) ?? null,
        ),
      ),
    },
    playerTechnology: {
      findFirst: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(state.technologies.find((tech) => tech.playerId === where.playerId) ?? null),
      ),
    },
  };

  const prisma = {
    ...shared,
    $transaction: jest.fn().mockImplementation((callback: (tx: unknown) => unknown) => callback(shared)),
  };

  return { prisma, state };
}

describe('QuestsService', () => {
  async function createService(prisma: unknown): Promise<QuestsService> {
    const moduleRef = await Test.createTestingModule({
      providers: [QuestsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    return moduleRef.get(QuestsService);
  }

  it('seeds and activates the first tutorial quest on first read', async () => {
    const { prisma } = buildFakePrisma();
    const service = await createService(prisma);

    const overview = await service.getQuestOverview(PLAYER_ID);

    expect(overview.quests).toHaveLength(16);
    expect(overview.currentQuest?.id).toBe('welcome_city');
    expect(overview.currentQuest?.status).toBe('active');
  });

  it('activates the first appended quest for a player who already claimed the previous tutorial', async () => {
    const { prisma, state } = buildFakePrisma();
    const service = await createService(prisma);

    for (const quest of TUTORIAL_QUESTS.filter((candidate) => candidate.order <= 11)) {
      state.rowCounter += 1;
      state.questRows.push({
        id: `qp-${state.rowCounter}`,
        playerId: PLAYER_ID,
        worldId: WORLD_ID,
        questId: quest.id,
        status: 'claimed',
        progress: quest.target,
        target: quest.target,
        completedAt: new Date('2026-01-01T00:00:00.000Z'),
        claimedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    }

    const overview = await service.getQuestOverview(PLAYER_ID);

    expect(overview.currentQuest?.id).toBe('explore_city');
    expect(overview.currentQuest?.status).toBe('active');
  });

  it('completes the active quest when a matching trigger fires', async () => {
    const { prisma } = buildFakePrisma();
    const service = await createService(prisma);
    await service.getQuestOverview(PLAYER_ID);

    await service.handleQuestTrigger(PLAYER_ID, 'city_dashboard_opened');

    const overview = await service.getQuestOverview(PLAYER_ID);
    expect(overview.currentQuest?.id).toBe('welcome_city');
    expect(overview.currentQuest?.status).toBe('completed');
  });

  it('ignores a trigger that does not match the active quest', async () => {
    const { prisma } = buildFakePrisma();
    const service = await createService(prisma);
    await service.getQuestOverview(PLAYER_ID);

    await service.handleQuestTrigger(PLAYER_ID, 'research_started');

    const overview = await service.getQuestOverview(PLAYER_ID);
    expect(overview.currentQuest?.status).toBe('active');
  });

  it('rejects claiming a quest that is not completed yet', async () => {
    const { prisma } = buildFakePrisma();
    const service = await createService(prisma);
    await service.getQuestOverview(PLAYER_ID);

    await expect(service.claimQuestReward(PLAYER_ID, 'welcome_city')).rejects.toThrow(ApiErrorException);
  });

  it('claims a completed quest, applies resource rewards, logs a transaction, and activates the next quest', async () => {
    const { prisma, state } = buildFakePrisma();
    const service = await createService(prisma);
    await service.getQuestOverview(PLAYER_ID);
    await service.handleQuestTrigger(PLAYER_ID, 'city_dashboard_opened');

    const result = await service.claimQuestReward(PLAYER_ID, 'welcome_city');

    expect(result.rewardsApplied).toEqual({ resources: { wood: 50, gold: 25 } });
    expect(state.resources.wood).toBe(50);
    expect(state.resources.gold).toBe(25);
    expect(state.resourceTransactions).toHaveLength(2);
    expect(result.nextQuest?.id).toBe('check_resources');

    const overview = await service.getQuestOverview(PLAYER_ID);
    expect(overview.quests.find((quest) => quest.id === 'welcome_city')?.status).toBe('claimed');
    expect(overview.currentQuest?.id).toBe('check_resources');
  });

  it('rejects claiming the same quest twice', async () => {
    const { prisma } = buildFakePrisma();
    const service = await createService(prisma);
    await service.getQuestOverview(PLAYER_ID);
    await service.handleQuestTrigger(PLAYER_ID, 'city_dashboard_opened');
    await service.claimQuestReward(PLAYER_ID, 'welcome_city');

    await expect(service.claimQuestReward(PLAYER_ID, 'welcome_city')).rejects.toThrow(ApiErrorException);
  });

  it('gates the warehouse quest to the warehouse building type', async () => {
    const { prisma, state } = buildFakePrisma();
    const service = await createService(prisma);
    await service.getQuestOverview(PLAYER_ID);
    await service.handleQuestTrigger(PLAYER_ID, 'city_dashboard_opened');
    await service.claimQuestReward(PLAYER_ID, 'welcome_city');
    await service.handleQuestTrigger(PLAYER_ID, 'resources_viewed');
    await service.claimQuestReward(PLAYER_ID, 'check_resources');
    await service.handleQuestTrigger(PLAYER_ID, 'worker_assignment_updated');
    await service.claimQuestReward(PLAYER_ID, 'assign_citizens');

    await service.handleQuestTrigger(PLAYER_ID, 'building_upgrade_started', { buildingType: 'academy' });
    let overview = await service.getQuestOverview(PLAYER_ID);
    expect(overview.currentQuest?.status).toBe('active');

    await service.handleQuestTrigger(PLAYER_ID, 'building_upgrade_started', { buildingType: 'warehouse' });
    overview = await service.getQuestOverview(PLAYER_ID);
    expect(overview.currentQuest?.id).toBe('upgrade_warehouse');
    expect(overview.currentQuest?.status).toBe('completed');
    void state;
  });

  it('completes the full tutorial through triggers and lazy fact-checks', async () => {
    const { prisma, state } = buildFakePrisma();
    const service = await createService(prisma);

    async function completeAndClaim(questId: string) {
      await service.claimQuestReward(PLAYER_ID, questId);
    }

    await service.getQuestOverview(PLAYER_ID);
    await service.handleQuestTrigger(PLAYER_ID, 'city_dashboard_opened');
    await completeAndClaim('welcome_city');

    await service.handleQuestTrigger(PLAYER_ID, 'resources_viewed');
    await completeAndClaim('check_resources');

    await service.handleQuestTrigger(PLAYER_ID, 'worker_assignment_updated');
    await completeAndClaim('assign_citizens');

    await service.handleQuestTrigger(PLAYER_ID, 'building_upgrade_started', { buildingType: 'warehouse' });
    await completeAndClaim('upgrade_warehouse');

    // complete_construction completes via a lazy fact-check (a completed building Report), not a trigger.
    state.reports.push({ playerId: PLAYER_ID, type: 'building_completed' });
    await completeAndClaim('complete_construction');

    // build_academy completes via a lazy fact-check (Academy at level >= 1).
    state.buildings.push({ buildingType: 'academy', level: 1, cityId: CITY_ID });
    await completeAndClaim('build_academy');

    await service.handleQuestTrigger(PLAYER_ID, 'scientists_assigned');
    await completeAndClaim('assign_scientists');

    await service.handleQuestTrigger(PLAYER_ID, 'research_started');
    await completeAndClaim('start_research');

    // complete_research completes via a lazy fact-check (a completed technology).
    state.technologies.push({ playerId: PLAYER_ID, technologyId: 'improved_woodcutting' });
    await completeAndClaim('complete_research');

    // prepare_for_world completes via a lazy fact-check (City Hall level >= 2).
    state.buildings.push({ buildingType: 'city_hall', level: 2, cityId: CITY_ID });
    await completeAndClaim('prepare_for_world');

    await service.handleQuestTrigger(PLAYER_ID, 'world_map_opened');
    await completeAndClaim('discover_world_map');

    await service.handleQuestTrigger(PLAYER_ID, 'city_building_clicked', { buildingType: 'academy' });
    await completeAndClaim('explore_city');

    await service.handleQuestTrigger(PLAYER_ID, 'city_building_clicked', { buildingType: 'academy' });
    let overview = await service.getQuestOverview(PLAYER_ID);
    expect(overview.currentQuest?.id).toBe('inspect_warehouse');
    expect(overview.currentQuest?.status).toBe('active');

    await service.handleQuestTrigger(PLAYER_ID, 'city_building_clicked', { buildingType: 'warehouse' });
    await completeAndClaim('inspect_warehouse');

    // build_port completes via a lazy fact-check (Port at level >= 1).
    state.buildings.push({ buildingType: 'port', level: 1, cityId: CITY_ID });
    await completeAndClaim('build_port');

    await service.handleQuestTrigger(PLAYER_ID, 'resource_transport_started');
    await completeAndClaim('start_resource_transport');

    await service.handleQuestTrigger(PLAYER_ID, 'resource_transport_completed');
    await completeAndClaim('complete_resource_transport');

    overview = await service.getQuestOverview(PLAYER_ID);
    expect(overview.currentQuest).toBeNull();
    expect(overview.quests.every((quest) => quest.status === 'claimed')).toBe(true);
    expect(state.onboardingState?.hasCompletedTutorial).toBe(true);
    expect(state.onboardingState?.currentQuestId).toBeNull();
    expect(state.researchPointTransactions).toHaveLength(2);
    expect(state.reports.filter((report: any) => report.type === 'quest_reward_claimed')).toHaveLength(16);
  });
});
