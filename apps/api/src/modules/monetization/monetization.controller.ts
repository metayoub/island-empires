import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import {
  CreateCheckoutSessionDto,
  CreatePremiumCurrencyPurchaseDto,
  EquipCosmeticDto,
  PaymentWebhookDto,
  PurchasePremiumItemDto,
  PurchaseWithGemsDto,
  RequestPremiumRefundDto,
  UnequipCosmeticDto,
} from './dto/monetization.dto';
import { MonetizationService } from './monetization.service';

@Controller('monetization')
@UseGuards(AuthGuard)
export class MonetizationController {
  constructor(private readonly monetizationService: MonetizationService) {}

  @Get('shop')
  getShop() {
    return this.monetizationService.getShop();
  }

  @Get('account')
  getAccount() {
    return this.monetizationService.getAccount();
  }

  @Post('currency-purchases')
  purchaseCurrency(@Body() dto: CreatePremiumCurrencyPurchaseDto) {
    return this.monetizationService.purchaseCurrency(dto);
  }

  @Post('items/purchase')
  purchaseItem(@Body() dto: PurchasePremiumItemDto) {
    return this.monetizationService.purchaseItem(dto);
  }

  @Get('history')
  getHistory() {
    return this.monetizationService.getHistory();
  }

  @Post('purchases/:purchaseId/refund')
  requestRefund(@Param('purchaseId') purchaseId: string, @Body() dto: RequestPremiumRefundDto) {
    return this.monetizationService.requestRefund(purchaseId, dto.reason);
  }
}

@Controller('shop')
@UseGuards(AuthGuard)
export class ShopController {
  constructor(private readonly monetizationService: MonetizationService) {}

  @Get('catalog')
  getCatalog() {
    return this.monetizationService.getCatalog();
  }

  @Get('wallet')
  getWallet() {
    return this.monetizationService.getWallet();
  }

  @Post('checkout')
  createCheckout(@Body() dto: CreateCheckoutSessionDto) {
    return this.monetizationService.createCheckoutSession(dto.productId);
  }

  @Post('purchase-with-gems')
  purchaseWithGems(@Body() dto: PurchaseWithGemsDto) {
    return this.monetizationService.purchaseWithGems(dto);
  }

  @Get('purchases')
  getPurchases() {
    return this.monetizationService.getPurchases();
  }
}

@Controller('cosmetics')
@UseGuards(AuthGuard)
export class CosmeticsController {
  constructor(private readonly monetizationService: MonetizationService) {}

  @Get('inventory')
  getInventory() {
    return this.monetizationService.getCosmeticInventory();
  }

  @Post('equip')
  equip(@Body() dto: EquipCosmeticDto) {
    return this.monetizationService.equipCosmetic(dto.itemId);
  }

  @Post('unequip')
  unequip(@Body() dto: UnequipCosmeticDto) {
    return this.monetizationService.unequipCosmetic(dto.itemType);
  }
}

@Controller('payments')
export class PaymentWebhookController {
  constructor(private readonly monetizationService: MonetizationService) {}

  @Post('webhook')
  webhook(@Body() dto: PaymentWebhookDto) {
    return this.monetizationService.handlePaymentWebhook(dto);
  }
}
