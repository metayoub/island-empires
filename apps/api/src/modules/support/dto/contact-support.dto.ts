import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const SUPPORT_CATEGORIES = [
  'account',
  'payment',
  'bug',
  'gameplay',
  'abuse_report',
  'other',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export class ContactSupportDto {
  @IsIn(SUPPORT_CATEGORIES)
  category!: SupportCategory;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  playerId?: string;

  @IsString()
  @MaxLength(240)
  @IsOptional()
  userEmail?: string;
}
