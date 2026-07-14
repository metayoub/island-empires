import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  inGameEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  browserPushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  constructionCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  researchCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  tradeArrived?: boolean;

  @IsOptional()
  @IsBoolean()
  armyReturned?: boolean;

  @IsOptional()
  @IsBoolean()
  incomingAttack?: boolean;

  @IsOptional()
  @IsBoolean()
  allianceMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  warehouseFull?: boolean;

  @IsOptional()
  @IsBoolean()
  eventEnding?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursStart?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursEnd?: number | null;
}
