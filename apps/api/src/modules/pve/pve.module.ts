import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { LiveEventsModule } from '../live-events/live-events.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { ArmyMovementsController } from './army-movements.controller';
import { PveController } from './pve.controller';
import { PveService } from './pve.service';

@Module({
  imports: [ConfigModule, PrismaModule, AnalyticsModule, LiveEventsModule],
  controllers: [ArmyMovementsController, PveController],
  providers: [PveService, DevelopmentStateService],
  exports: [PveService],
})
export class PveModule {}
