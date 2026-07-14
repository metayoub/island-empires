import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AttackPveCampDto } from './dto/attack-pve-camp.dto';
import { PveService } from './pve.service';

@Controller('pve-camps')
@UseGuards(AuthGuard)
export class PveController {
  constructor(private readonly pveService: PveService) {}

  @Get()
  getCamps() {
    return this.pveService.getCamps();
  }

  @Get(':campId')
  getCampDetail(@Param('campId') campId: string, @Query('originCityId') originCityId?: string) {
    return this.pveService.getCampDetail(campId, originCityId || undefined);
  }

  @Post(':campId/attack')
  attackCamp(@Param('campId') campId: string, @Body() dto: AttackPveCampDto) {
    return this.pveService.attackCamp(campId, dto);
  }
}
