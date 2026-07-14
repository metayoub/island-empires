import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { ResearchModule } from '../research/research.module';
import { ResourcesModule } from '../resources/resources.module';
import { DebugEconomyController } from './debug-economy.controller';
import { DebugEconomyService } from './debug-economy.service';

@Module({
  imports: [PlayersModule, ResourcesModule, ResearchModule],
  controllers: [DebugEconomyController],
  providers: [DebugEconomyService],
})
export class DebugModule {}
