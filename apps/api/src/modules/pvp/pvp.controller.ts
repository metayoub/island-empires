import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AttackPlayerCityDto } from './dto/attack-player-city.dto';
import { PvpService } from './pvp.service';

@Controller('pvp')
@UseGuards(AuthGuard)
export class PvpController {
  constructor(private readonly pvpService: PvpService) {}

  @Get('cities/:targetCityId/attack-options')
  getAttackOptions(@Param('targetCityId') targetCityId: string, @Query('originCityId') originCityId?: string) {
    return this.pvpService.getAttackOptions(targetCityId, originCityId || undefined);
  }

  @Post('cities/:targetCityId/attack')
  attackCity(@Param('targetCityId') targetCityId: string, @Body() dto: AttackPlayerCityDto) {
    return this.pvpService.attackCity(targetCityId, dto);
  }

  @Get('movements')
  getMovements() {
    return this.pvpService.getPvpMovements();
  }
}
