import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PveService } from './pve.service';

@Controller('movements')
@UseGuards(AuthGuard)
export class ArmyMovementsController {
  constructor(private readonly pveService: PveService) {}

  @Get('army')
  getArmyMovements() {
    return this.pveService.getArmyMovements();
  }
}
