import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { StartSpyMissionRequest } from '@island-empires/shared-types';
import { ScoutingService } from './scouting.service';
import { StartSpyMissionDto } from './dto/start-spy-mission.dto';
import { TrainSpiesDto } from './dto/train-spies.dto';

@Controller()
@UseGuards(AuthGuard)
export class ScoutingController {
  constructor(private readonly scoutingService: ScoutingService) {}

  @Get('cities/:cityId/spies')
  getSpyOverview(@Param('cityId') cityId: string) {
    return this.scoutingService.getSpyOverview(cityId);
  }

  @Post('cities/:cityId/spies/train')
  trainSpies(@Param('cityId') cityId: string, @Body() dto: TrainSpiesDto) {
    return this.scoutingService.trainSpies(cityId, dto);
  }

  @Get('scouting/options')
  getMissionOptions(
    @Query('originCityId') originCityId: string,
    @Query('targetCityId') targetCityId: string,
  ) {
    return this.scoutingService.getMissionOptions({ originCityId, targetCityId });
  }

  @Post('scouting/missions')
  startMission(@Body() dto: StartSpyMissionDto) {
    return this.scoutingService.startMission(dto as StartSpyMissionRequest);
  }

  @Get('scouting/missions')
  getMyMissions() {
    return this.scoutingService.getMyMissions();
  }

  @Post('scouting/reports/:messageId/share-alliance')
  shareReportWithAlliance(@Param('messageId') messageId: string) {
    return this.scoutingService.shareReportWithAlliance(messageId);
  }
}
