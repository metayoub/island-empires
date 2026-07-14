import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AntiAbuseModule } from '../anti-abuse/anti-abuse.module';
import { ResourcesModule } from '../resources/resources.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { PvpController } from './pvp.controller';
import { PvpService } from './pvp.service';

@Module({
  imports: [AnalyticsModule, AntiAbuseModule, ResourcesModule],
  controllers: [PvpController],
  providers: [PvpService, DevelopmentStateService],
  exports: [PvpService],
})
export class PvpModule {}
