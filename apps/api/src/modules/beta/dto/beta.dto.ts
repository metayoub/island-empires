import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const BETA_FEEDBACK_CATEGORIES = [
  'bug',
  'confusing',
  'balance',
  'suggestion',
  'performance',
  'positive',
  'other',
] as const;

export const BETA_FEEDBACK_STATUSES = [
  'open',
  'reviewing',
  'planned',
  'fixed',
  'dismissed',
  'archived',
] as const;

export class ValidateBetaInviteDto {
  @IsString()
  @Length(3, 80)
  code!: string;
}

export class SubmitBetaFeedbackDto {
  @IsIn(BETA_FEEDBACK_CATEGORIES)
  category!: (typeof BETA_FEEDBACK_CATEGORIES)[number];

  @IsString()
  @Length(3, 120)
  title!: string;

  @IsString()
  @Length(10, 3000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  page?: string;
}

export class CreateBetaInviteDto {
  @IsString()
  @Length(3, 80)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cohort?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  maxUses?: number;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class CreateBetaAllowlistDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cohort?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class UpdateBetaAllowlistDto {
  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cohort?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class UpdateBetaInviteDto {
  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cohort?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  maxUses?: number;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}

export class AdminBetaFeedbackQueryDto {
  @IsOptional()
  @IsIn(BETA_FEEDBACK_STATUSES)
  status?: (typeof BETA_FEEDBACK_STATUSES)[number];

  @IsOptional()
  @IsIn(BETA_FEEDBACK_CATEGORIES)
  category?: (typeof BETA_FEEDBACK_CATEGORIES)[number];

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

export class UpdateBetaFeedbackDto {
  @IsIn(BETA_FEEDBACK_STATUSES)
  status!: (typeof BETA_FEEDBACK_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
