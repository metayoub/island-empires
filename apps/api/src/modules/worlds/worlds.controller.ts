import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { WorldsService } from './worlds.service';

@Controller()
@UseGuards(AuthGuard)
export class WorldsController {
  constructor(private readonly worldsService: WorldsService) {}

  @Get('worlds/:worldId/rankings')
  getRankings(@Param('worldId') worldId: string, @Query('limit') limit?: string) {
    return this.worldsService.getRankings(worldId, Number(limit));
  }

  @Get('worlds/:worldId/population-stats')
  getPopulationStats(@Param('worldId') worldId: string) {
    return this.worldsService.getPopulationStats(worldId);
  }

  @Get('worlds/:worldId/players/search')
  searchPlayers(
    @Param('worldId') worldId: string,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    return this.worldsService.searchPlayers({ worldId, query, limit: Number(limit) });
  }

  @Get('worlds/:worldId/cities/search')
  searchCities(
    @Param('worldId') worldId: string,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    return this.worldsService.searchCities({ worldId, query, limit: Number(limit) });
  }

  @Get('players/:playerId/profile')
  getPlayerProfile(@Param('playerId') playerId: string) {
    return this.worldsService.getPlayerProfile(playerId);
  }
}
