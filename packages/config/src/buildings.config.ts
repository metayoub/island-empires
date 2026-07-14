import { CONDITION_TYPES, type UnlockCondition } from './conditions.config.js';

export const BUILDING_TYPES = {
  CITY_HALL: 'city_hall',
  WAREHOUSE: 'warehouse',
  ACADEMY: 'academy',
  BARRACKS: 'barracks',
  PORT: 'port',
  TAVERN: 'tavern',
  LUXURY_EXTRACTOR: 'luxury_extractor',
  FORESTERS_HOUSE: 'foresters_house',
  MARBLE_MASON: 'marble_mason',
  VINEYARD_ESTATE: 'vineyard_estate',
  CRYSTAL_LENSWORKS: 'crystal_lensworks',
  SULFUR_REFINERY: 'sulfur_refinery',
  TRADING_POST: 'trading_post',
  MARKETPLACE: 'marketplace',
  HOSPITAL: 'hospital',
  SHIPYARD: 'shipyard',
  BUILDERS_GUILD: 'builders_guild',
  WORKSHOP: 'workshop',
  PALACE: 'palace',
  GOVERNOR_RESIDENCY: 'governor_residency',
  WALL: 'wall',
  SPY_AGENCY: 'spy_agency',
} as const;

export type BuildingType = (typeof BUILDING_TYPES)[keyof typeof BUILDING_TYPES];

export const BUILDING_DISPLAY_CONFIG: Record<
  BuildingType,
  {
    name: string;
    description: string;
    enabledInSprint3: boolean;
  }
> = {
  [BUILDING_TYPES.CITY_HALL]: {
    name: 'City Hall',
    description: 'The administrative center of your city.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.WAREHOUSE]: {
    name: 'Warehouse',
    description: 'Stores and protects your city resources.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.ACADEMY]: {
    name: 'Academy',
    description: 'Allows your city to generate research points.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.BARRACKS]: {
    name: 'Barracks',
    description: 'Trains land units for defense and combat.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.PORT]: {
    name: 'Port',
    description: 'Allows your city to send resources to your other cities.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.TAVERN]: {
    name: 'Tavern',
    description: 'Increases happiness and supports population growth.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.LUXURY_EXTRACTOR]: {
    name: 'Luxury Extractor',
    description: 'Harvests the island luxury resource: Marble, Wine, Crystal, or Sulfur.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.FORESTERS_HOUSE]: {
    name: "Forester's House",
    description: 'Improves local wood production in this city.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.MARBLE_MASON]: {
    name: 'Marble Mason',
    description: 'Improves local marble production on marble islands.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.VINEYARD_ESTATE]: {
    name: 'Vineyard Estate',
    description: 'Improves local wine production on wine islands.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.CRYSTAL_LENSWORKS]: {
    name: 'Crystal Lensworks',
    description: 'Improves local crystal production on crystal islands.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.SULFUR_REFINERY]: {
    name: 'Sulfur Refinery',
    description: 'Improves local sulfur production on sulfur islands.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.TRADING_POST]: {
    name: 'Trading Post',
    description: 'Improves commerce and prepares the city for market trade.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.MARKETPLACE]: {
    name: 'Marketplace',
    description: 'Allows your city to trade resources with other players.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.HOSPITAL]: {
    name: 'Hospital',
    description:
      'Improves citizen health, reduces crowding pressure, and speeds population recovery.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.SHIPYARD]: {
    name: 'Shipyard',
    description: 'Builds and maintains ships for naval expansion and logistics.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.BUILDERS_GUILD]: {
    name: "Builder's Guild",
    description: 'Coordinates construction crews and reduces building upgrade time.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.WORKSHOP]: {
    name: 'Workshop',
    description:
      'Improves weapons, armor, siege parts, and ship fittings to reduce training cost and time.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.PALACE]: {
    name: 'Palace',
    description: 'Allows your empire to found additional cities.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.GOVERNOR_RESIDENCY]: {
    name: 'Governor Residency',
    description: 'The administrative residence for a non-capital city.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.WALL]: {
    name: 'Town Wall',
    description:
      'Protects citizens and stationed units by absorbing attacks before the city is breached.',
    enabledInSprint3: true,
  },
  [BUILDING_TYPES.SPY_AGENCY]: {
    name: 'Spy Agency',
    description: 'Trains spies and allows scouting missions against other cities.',
    enabledInSprint3: true,
  },
} as const;

