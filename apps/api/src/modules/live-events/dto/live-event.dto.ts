import {
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { EVENT_TYPES } from '@island-empires/config';
import type { LiveEventReward, LiveEventType } from '@island-empires/shared-types';

const LIVE_EVENT_TYPES = Object.values(EVENT_TYPES);

export class LaunchLiveEventDto {
  @IsString()
  @IsIn(LIVE_EVENT_TYPES)
  type!: LiveEventType;

  @IsOptional()
  @IsString()
  @Length(3, 80)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(3, 500)
  description?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  announcement?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  bonusPercent?: number;

  @IsOptional()
  @IsObject()
  reward?: LiveEventReward;
}

export class RecordLiveEventParticipationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  actionCount?: number;
}
