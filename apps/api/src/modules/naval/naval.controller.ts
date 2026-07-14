import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { NavalAttackDto } from './dto/naval-attack.dto';
import { NavalService } from './naval.service';

@Controller('naval')
@UseGuards(AuthGuard)
export class NavalController {
  constructor(private readonly navalService: NavalService) {}

  @Get('cities/:targetCityId/attack-options')
  getAttackOptions(@Param('targetCityId') targetCityId: string, @Query('originCityId') originCityId?: string) {
    return this.navalService.getAttackOptions(targetCityId, originCityId || undefined);
  }

  @Post('cities/:targetCityId/attack')
  attackCity(@Param('targetCityId') targetCityId: string, @Body() dto: NavalAttackDto) {
    return this.navalService.attackCity(targetCityId, dto);
  }

  @Get('movements')
  getMovements() {
    return this.navalService.getNavalMovements();
  }

  @Get('blockades')
  getBlockades() {
    return this.navalService.getActiveBlockades();
  }
}
