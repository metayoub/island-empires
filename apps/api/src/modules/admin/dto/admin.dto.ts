import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const ADMIN_ROLES = ['super_admin', 'operator', 'moderator', 'support', 'viewer'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export class AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class AdminAuditQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  playerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}

export class AdminModerationActionDto {
  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  publicMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 365)
  durationHours?: number;
}

export class AdminNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class AdminReviewReportDto {
  @IsIn(['resolved', 'dismissed'])
  status!: 'resolved' | 'dismissed';

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolutionNote?: string;
}

export class AdminRevokeModerationActionDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class AdminAbuseSignalQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  signalType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  riskLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  playerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  actionType?: string;
}

export class AdminReviewAbuseSignalDto {
  @IsIn(['open', 'reviewing', 'resolved', 'dismissed', 'false_positive', 'escalated'])
  status!: 'open' | 'reviewing' | 'resolved' | 'dismissed' | 'false_positive' | 'escalated';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolutionNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}

export class AdminAssignAbuseSignalDto {
  @IsString()
  @MaxLength(80)
  adminUserId!: string;
}
