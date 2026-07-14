import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DevelopmentStateService } from '../players/development-state.service';
import { GuideService } from './guide.service';

@Controller('guide')
@UseGuards(AuthGuard)
export class GuideController {
  constructor(
    private readonly guideService: GuideService,
    private readonly developmentStateService: DevelopmentStateService,
  ) {}

  @Get('next-action')
  async getNextAction() {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const action = await this.guideService.getNextRecommendedAction(bootstrap.player.id);

    return { action };
  }
}
