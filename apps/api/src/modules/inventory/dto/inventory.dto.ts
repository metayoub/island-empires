import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

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
  pageSize?: number = 30;
}

export class UseInventoryItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number = 1;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  payload?: { newName?: string };
}

export class EquipInventoryItemDto {
  @IsString()
  cosmeticSlot!: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  allianceId?: string;
}

export class UnequipCosmeticDto {
  @IsString()
  cosmeticSlot!: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  allianceId?: string;
}

export class AdminInventoryQueryDto extends InventoryQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  playerId?: string;

  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  transactionType?: string;
}

export class AdminGrantInventoryDto {
  @IsString()
  playerId!: string;

  @IsString()
  itemId!: string;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  quantity!: number;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
