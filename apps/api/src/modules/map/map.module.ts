import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlayersModule } from '../players/players.module';
import { QuestsModule } from '../quests/quests.module';
import { MapController } from './map.controller';
import { MapService } from './map.service';

@Module({
  imports: [PlayersModule, QuestsModule, AnalyticsModule],
  controllers: [MapController],
  providers: [MapService],
})
export class MapModule {}
