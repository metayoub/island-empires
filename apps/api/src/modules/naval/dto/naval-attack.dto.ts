import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import type { NavalShips } from '@island-empires/shared-types';

export class NavalAttackDto {
  @IsString()
  originCityId!: string;

  @IsObject()
  ships!: Partial<NavalShips>;

  @IsOptional()
  @IsBoolean()
  establishBlockade?: boolean;
}