export const BUILDING_CONFIG = BUILDING_DISPLAY_CONFIG;

export const LUXURY_PRODUCTION_BUILDINGS = {
  marble: BUILDING_TYPES.MARBLE_MASON,
  wine: BUILDING_TYPES.VINEYARD_ESTATE,
  crystal: BUILDING_TYPES.CRYSTAL_LENSWORKS,
  sulfur: BUILDING_TYPES.SULFUR_REFINERY,
} as const;

export const PRODUCTION_BOOST_BUILDINGS = {
  [BUILDING_TYPES.FORESTERS_HOUSE]: {
    resourceType: 'wood',
    percentPerLevel: 2,
    maxLevel: 50,
  },
  [BUILDING_TYPES.MARBLE_MASON]: {
    resourceType: 'marble',
    percentPerLevel: 2,
    maxLevel: 50,
  },
  [BUILDING_TYPES.VINEYARD_ESTATE]: {
    resourceType: 'wine',
    percentPerLevel: 2,
    maxLevel: 50,
  },
  [BUILDING_TYPES.CRYSTAL_LENSWORKS]: {
    resourceType: 'crystal',
    percentPerLevel: 2,
    maxLevel: 50,
  },
  [BUILDING_TYPES.SULFUR_REFINERY]: {
    resourceType: 'sulfur',
    percentPerLevel: 2,
    maxLevel: 50,
  },
} as const;

export type BuildingMilestone = {
  level: number;
  title: string;
  description: string;
  conditions?: UnlockCondition[];
};

const STANDARD_BUILDING_MILESTONES: BuildingMilestone[] = [
  {
    level: 5,
    title: 'Foundation specialization',
    description: 'Unlocks the first meaningful specialization for this building.',
  },
  {
    level: 10,
    title: 'Advanced planning',
    description: 'Requires the first category research gate and unlocks stronger scaling.',
    conditions: [
      {
        type: CONDITION_TYPES.RESEARCH_REQUIRED,
        technologyId: 'basic_architecture',
      },
    ],
  },
  {
    level: 20,
    title: 'Regional infrastructure',
    description: 'Adds marble and luxury-resource requirements to push island specialization.',
    conditions: [
      {
        type: CONDITION_TYPES.RESOURCE_REQUIRED,
        resourceType: 'marble',
        amount: 1000,
      },
    ],
  },
  {
    level: 30,
    title: 'Imperial engineering',
    description: 'Requires advanced category research and unlocks elite city capabilities.',
    conditions: [
      {
        type: CONDITION_TYPES.RESEARCH_REQUIRED,
        technologyId: 'engineering_plans',
      },
    ],
  },
  {
    level: 40,
    title: 'Empire-grade institution',
    description: 'Adds crystal, sulfur, and governance demands for endgame progression.',
    conditions: [
      {
        type: CONDITION_TYPES.RESOURCE_REQUIRED,
        resourceType: 'crystal',
        amount: 2000,
      },
      {
        type: CONDITION_TYPES.CITY_POPULATION_REQUIRED,
        population: 2500,
      },
    ],
  },
  {
    level: 50,
    title: 'Capstone mastery',
    description: 'Final building mastery. Grants the highest tier of bonuses for this city role.',
  },
];

