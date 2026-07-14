import { Controller, Get, Query } from '@nestjs/common';
import { AdvancedSearchService } from './advanced-search.service';

@Controller('search')
export class AdvancedSearchController {
  constructor(private readonly advancedSearchService: AdvancedSearchService) {}

  @Get('players/advanced')
  searchPlayers(@Query() query: Record<string, string>) {
    return this.advancedSearchService.searchPlayers(query);
  }

  @Get('cities/advanced')
  searchCities(@Query() query: Record<string, string>) {
    return this.advancedSearchService.searchCities(query);
  }

  @Get('alliances/advanced')
  searchAlliances(@Query() query: Record<string, string>) {
    return this.advancedSearchService.searchAlliances(query);
  }

  @Get('marketplace/advanced')
  searchMarketplace(@Query() query: Record<string, string>) {
    return this.advancedSearchService.searchMarketplace(query);
  }
}
