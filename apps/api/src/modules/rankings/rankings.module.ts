import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';

@Module({
  imports: [PrismaModule],
  controllers: [RankingsController],
  providers: [RankingsService, DevelopmentStateService],
})
export class RankingsModule {}
