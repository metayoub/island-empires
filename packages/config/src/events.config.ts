export const EVENT_TYPES = {
  RESOURCE_BONUS: 'resource_bonus',
  RESEARCH_BONUS: 'research_bonus',
  PVE_INVASION: 'pve_invasion',
  ALLIANCE_DONATION: 'alliance_donation',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export type EventRewardDefinition = {
  wood?: number;
  gold?: number;
  marble?: number;
  wine?: number;
  crystal?: number;
  sulfur?: number;
  researchPoints?: number;
};

export type EventDefinition = {
  type: EventType;
  name: string;
  description: string;
  participationAction: string;
  participationPoints: number;
  bonusPercent?: number;
  reward: EventRewardDefinition;
};

export const EVENT_CONFIG: Record<EventType, EventDefinition> = {
  [EVENT_TYPES.RESOURCE_BONUS]: {
    type: EVENT_TYPES.RESOURCE_BONUS,
    name: 'Harvest Surge',
    description: 'Earn bonus event credit from normal city resource production.',
    participationAction: 'Collect city resources',
    participationPoints: 10,
    bonusPercent: 20,
    reward: { wood: 250, gold: 150 },
  },
  [EVENT_TYPES.RESEARCH_BONUS]: {
    type: EVENT_TYPES.RESEARCH_BONUS,
    name: 'Scholars Assembly',
    description: 'Generate research and claim extra knowledge rewards.',
    participationAction: 'Generate research points',
    participationPoints: 10,
    bonusPercent: 15,
    reward: { researchPoints: 40, crystal: 30 },
  },
  [EVENT_TYPES.PVE_INVASION]: {
    type: EVENT_TYPES.PVE_INVASION,
    name: 'Barbarian Incursion',
    description: 'Defeat PvE camps during the invasion window for event credit.',
    participationAction: 'Win PvE battles',
    participationPoints: 25,
    bonusPercent: 10,
    reward: { wood: 180, gold: 120, sulfur: 40 },
  },
  [EVENT_TYPES.ALLIANCE_DONATION]: {
    type: EVENT_TYPES.ALLIANCE_DONATION,
    name: 'Alliance Muster',
    description: 'Support alliance donations and projects without daily streak pressure.',
    participationAction: 'Donate to your alliance',
    participationPoints: 20,
    bonusPercent: 10,
    reward: { wood: 120, gold: 120, marble: 60 },
  },
};

export const EVENT_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];
