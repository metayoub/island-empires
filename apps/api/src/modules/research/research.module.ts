import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { LiveEventsModule } from '../live-events/live-events.module';
import { PlayersModule } from '../players/players.module';
import { QuestsModule } from '../quests/quests.module';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';

@Module({
  imports: [PlayersModule, QuestsModule, AnalyticsModule, LiveEventsModule],
  controllers: [ResearchController],
  providers: [ResearchService],
  exports: [ResearchService],
})
export class ResearchModule {}
