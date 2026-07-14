import { IsIn, IsInt, Min } from 'class-validator';
import { UNIT_TYPES } from '@island-empires/config';
import type { UnitType } from '@island-empires/shared-types';

export class TrainUnitsDto {
  @IsIn(Object.values(UNIT_TYPES))
  unitType!: UnitType;

  @IsInt()
  @Min(1)
  quantity!: number;
}
