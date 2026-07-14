export type AllianceResourceBalance = {
  wood: number;
  gold: number;
  marble: number;
  wine: number;
  crystal: number;
  sulfur: number;
};

export type AllianceProjectType =
  | 'trade_harbor'
  | 'research_library'
  | 'defensive_monument'
  | 'island_festival';

export type AllianceProjectDefinition = {
  type: AllianceProjectType;
  name: string;
  description: string;
  cost: AllianceResourceBalance;
  bonus: {
    bonusType: string;
    label: string;
    description: string;
    value: number;
  };
};

export const ALLIANCE_RESOURCE_TYPES = [
  'wood',
  'gold',
  'marble',
  'wine',
  'crystal',
  'sulfur',
] as const;

export const EMPTY_ALLIANCE_RESOURCES: AllianceResourceBalance = {
  wood: 0,
  gold: 0,
  marble: 0,
  wine: 0,
  crystal: 0,
  sulfur: 0,
};

export const ALLIANCE_PROJECTS: AllianceProjectDefinition[] = [
  {
    type: 'trade_harbor',
    name: 'Trade Harbor',
    description: 'Coordinates merchants and improves alliance trade readiness.',
    cost: { wood: 6000, gold: 4000, marble: 2500, wine: 0, crystal: 0, sulfur: 0 },
    bonus: {
      bonusType: 'trade_capacity_percent',
      label: 'Trade Harbor',
      description: '+5% trade capacity for alliance members.',
      value: 5,
    },
  },
  {
    type: 'research_library',
    name: 'Research Library',
    description: 'Pools scholars and records discoveries across member cities.',
    cost: { wood: 3500, gold: 4500, marble: 1500, wine: 0, crystal: 2500, sulfur: 0 },
    bonus: {
      bonusType: 'research_generation_percent',
      label: 'Research Library',
      description: '+5% research point generation for alliance members.',
      value: 5,
    },
  },
  {
    type: 'defensive_monument',
    name: 'Defensive Monument',
    description: 'A shared symbol that organizes defensive preparations.',
    cost: { wood: 4000, gold: 3000, marble: 5000, wine: 0, crystal: 0, sulfur: 2000 },
    bonus: {
      bonusType: 'defense_percent',
      label: 'Defensive Monument',
      description: '+5% defensive strength for alliance members.',
      value: 5,
    },
  },
  {
    type: 'island_festival',
    name: 'Island Festival',
    description: 'Funds celebrations that raise morale across the alliance.',
    cost: { wood: 2500, gold: 5000, marble: 1500, wine: 3500, crystal: 0, sulfur: 0 },
    bonus: {
      bonusType: 'happiness_flat',
      label: 'Island Festival',
      description: '+3 happiness in member cities.',
      value: 3,
    },
  },
];

export function getAllianceProjectDefinition(
  projectType: AllianceProjectType,
): AllianceProjectDefinition | null {
  return ALLIANCE_PROJECTS.find((project) => project.type === projectType) ?? null;
}

export function calculateAllianceContributionScore(resources: Partial<AllianceResourceBalance>): number {
  return ALLIANCE_RESOURCE_TYPES.reduce((total, resourceType) => {
    const amount = resources[resourceType] ?? 0;
    return total + Math.max(0, Math.floor(amount));
  }, 0);
}

export function calculateAllianceProjectProgressPercent(input: {
  cost: AllianceResourceBalance;
  contributed: AllianceResourceBalance;
}): number {
  const totalCost = calculateAllianceContributionScore(input.cost);
  if (totalCost <= 0) {
    return 100;
  }
  const cappedContribution = ALLIANCE_RESOURCE_TYPES.reduce((total, resourceType) => {
    return total + Math.min(input.contributed[resourceType], input.cost[resourceType]);
  }, 0);
  return Math.min(100, Math.floor((cappedContribution / totalCost) * 100));
}

export function isAllianceProjectComplete(input: {
  cost: AllianceResourceBalance;
  contributed: AllianceResourceBalance;
}): boolean {
  return ALLIANCE_RESOURCE_TYPES.every(
    (resourceType) => input.contributed[resourceType] >= input.cost[resourceType],
  );
}
