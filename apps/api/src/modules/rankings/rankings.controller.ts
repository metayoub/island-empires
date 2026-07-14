import { Controller, Get, Query } from '@nestjs/common';
import { RankingsService } from './rankings.service';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('players')
  getPlayerRankings(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.rankingsService.getPlayerRankings({
      type,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('alliances')
  getAllianceRankings(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.rankingsService.getAllianceRankings({
      type,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }
}
