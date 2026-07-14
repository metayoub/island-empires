import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DevelopmentStateService } from './development-state.service';

@Controller('bootstrap')
@UseGuards(AuthGuard)
export class PlayersController {
  constructor(private readonly developmentStateService: DevelopmentStateService) {}

  @Get()
  bootstrap() {
    return this.developmentStateService.ensureDevelopmentState();
  }
}
