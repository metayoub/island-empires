import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlayersModule } from '../players/players.module';
import { LiveEventsAdminController, LiveEventsController } from './live-events.controller';
import { LiveEventsService } from './live-events.service';

@Module({
  imports: [AnalyticsModule, PlayersModule],
  controllers: [LiveEventsController, LiveEventsAdminController],
  providers: [LiveEventsService],
  exports: [LiveEventsService],
})
export class LiveEventsModule {}
