import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AntiAbuseModule } from '../anti-abuse/anti-abuse.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { ResourcesModule } from '../resources/resources.module';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [AntiAbuseModule, PrismaModule, ResourcesModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, DevelopmentStateService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
