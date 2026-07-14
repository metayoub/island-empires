import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { MailModule } from '../mail/mail.module';
import {
  AdminDonationsController,
  SupporterController,
  SupporterPaymentWebhookController,
} from './supporter.controller';
import { SupporterService } from './supporter.service';

@Module({
  imports: [InventoryModule, MailModule],
  controllers: [SupporterController, SupporterPaymentWebhookController, AdminDonationsController],
  providers: [SupporterService],
  exports: [SupporterService],
})
export class SupporterProjectModule {}
