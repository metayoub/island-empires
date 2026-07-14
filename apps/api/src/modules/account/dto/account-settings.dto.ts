import { IsBoolean, IsObject, IsOptional, IsString, Length, Matches } from 'class-validator';

const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9 -]+$/;

class PrivacySettingsDto {
  @IsBoolean()
  @IsOptional()
  showProfile?: boolean;
}

export class UpdateAccountSettingsDto {
  @IsString()
  @Length(3, 30)
  @Matches(DISPLAY_NAME_PATTERN)
  @IsOptional()
  displayName?: string;

  @IsObject()
  @IsOptional()
  privacy?: PrivacySettingsDto;
}
