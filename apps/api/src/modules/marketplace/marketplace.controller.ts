import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AcceptMarketplaceOfferDto } from './dto/accept-marketplace-offer.dto';
import { CreateMarketplaceOfferDto } from './dto/create-marketplace-offer.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post('offers')
  createOffer(@Body() body: CreateMarketplaceOfferDto) {
    return this.marketplaceService.createOffer(body);
  }

  @Get('offers')
  listOffers(
    @Query('offeredResource') offeredResource?: string,
    @Query('requestedResource') requestedResource?: string,
    @Query('offerType') offerType?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.marketplaceService.listOffers({
      offeredResource,
      requestedResource,
      offerType,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Post('offers/:offerId/accept')
  acceptOffer(@Param('offerId') offerId: string, @Body() body: AcceptMarketplaceOfferDto) {
    return this.marketplaceService.acceptOffer(offerId, body);
  }

  @Post('offers/:offerId/cancel')
  cancelOffer(@Param('offerId') offerId: string) {
    return this.marketplaceService.cancelOffer(offerId);
  }

  @Get('my-offers')
  listMyOffers(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.marketplaceService.listMyOffers({ page: Number(page), pageSize: Number(pageSize) });
  }

  @Get('trade-history')
  getTradeHistory(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.marketplaceService.getTradeHistory({ page: Number(page), pageSize: Number(pageSize) });
  }
}
