import { IsIn, IsInt, IsString, Min } from 'class-validator';

const RESOURCE_TYPES = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;

export class CreateMarketplaceOfferDto {
  @IsString()
  creatorCityId!: string;

  @IsIn(['sell_offer', 'buy_offer'])
  offerType!: 'sell_offer' | 'buy_offer';

  @IsIn(RESOURCE_TYPES)
  offeredResource!: (typeof RESOURCE_TYPES)[number];

  @IsInt()
  @Min(1)
  offeredAmount!: number;

  @IsIn(RESOURCE_TYPES)
  requestedResource!: (typeof RESOURCE_TYPES)[number];

  @IsInt()
  @Min(1)
  requestedAmount!: number;
}
