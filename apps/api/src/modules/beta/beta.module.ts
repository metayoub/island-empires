import { Module } from '@nestjs/common';
import { BetaController, AdminBetaController } from './beta.controller';
import { BetaService } from './beta.service';

@Module({
  controllers: [BetaController, AdminBetaController],
  providers: [BetaService],
  exports: [BetaService],
})
export class BetaModule {}
