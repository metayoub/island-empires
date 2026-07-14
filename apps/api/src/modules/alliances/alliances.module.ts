import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { LiveEventsModule } from '../live-events/live-events.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { AlliancesController } from './alliances.controller';
import { AlliancesService } from './alliances.service';

@Module({
  imports: [PrismaModule, LiveEventsModule],
  controllers: [AlliancesController],
  providers: [AlliancesService, DevelopmentStateService],
  exports: [AlliancesService],
})
export class AlliancesModule {}
