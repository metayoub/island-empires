import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { DevelopmentStateService } from '../players/development-state.service';
import { AdvancedSearchController } from './advanced-search.controller';
import { AdvancedSearchService } from './advanced-search.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdvancedSearchController],
  providers: [AdvancedSearchService, DevelopmentStateService],
})
export class AdvancedSearchModule {}
