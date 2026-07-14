import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

const RESOURCE_TYPES = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;
const PROJECT_TYPES = ['trade_harbor', 'research_library', 'defensive_monument', 'island_festival'] as const;

export class AllianceMessageDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;
}

export class InvitePlayerDto extends AllianceMessageDto {
  @IsString()
  playerId!: string;
}

export class CreateAllianceChatMessageDto {
  @IsString()
  @Length(1, 1000)
  body!: string;
}

export class CreateAllianceAnnouncementDto {
  @IsString()
  @Length(3, 80)
  title!: string;

  @IsString()
  @Length(1, 2000)
  body!: string;
}

export class UpdateAllianceProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 40)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 5)
  tag?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;
}

export class UpdateAllianceRoleDto {
  @IsString()
  role!: 'leader' | 'officer' | 'recruiter' | 'member';
}

export class DonateToAllianceDto {
  @IsString()
  cityId!: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsInt()
  @Min(0)
  wood = 0;

  @IsInt()
  @Min(0)
  gold = 0;

  @IsInt()
  @Min(0)
  marble = 0;

  @IsInt()
  @Min(0)
  wine = 0;

  @IsInt()
  @Min(0)
  crystal = 0;

  @IsInt()
  @Min(0)
  sulfur = 0;
}

export class StartAllianceProjectDto {
  @IsString()
  @IsIn(PROJECT_TYPES)
  projectType!: (typeof PROJECT_TYPES)[number];
}

export class CreateAllianceHelpRequestDto {
  @IsString()
  @IsIn(['resources', 'defense', 'advice'])
  kind!: 'resources' | 'defense' | 'advice';

  @IsString()
  @Length(3, 500)
  message!: string;

  @IsOptional()
  @IsString()
  cityId?: string;
}

export class CreateAllianceTradeRequestDto {
  @IsString()
  @IsIn(RESOURCE_TYPES)
  offeredResource!: (typeof RESOURCE_TYPES)[number];

  @IsInt()
  @Min(1)
  offeredAmount!: number;

  @IsString()
  @IsIn(RESOURCE_TYPES)
  requestedResource!: (typeof RESOURCE_TYPES)[number];

  @IsInt()
  @Min(1)
  requestedAmount!: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;
}

export class ShareAllianceBattleReportDto {
  @IsString()
  reportId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  message?: string;
}
