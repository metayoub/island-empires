import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PlayersModule } from '../players/players.module';
import {
  CosmeticsController,
  MonetizationController,
  ShopController,
} from './monetization.controller';
import { MonetizationService } from './monetization.service';

@Module({
  imports: [MailModule, PlayersModule],
  controllers: [MonetizationController, ShopController, CosmeticsController],
  providers: [MonetizationService],
  exports: [MonetizationService],
})
export class MonetizationModule {}
