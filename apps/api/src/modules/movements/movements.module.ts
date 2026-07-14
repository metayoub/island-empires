import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { AntiAbuseModule } from '../anti-abuse/anti-abuse.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { QuestsModule } from '../quests/quests.module';
import { ResourcesModule } from '../resources/resources.module';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';
import { TransportController } from './transport.controller';

@Module({
  imports: [AntiAbuseModule, ConfigModule, PrismaModule, QuestsModule, ResourcesModule],
  controllers: [MovementsController, TransportController],
  providers: [MovementsService, DevelopmentStateService],
  exports: [MovementsService],
})
export class MovementsModule {}
