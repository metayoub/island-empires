import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { QuestsModule } from '../quests/quests.module';
import { GuideController } from './guide.controller';
import { GuideService } from './guide.service';

@Module({
  imports: [PlayersModule, QuestsModule],
  controllers: [GuideController],
  providers: [GuideService],
})
export class GuideModule {}
