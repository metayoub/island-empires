import { IsString } from 'class-validator';

export class AcceptMarketplaceOfferDto {
  @IsString()
  acceptingCityId!: string;
}
