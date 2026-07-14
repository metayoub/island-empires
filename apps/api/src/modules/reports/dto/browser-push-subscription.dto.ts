import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

class BrowserPushKeysDto {
  @IsString()
  p256dh!: string;

  @IsString()
  auth!: string;
}

export class BrowserPushSubscriptionDto {
  @IsUrl({ require_tld: false })
  endpoint!: string;

  @ValidateNested()
  @Type(() => BrowserPushKeysDto)
  keys!: BrowserPushKeysDto;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
