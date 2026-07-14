import { IsBoolean, IsEmail, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

const DISPLAY_NAME_PATTERN = /^[A-Za-z0-9 -]+$/;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @Length(3, 30)
  @Matches(DISPLAY_NAME_PATTERN)
  displayName!: string;

  @IsBoolean()
  acceptTerms!: boolean;

  @IsBoolean()
  acceptPrivacy!: boolean;

  @IsOptional()
  @IsString()
  @Length(3, 80)
  inviteCode?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

export class ConfirmPasswordResetDto {
  @IsString()
  @MinLength(16)
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ConfirmEmailVerificationDto {
  @IsString()
  @MinLength(16)
  token!: string;
}
