export const BUILDING_UPGRADE_COMPLETE_JOB = 'building.upgrade.complete';

export type BuildingUpgradeCompleteJobPayload = {
  cityId: string;
  buildingId: string;
  buildingType: string;
};

export const RESEARCH_COMPLETE_JOB = 'research.complete';

export type ResearchCompleteJobPayload = {
  playerId: string;
  researchJobId: string;
  technologyId: string;
};

export const RESOURCE_TRANSPORT_ARRIVE_JOB = 'movement.transport.arrive';
export const RESOURCE_TRANSPORT_RETURN_JOB = 'movement.transport.return';

export type MovementJobPayload = {
  movementId: string;
};

export const UNIT_TRAINING_COMPLETE_JOB = 'unit.training.complete';

export type UnitTrainingCompleteJobPayload = {
  trainingOrderId: string;
};

export const PVE_ATTACK_ARRIVE_JOB = 'movement.pve.arrive';
export const PVE_RETURN_JOB = 'movement.pve.return';

export const PVP_ATTACK_ARRIVE_JOB = 'movement.pvp.arrive';
export const PVP_RETURN_JOB = 'movement.pvp.return';

export const SPY_TRAINING_COMPLETE_JOB = 'spy.training.complete';

export type SpyTrainingCompleteJobPayload = {
  spyTrainingJobId: string;
};

export const SPY_MISSION_ARRIVE_JOB = 'movement.spy.arrive';
export const SPY_RETURN_JOB = 'movement.spy.return';
