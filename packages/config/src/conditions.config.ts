export const CONDITION_TYPES = {
  RESOURCE_REQUIRED: 'resource_required',
  BUILDING_LEVEL_REQUIRED: 'building_level_required',
  RESEARCH_REQUIRED: 'research_required',
  CITY_POPULATION_REQUIRED: 'city_population_required',
  CITY_HAPPINESS_REQUIRED: 'city_happiness_required',
  ISLAND_RESOURCE_REQUIRED: 'island_resource_required',
  WAREHOUSE_CAPACITY_REQUIRED: 'warehouse_capacity_required',
  PREVIOUS_UNIT_REQUIRED: 'previous_unit_required',
} as const;

export type ConditionType = (typeof CONDITION_TYPES)[keyof typeof CONDITION_TYPES];

export type UnlockCondition =
  | {
      type: typeof CONDITION_TYPES.RESOURCE_REQUIRED;
      resourceType: 'wood' | 'gold' | 'marble' | 'wine' | 'crystal' | 'sulfur';
      amount: number;
    }
  | {
      type: typeof CONDITION_TYPES.BUILDING_LEVEL_REQUIRED;
      buildingType: string;
      level: number;
    }
  | {
      type: typeof CONDITION_TYPES.RESEARCH_REQUIRED;
      technologyId: string;
      level?: number;
    }
  | {
      type: typeof CONDITION_TYPES.CITY_POPULATION_REQUIRED;
      population: number;
    }
  | {
      type: typeof CONDITION_TYPES.CITY_HAPPINESS_REQUIRED;
      happiness: number;
    }
  | {
      type: typeof CONDITION_TYPES.ISLAND_RESOURCE_REQUIRED;
      resourceType: 'marble' | 'wine' | 'crystal' | 'sulfur';
    }
  | {
      type: typeof CONDITION_TYPES.WAREHOUSE_CAPACITY_REQUIRED;
      capacity: number;
    }
  | {
      type: typeof CONDITION_TYPES.PREVIOUS_UNIT_REQUIRED;
      unitType: string;
      quantity: number;
    };

export type ConditionSummary = UnlockCondition & {
  label: string;
  met?: boolean;
  current?: number | string;
};
