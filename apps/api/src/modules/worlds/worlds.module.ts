import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { WorldsController } from './worlds.controller';
import { WorldsService } from './worlds.service';

@Module({
  imports: [PlayersModule],
  controllers: [WorldsController],
  providers: [WorldsService],
})
export class WorldsModule {}
