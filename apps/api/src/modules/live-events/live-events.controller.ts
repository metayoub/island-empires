import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DevelopmentStateService } from '../players/development-state.service';
import { LaunchLiveEventDto, RecordLiveEventParticipationDto } from './dto/live-event.dto';
import { LiveEventsService } from './live-events.service';

@Controller('live-events')
@UseGuards(AuthGuard)
export class LiveEventsController {
  constructor(
    private readonly liveEventsService: LiveEventsService,
    private readonly developmentStateService: DevelopmentStateService,
  ) {}

  @Get()
  async listEvents() {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.liveEventsService.listEvents(bootstrap.player.id, bootstrap.world.id);
  }

  @Get(':eventId')
  async getEvent(@Param('eventId') eventId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.liveEventsService.getEvent(eventId, bootstrap.player.id, bootstrap.world.id);
  }

  @Post(':eventId/join')
  async joinEvent(@Param('eventId') eventId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.liveEventsService.joinEvent(eventId, bootstrap.player.id, bootstrap.world.id);
  }

  @Post(':eventId/participate')
  async recordParticipation(
    @Param('eventId') eventId: string,
    @Body() dto: RecordLiveEventParticipationDto,
  ) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.liveEventsService.recordParticipation({
      eventId,
      playerId: bootstrap.player.id,
      worldId: bootstrap.world.id,
      actionCount: dto.actionCount,
    });
  }

  @Post(':eventId/claim')
  async claimReward(@Param('eventId') eventId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.liveEventsService.claimReward(eventId, bootstrap.player.id, bootstrap.world.id);
  }
}

@Controller('admin/live-events')
@UseGuards(AuthGuard)
export class LiveEventsAdminController {
  constructor(
    private readonly liveEventsService: LiveEventsService,
    private readonly developmentStateService: DevelopmentStateService,
  ) {}

  @Get()
  async listAdminEvents() {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.liveEventsService.listAdminEvents(bootstrap.world.id, bootstrap.player.id);
  }

  @Post()
  async launchEvent(@Body() dto: LaunchLiveEventDto) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.liveEventsService.launchEvent(dto, bootstrap.world.id, bootstrap.player.id);
  }

  @Post(':eventId/end')
  async endEvent(@Param('eventId') eventId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.liveEventsService.endEvent(eventId, bootstrap.world.id, bootstrap.player.id);
  }

  @Post(':eventId/cancel')
  async cancelEvent(@Param('eventId') eventId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.liveEventsService.cancelEvent(eventId, bootstrap.world.id, bootstrap.player.id);
  }
}
