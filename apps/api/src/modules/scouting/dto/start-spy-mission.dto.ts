import { IsIn, IsString } from 'class-validator';
import { SPY_MISSION_TYPES } from '@island-empires/config';

export class StartSpyMissionDto {
  @IsString()
  originCityId!: string;

  @IsString()
  targetCityId!: string;

  @IsIn(Object.values(SPY_MISSION_TYPES))
  missionType!: string;
}
