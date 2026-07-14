import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DevelopmentStateService } from '../players/development-state.service';
import { QuestsService } from '../quests/quests.service';
import { ResearchService } from './research.service';

@Controller('research')
@UseGuards(AuthGuard)
export class ResearchController {
  constructor(
    private readonly researchService: ResearchService,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly questsService: QuestsService,
  ) {}

  @Get()
  async getResearchOverview() {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();

    return this.researchService.getResearchOverview(bootstrap.player.id);
  }

  @Post(':technologyId/start')
  async startResearch(@Param('technologyId') technologyId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const result = await this.researchService.startResearch(bootstrap.player.id, technologyId);
    await this.questsService.handleQuestTrigger(bootstrap.player.id, 'research_started');

    return result;
  }
}
