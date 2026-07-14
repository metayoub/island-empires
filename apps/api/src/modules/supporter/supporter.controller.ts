import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/current-auth.decorator';
import {
  AdminDonationQueryDto,
  CreateSupportCheckoutDto,
  PaymentWebhookDto,
  RecordDonationRefundDto,
  SupporterHistoryQueryDto,
} from './dto/supporter.dto';
import { SupporterService } from './supporter.service';

@Controller('supporter')
@UseGuards(AuthGuard)
export class SupporterController {
  constructor(private readonly supporterService: SupporterService) {}

  @Get('packs')
  getPacks() {
    return this.supporterService.getPacks();
  }

  @Post('checkout')
  checkout(@CurrentAuth() auth: AuthContext, @Body() dto: CreateSupportCheckoutDto) {
    return this.supporterService.createCheckout(auth, dto.supporterPackId);
  }

  @Get('history')
  history(@CurrentAuth() auth: AuthContext, @Query() query: SupporterHistoryQueryDto) {
    return this.supporterService.getHistory(auth, query);
  }
}

@Controller('payments')
export class SupporterPaymentWebhookController {
  constructor(private readonly supporterService: SupporterService) {}

  @Post('webhook')
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.supporterService.handlePaymentWebhook(dto);
  }
}

@Controller('admin/donations')
@UseGuards(AuthGuard)
export class AdminDonationsController {
  constructor(private readonly supporterService: SupporterService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query() query: AdminDonationQueryDto) {
    return this.supporterService.listDonations(auth, query);
  }

  @Get(':donationId')
  detail(@CurrentAuth() auth: AuthContext, @Param('donationId') donationId: string) {
    return this.supporterService.getDonation(auth, donationId);
  }

  @Post(':donationId/refund-record')
  refund(
    @CurrentAuth() auth: AuthContext,
    @Param('donationId') donationId: string,
    @Body() dto: RecordDonationRefundDto,
  ) {
    return this.supporterService.recordRefund(auth, donationId, dto);
  }
}
