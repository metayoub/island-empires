import { IsObject, IsString } from 'class-validator';
import type { ArmyUnits } from '@island-empires/shared-types';

export class AttackPlayerCityDto {
  @IsString()
  originCityId!: string;

  @IsObject()
  units!: ArmyUnits;
}
