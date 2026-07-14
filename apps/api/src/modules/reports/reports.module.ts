import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { PlayersModule } from '../players/players.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PlayersModule, MessagesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
