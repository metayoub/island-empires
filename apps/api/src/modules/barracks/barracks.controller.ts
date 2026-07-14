import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { TrainUnitsDto } from './dto/train-units.dto';
import { BarracksService } from './barracks.service';

@Controller('cities')
@UseGuards(AuthGuard)
export class BarracksController {
  constructor(private readonly barracksService: BarracksService) {}

  @Get(':cityId/barracks')
  getBarracksOverview(@Param('cityId') cityId: string) {
    return this.barracksService.getBarracksOverview(cityId);
  }

  @Get(':cityId/shipyard')
  getShipyardOverview(@Param('cityId') cityId: string) {
    return this.barracksService.getShipyardOverview(cityId);
  }

  @Post(':cityId/barracks/train')
  trainUnits(@Param('cityId') cityId: string, @Body() dto: TrainUnitsDto) {
    return this.barracksService.trainUnits(cityId, dto);
  }

  @Post(':cityId/shipyard/train')
  trainShipyardUnits(@Param('cityId') cityId: string, @Body() dto: TrainUnitsDto) {
    return this.barracksService.trainUnits(cityId, dto);
  }
}
