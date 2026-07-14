import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesModule } from '../resources/resources.module';
import { ScoutingController } from './scouting.controller';
import { ScoutingService } from './scouting.service';

@Module({
  imports: [ConfigModule, PrismaModule, ResourcesModule, AnalyticsModule],
  controllers: [ScoutingController],
  providers: [ScoutingService, DevelopmentStateService],
  exports: [ScoutingService],
})
export class ScoutingModule {}
