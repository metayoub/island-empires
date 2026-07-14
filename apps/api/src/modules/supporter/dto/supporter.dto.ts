import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSupportCheckoutDto {
  @IsString()
  supporterPackId!: string;
}

export class SupporterHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class PaymentWebhookDto {
  @IsString()
  eventId!: string;

  @IsString()
  eventType!: string;

  @IsString()
  providerSessionId!: string;

  @IsOptional()
  @IsString()
  providerPaymentId?: string;

  @IsOptional()
  @IsString()
  providerRefundId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  amountCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsString()
  signature!: string;
}

export class AdminDonationQueryDto extends SupporterHistoryQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class RecordDonationRefundDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountCents?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  providerRefundId?: string;
}
