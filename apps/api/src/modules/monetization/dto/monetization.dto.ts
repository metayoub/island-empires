import {
  IsEmail,
  IsIn,
  IsOptional,
  IsObject,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

const MONETIZATION_TARGET_TYPES = ['city', 'player', 'alliance'] as const;

export class CreatePremiumCurrencyPurchaseDto {
  @IsString()
  @Length(3, 80)
  packageId!: string;

  @IsString()
  @Length(3, 40)
  provider!: string;

  @IsString()
  @Length(3, 120)
  providerPaymentId!: string;

  @IsOptional()
  @IsEmail()
  receiptEmail?: string;
}

export class PurchasePremiumItemDto {
  @IsString()
  @Length(3, 80)
  itemId!: string;

  @IsOptional()
  @IsString()
  @IsIn(MONETIZATION_TARGET_TYPES)
  targetType?: 'city' | 'player' | 'alliance';

  @IsOptional()
  @IsString()
  @Length(3, 80)
  targetId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 32)
  newName?: string;
}

export class RequestPremiumRefundDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class CreateCheckoutSessionDto {
  @IsString()
  @Length(3, 80)
  productId!: string;
}

export class PurchaseWithGemsDto {
  @IsString()
  @Length(3, 80)
  productId!: string;

  @IsOptional()
  @IsObject()
  payload?: {
    cityId?: string;
    allianceId?: string;
    newName?: string;
  };
}

export class PaymentWebhookDto {
  @IsString()
  @Length(3, 120)
  eventId!: string;

  @IsString()
  @Length(3, 80)
  eventType!: string;

  @IsString()
  @Length(3, 80)
  providerSessionId!: string;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  providerPaymentId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  signature?: string;
}

export class EquipCosmeticDto {
  @IsString()
  @Length(3, 80)
  itemId!: string;
}

export class UnequipCosmeticDto {
  @IsString()
  @IsIn(['city_skin', 'avatar_frame', 'alliance_banner'])
  itemType!: 'city_skin' | 'avatar_frame' | 'alliance_banner';
}