export const BUILDING_MILESTONE_CONFIG: Record<BuildingType, BuildingMilestone[]> = {
  [BUILDING_TYPES.CITY_HALL]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 25,
      title: 'Administrative district',
      description: 'Unlocks stronger governance requirements for Palace and city control.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'tax_records' }],
    },
  ],
  [BUILDING_TYPES.WAREHOUSE]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 15,
      title: 'Logistics storage',
      description: 'Prepares larger resource stockpiles for expensive elite upgrades.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'basic_storage' }],
    },
  ],
  [BUILDING_TYPES.ACADEMY]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 25,
      title: 'Specialized laboratories',
      description: 'Unlocks science category conditions and crystal-heavy research paths.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'crystal_optics' }],
    },
  ],
  [BUILDING_TYPES.BARRACKS]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 15,
      title: 'Professional army',
      description: 'Unlocks advanced land-unit conditions and higher training expectations.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'formation_tactics' }],
    },
    {
      level: 35,
      title: 'Siege command',
      description: 'Unlocks late siege and elite army milestones.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'siege_engineering' }],
    },
  ],
  [BUILDING_TYPES.PORT]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 15,
      title: 'Harbor logistics',
      description: 'Improves sea logistics and prepares advanced naval conditions.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'basic_navigation' }],
    },
  ],
  [BUILDING_TYPES.TAVERN]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 20,
      title: 'Civic culture hub',
      description: 'Requires wine access and supports high-population city stability.',
      conditions: [{ type: CONDITION_TYPES.ISLAND_RESOURCE_REQUIRED, resourceType: 'wine' }],
    },
  ],
  [BUILDING_TYPES.LUXURY_EXTRACTOR]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 15,
      title: 'Refined extraction',
      description: 'Unlocks advanced luxury-resource output and resource-chain conditions.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'luxury_refinement' }],
    },
  ],
  [BUILDING_TYPES.FORESTERS_HOUSE]: [
    {
      level: 10,
      title: 'Managed woodland',
      description: 'Reaches +20% local wood production.',
      conditions: [
        { type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'improved_woodcutting' },
      ],
    },
    {
      level: 20,
      title: 'Organized lumber crews',
      description: 'Reaches +40% local wood production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'organized_labor' }],
    },
    {
      level: 30,
      title: 'Timber logistics',
      description: 'Reaches +60% local wood production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'basic_architecture' }],
    },
    {
      level: 40,
      title: 'Imperial forest office',
      description: 'Reaches +80% local wood production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'engineering_plans' }],
    },
    {
      level: 50,
      title: 'Master foresters',
      description: 'Maximum bonus: +100% local wood production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'administration' }],
    },
  ],
  [BUILDING_TYPES.MARBLE_MASON]: [
    {
      level: 10,
      title: 'Stonecutting crews',
      description: 'Reaches +20% local marble production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'basic_storage' }],
    },
    {
      level: 20,
      title: 'Refined marble yards',
      description: 'Reaches +40% local marble production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'luxury_refinement' }],
    },
    {
      level: 30,
      title: 'Stone masonry guild',
      description: 'Reaches +60% local marble production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'stone_masonry' }],
    },
    {
      level: 40,
      title: 'Imperial quarry contracts',
      description: 'Reaches +80% local marble production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'engineering_plans' }],
    },
    {
      level: 50,
      title: 'Master marble works',
      description: 'Maximum bonus: +100% local marble production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'administration' }],
    },
  ],
  [BUILDING_TYPES.VINEYARD_ESTATE]: [
    {
      level: 10,
      title: 'Managed vineyards',
      description: 'Reaches +20% local wine production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'basic_storage' }],
    },
    {
      level: 20,
      title: 'Refined cellars',
      description: 'Reaches +40% local wine production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'luxury_refinement' }],
    },
    {
      level: 30,
      title: 'Trade vintage',
      description: 'Reaches +60% local wine production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'market_exchange' }],
    },
    {
      level: 40,
      title: 'Imperial wine contracts',
      description: 'Reaches +80% local wine production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'engineering_plans' }],
    },
    {
      level: 50,
      title: 'Master vineyards',
      description: 'Maximum bonus: +100% local wine production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'administration' }],
    },
  ],
  [BUILDING_TYPES.CRYSTAL_LENSWORKS]: [
    {
      level: 10,
      title: 'Crystal sorting',
      description: 'Reaches +20% local crystal production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'basic_storage' }],
    },
    {
      level: 20,
      title: 'Refined lens grinding',
      description: 'Reaches +40% local crystal production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'luxury_refinement' }],
    },
    {
      level: 30,
      title: 'Optics laboratory',
      description: 'Reaches +60% local crystal production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'crystal_optics' }],
    },
    {
      level: 40,
      title: 'Imperial crystal contracts',
      description: 'Reaches +80% local crystal production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'engineering_plans' }],
    },
    {
      level: 50,
      title: 'Master lensworks',
      description: 'Maximum bonus: +100% local crystal production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'administration' }],
    },
  ],
  [BUILDING_TYPES.SULFUR_REFINERY]: [
    {
      level: 10,
      title: 'Sulfur sorting',
      description: 'Reaches +20% local sulfur production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'basic_storage' }],
    },
    {
      level: 20,
      title: 'Refined processing',
      description: 'Reaches +40% local sulfur production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'luxury_refinement' }],
    },
    {
      level: 30,
      title: 'Military contracts',
      description: 'Reaches +60% local sulfur production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'iron_weapons' }],
    },
    {
      level: 40,
      title: 'Imperial refinery',
      description: 'Reaches +80% local sulfur production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'engineering_plans' }],
    },
    {
      level: 50,
      title: 'Master refinery',
      description: 'Maximum bonus: +100% local sulfur production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'administration' }],
    },
  ],
  [BUILDING_TYPES.TRADING_POST]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 20,
      title: 'Market exchange',
      description: 'Unlocks advanced commerce requirements and trade efficiencies.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'market_exchange' }],
    },
  ],
  [BUILDING_TYPES.MARKETPLACE]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 5,
      title: 'Regional exchange',
      description: 'Raises the maximum load available for player-to-player offers.',
    },
  ],
  [BUILDING_TYPES.HOSPITAL]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 20,
      title: 'Public health network',
      description:
        'Creates a visible health backbone for high-population cities: lower pressure and faster recovery.',
      conditions: [{ type: CONDITION_TYPES.CITY_POPULATION_REQUIRED, population: 1200 }],
    },
  ],
  [BUILDING_TYPES.SHIPYARD]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 15,
      title: 'Military shipwrights',
      description: 'Unlocks stronger warship conditions and reinforced hull milestones.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'shipbuilding' }],
    },
    {
      level: 35,
      title: 'Naval command yard',
      description: 'Unlocks heavy warship and sea-control requirements.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'naval_tactics' }],
    },
  ],
  [BUILDING_TYPES.BUILDERS_GUILD]: [
    {
      level: 5,
      title: 'Organized labor',
      description: 'Reaches -5% building upgrade time.',
    },
    {
      level: 10,
      title: 'Construction crews',
      description: 'Improves building upgrade coordination and reaches -10% construction time.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'basic_architecture' }],
    },
    {
      level: 30,
      title: 'Imperial engineering office',
      description: 'Coordinates large works and reaches -30% construction time.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'engineering_plans' }],
    },
    {
      level: 40,
      title: 'Grand construction bureau',
      description: 'Reaches -40% construction time and supports endgame city development.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'administration' }],
    },
    {
      level: 50,
      title: 'Master builders',
      description: 'Maximum construction acceleration: -50% building upgrade time.',
    },
  ],
  [BUILDING_TYPES.WORKSHOP]: [
    {
      level: 5,
      title: 'Standard tools',
      description: 'Reaches -5% troop and warship training cost and time.',
    },
    {
      level: 10,
      title: 'Weapon fittings',
      description: 'Reaches -10% training cost and time.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'basic_training' }],
    },
    {
      level: 15,
      title: 'Armor templates',
      description: 'Reaches -15% training cost and time for Barracks and Shipyard.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'formation_tactics' }],
    },
    {
      level: 20,
      title: 'Siege components',
      description: 'Reaches -20% training cost and time.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'iron_weapons' }],
    },
    {
      level: 25,
      title: 'Ship fittings',
      description: 'Reaches -25% training cost and time and supports naval production.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'shipbuilding' }],
    },
    {
      level: 30,
      title: 'Master engineering',
      description: 'Maximum Workshop efficiency: -30% troop and warship cost and time.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'naval_tactics' }],
    },
  ],
  [BUILDING_TYPES.PALACE]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 30,
      title: 'Imperial court',
      description: 'Unlocks advanced empire administration and colony authority.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'administration' }],
    },
  ],
  [BUILDING_TYPES.GOVERNOR_RESIDENCY]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 25,
      title: 'Regional command',
      description: 'Improves non-capital city autonomy and future regional bonuses.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'administration' }],
    },
  ],
  [BUILDING_TYPES.WALL]: [
    ...STANDARD_BUILDING_MILESTONES,
    {
      level: 25,
      title: 'Fortified perimeter',
      description: 'Unlocks advanced wall defenses and defensive research requirements.',
      conditions: [{ type: CONDITION_TYPES.RESEARCH_REQUIRED, technologyId: 'wall_engineering' }],
    },
  ],
  [BUILDING_TYPES.SPY_AGENCY]: [
    {
      level: 2,
      title: 'Local informants',
      description: 'Improves spy mission success and defensive awareness.',
    },
    {
      level: 5,
      title: 'Counter-intelligence office',
      description: 'Maximum Sprint 18 scouting coverage and counter-spy defense.',
    },
  ],
};

