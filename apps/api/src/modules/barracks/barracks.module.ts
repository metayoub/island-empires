import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesModule } from '../resources/resources.module';
import { BarracksController } from './barracks.controller';
import { BarracksService } from './barracks.service';

@Module({
  imports: [ConfigModule, PrismaModule, ResourcesModule, AnalyticsModule],
  controllers: [BarracksController],
  providers: [BarracksService, DevelopmentStateService],
  exports: [BarracksService],
})
export class BarracksModule {}
