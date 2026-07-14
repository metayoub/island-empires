import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { QuestTrigger } from '@island-empires/config';
import { AuthGuard } from '../auth/auth.guard';
import { DevelopmentStateService } from '../players/development-state.service';
import { QuestsService } from './quests.service';

@Controller('quests')
@UseGuards(AuthGuard)
export class QuestsController {
  constructor(
    private readonly questsService: QuestsService,
    private readonly developmentStateService: DevelopmentStateService,
  ) {}

  @Get()
  async getQuestOverview() {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();

    return this.questsService.getQuestOverview(bootstrap.player.id);
  }

  @Post(':questId/claim')
  async claimQuestReward(@Param('questId') questId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();

    return this.questsService.claimQuestReward(bootstrap.player.id, questId);
  }

  @Post('triggers')
  async handleQuestTrigger(@Body() body: { trigger: QuestTrigger; payload?: Record<string, unknown> }) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();

    await this.questsService.handleQuestTrigger(bootstrap.player.id, body.trigger, body.payload ?? {});

    return this.questsService.getQuestOverview(bootstrap.player.id);
  }
}