export const BUILDING_UPGRADE_CONFIG = {
  [BUILDING_TYPES.CITY_HALL]: {
    maxLevel: 50,
    baseCost: {
      wood: 120,
      gold: 50,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.6,
    baseDurationSeconds: 60,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.WAREHOUSE]: {
    maxLevel: 50,
    baseCost: {
      wood: 100,
      gold: 40,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.5,
    baseDurationSeconds: 45,
    durationMultiplier: 1.4,
  },
  [BUILDING_TYPES.PORT]: {
    maxLevel: 50,
    baseCost: {
      wood: 180,
      gold: 100,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.6,
    baseDurationSeconds: 120,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.BARRACKS]: {
    maxLevel: 50,
    baseCost: {
      wood: 150,
      gold: 60,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.6,
    baseDurationSeconds: 90,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.ACADEMY]: {
    maxLevel: 50,
    baseCost: {
      wood: 150,
      gold: 80,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.7,
    baseDurationSeconds: 90,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.TAVERN]: {
    maxLevel: 50,
    baseCost: {
      wood: 120,
      gold: 60,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.5,
    baseDurationSeconds: 75,
    durationMultiplier: 1.4,
  },
  [BUILDING_TYPES.LUXURY_EXTRACTOR]: {
    maxLevel: 50,
    baseCost: {
      wood: 160,
      gold: 80,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.65,
    baseDurationSeconds: 100,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.FORESTERS_HOUSE]: {
    maxLevel: 50,
    baseCost: {
      wood: 120,
      gold: 70,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.55,
    baseDurationSeconds: 80,
    durationMultiplier: 1.45,
  },
  [BUILDING_TYPES.MARBLE_MASON]: {
    maxLevel: 50,
    baseCost: {
      wood: 130,
      gold: 80,
      marble: 20,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.58,
    baseDurationSeconds: 90,
    durationMultiplier: 1.48,
  },
  [BUILDING_TYPES.VINEYARD_ESTATE]: {
    maxLevel: 50,
    baseCost: {
      wood: 130,
      gold: 80,
      marble: 0,
      wine: 20,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.58,
    baseDurationSeconds: 90,
    durationMultiplier: 1.48,
  },
  [BUILDING_TYPES.CRYSTAL_LENSWORKS]: {
    maxLevel: 50,
    baseCost: {
      wood: 140,
      gold: 90,
      marble: 0,
      wine: 0,
      crystal: 20,
      sulfur: 0,
    },
    costMultiplier: 1.6,
    baseDurationSeconds: 95,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.SULFUR_REFINERY]: {
    maxLevel: 50,
    baseCost: {
      wood: 140,
      gold: 90,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 20,
    },
    costMultiplier: 1.6,
    baseDurationSeconds: 95,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.TRADING_POST]: {
    maxLevel: 50,
    baseCost: {
      wood: 140,
      gold: 120,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.55,
    baseDurationSeconds: 90,
    durationMultiplier: 1.45,
  },
  [BUILDING_TYPES.MARKETPLACE]: {
    maxLevel: 5,
    baseCost: {
      wood: 250,
      gold: 150,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.7,
    baseDurationSeconds: 180,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.HOSPITAL]: {
    maxLevel: 50,
    baseCost: {
      wood: 160,
      gold: 100,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.6,
    baseDurationSeconds: 110,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.SHIPYARD]: {
    maxLevel: 5,
    baseCost: {
      wood: 350,
      gold: 250,
      marble: 150,
      wine: 0,
      crystal: 0,
      sulfur: 100,
    },
    costMultiplier: 1.7,
    baseDurationSeconds: 240,
    durationMultiplier: 1.5,
  },
  [BUILDING_TYPES.BUILDERS_GUILD]: {
    maxLevel: 50,
    baseCost: {
      wood: 180,
      gold: 120,
      marble: 20,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.58,
    baseDurationSeconds: 100,
    durationMultiplier: 1.45,
  },
  [BUILDING_TYPES.WORKSHOP]: {
    maxLevel: 30,
    baseCost: {
      wood: 170,
      gold: 110,
      marble: 10,
      wine: 0,
      crystal: 0,
      sulfur: 5,
    },
    costMultiplier: 1.62,
    baseDurationSeconds: 110,
    durationMultiplier: 1.48,
  },
  [BUILDING_TYPES.PALACE]: {
    maxLevel: 50,
    baseCost: {
      wood: 300,
      gold: 200,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 2,
    baseDurationSeconds: 180,
    durationMultiplier: 1.8,
  },
  [BUILDING_TYPES.GOVERNOR_RESIDENCY]: {
    maxLevel: 50,
    baseCost: {
      wood: 250,
      gold: 160,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.8,
    baseDurationSeconds: 180,
    durationMultiplier: 1.8,
  },
  [BUILDING_TYPES.WALL]: {
    maxLevel: 50,
    baseCost: {
      wood: 180,
      gold: 80,
      marble: 0,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.45,
    baseDurationSeconds: 90,
    durationMultiplier: 1.35,
  },
  [BUILDING_TYPES.SPY_AGENCY]: {
    maxLevel: 5,
    baseCost: {
      wood: 300,
      gold: 250,
      marble: 100,
      wine: 0,
      crystal: 0,
      sulfur: 0,
    },
    costMultiplier: 1.7,
    baseDurationSeconds: 240,
    durationMultiplier: 1.5,
  },
} as const;

export const WALL_COMBAT_CONFIG = {
  hitPointsPerLevel: 50,
  armorPerLevel: 4,
  baseDamage: 6,
  damagePerLevel: 2,
  level10DamageBonus: 15,
  level20DamageBonus: 25,
  baseAccuracy: 0.45,
  level10Accuracy: 0.6,
  level20Accuracy: 0.8,
  baseSections: 2,
  sectionsPerCityHallLevel: 1,
  maxSections: 7,
} as const;
