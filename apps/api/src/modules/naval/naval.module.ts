import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesModule } from '../resources/resources.module';
import { NavalController } from './naval.controller';
import { NavalService } from './naval.service';

@Module({
  imports: [AnalyticsModule, ResourcesModule],
  controllers: [NavalController],
  providers: [NavalService, DevelopmentStateService],
  exports: [NavalService],
})
export class NavalModule {}
