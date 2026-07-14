import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { PlayersModule } from '../players/players.module';
import { PopulationModule } from '../population/population.module';
import { QuestsModule } from '../quests/quests.module';
import { ResearchModule } from '../research/research.module';
import { ResourcesModule } from '../resources/resources.module';
import { WorkersModule } from '../workers/workers.module';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';

@Module({
  imports: [
    PlayersModule,
    AnalyticsModule,
    BuildingsModule,
    PopulationModule,
    QuestsModule,
    ResearchModule,
    ResourcesModule,
    WorkersModule,
  ],
  controllers: [CitiesController],
  providers: [CitiesService],
})
export class CitiesModule {}
