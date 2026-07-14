import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MONETIZATION_CONFIG, SHOP_CATALOG, type ShopCatalogProduct } from '@island-empires/config';
import type {
  PremiumAccountResponse,
  PremiumCurrencyPurchaseRequest,
  PremiumCurrencyPurchaseResponse,
  PremiumHistoryResponse,
  PremiumItemPurchaseRequest,
  PremiumItemPurchaseResponse,
  PremiumRefundResponse,
  PremiumShopResponse,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { DevelopmentStateService } from '../players/development-state.service';
import type { PaymentWebhookDto, PurchaseWithGemsDto } from './dto/monetization.dto';

type Db = Record<string, any>;
type Context = { worldId: string; playerId: string; userId: string; email: string };

const PURCHASE_STATUSES = {
  PENDING: 'pending',
  PAID: 'paid',
  FULFILLED: 'fulfilled',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  CHARGEBACK: 'chargeback',
} as const;

const FAIR_RULE_TEXT = [
  'No exclusive powerful units',
  'No unlimited resource buying',
  'No uncapped speedups',
  'No paid-only research',
  'No paid attack domination',
  'No paid-only PvP advantage',
  'No random paid rewards',
  'Premium improves comfort, identity, and expression only',
];

@Injectable()
export class MonetizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async getShop(): Promise<PremiumShopResponse> {
    return {
      currencyPackages: this.currencyProducts().map((product) => ({
        id: product.productId,
        name: product.name,
        premiumCurrency: product.grants?.premiumGems ?? 0,
        priceCents: product.priceCents ?? 0,
        currencyCode: product.currency ?? 'USD',
      })),
      items: this.gemProducts().map((product) => ({
        id: product.productId,
        name: product.name,
        type: product.type as any,
        premiumCurrencyCost: product.priceGems ?? 0,
        description: product.description,
        targetType: this.targetType(product),
        durationDays: this.premiumDays(product),
        cosmeticValue: this.cosmeticValue(product),
      })),
      rules: FAIR_RULE_TEXT,
    };
  }

  async getCatalog() {
    return {
      products: SHOP_CATALOG.map((product) => ({
        productId: product.productId,
        type: product.type,
        name: product.name,
        description: product.description,
        priceCents: 'priceCents' in product ? product.priceCents : undefined,
        priceGems: 'priceGems' in product ? product.priceGems : undefined,
        currency: 'currency' in product ? product.currency : undefined,
      })),
      premiumCurrency: {
        code: MONETIZATION_CONFIG.premiumCurrencyCode,
        displayName: MONETIZATION_CONFIG.premiumCurrencyDisplayName,
      },
      rules: FAIR_RULE_TEXT,
    };
  }

  async getWallet() {
    const context = await this.getContext();
    const wallet = await this.ensureWallet(this.db(), context);
    const player = await this.db().player.findUniqueOrThrow({ where: { id: context.playerId } });
    return {
      premiumGems: wallet.balance,
      wallet: this.toWallet(wallet),
      premiumAccount: {
        active: Boolean(player.premiumUntil && player.premiumUntil > new Date()),
        premiumExpiresAt: player.premiumUntil?.toISOString() ?? null,
        allowedBenefits: MONETIZATION_CONFIG.premiumAccount.allowedBenefits,
      },
    };
  }

  async getAccount(): Promise<PremiumAccountResponse> {
    const context = await this.getContext();
    const wallet = await this.ensureWallet(this.db(), context);
    const player = await this.db().player.findUniqueOrThrow({ where: { id: context.playerId } });
    const entitlements = await this.db().premiumEntitlement.findMany({
      where: { worldId: context.worldId, playerId: context.playerId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      wallet: this.toWallet(wallet),
      premiumUntil: player.premiumUntil?.toISOString() ?? null,
      avatarFrame: player.avatarFrame ?? null,
      entitlements: entitlements.map((entry: Db) => this.toEntitlement(entry)),
    };
  }

  async createCheckoutSession(productId: string) {
    const context = await this.getContext();
    const product = this.findProduct(productId);
    if (product.type !== 'premium_currency_pack' || !('priceCents' in product)) {
      throw new ApiErrorException('This product does not use hosted checkout.', 'PRODUCT_NOT_PURCHASABLE', HttpStatus.BAD_REQUEST);
    }
    await this.assertAccountCanPurchase(context.userId);

    const provider = this.configService.get<string>('payments.provider', 'mock_provider');
    const providerSessionId = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const checkoutBaseUrl = this.configService.get<string>(
      'payments.mockCheckoutBaseUrl',
      'https://payment-provider.example/checkout',
    );
    const checkoutUrl = `${checkoutBaseUrl}/${providerSessionId}`;
    const purchase = await this.db().premiumPurchase.create({
      data: {
        worldId: context.worldId,
        playerId: context.playerId,
        userId: context.userId,
        kind: 'premium_currency_pack',
        itemId: product.productId,
        itemName: product.name,
        premiumCurrencyAmount: product.grants?.premiumGems ?? 0,
        moneyAmountCents: product.priceCents,
        currencyCode: product.currency ?? 'USD',
        provider,
        providerSessionId,
        checkoutUrl,
        status: PURCHASE_STATUSES.PENDING,
        payload: { product, fairMonetizationRules: FAIR_RULE_TEXT },
      },
    });
    await this.audit(context, {
      purchaseId: purchase.id,
      actionType: 'checkout_created',
      provider,
      statusAfter: PURCHASE_STATUSES.PENDING,
      amountCents: product.priceCents,
      payload: { productId: product.productId, providerSessionId },
    });

    return { purchaseId: purchase.id, checkoutUrl };
  }

  async handlePaymentWebhook(input: PaymentWebhookDto) {
    const secret = this.configService.get<string>('payments.webhookSecret', 'dev-webhook-secret');
    if (input.signature !== secret) {
      await this.db().premiumAuditLog.create({
        data: {
          worldId: await this.firstWorldId(),
          playerId: await this.firstPlayerId(),
          actionType: 'payment_webhook_signature_failed',
          payload: { provider: 'mock_provider', eventId: input.eventId, providerSessionId: input.providerSessionId },
        },
      }).catch(() => undefined);
      throw new ApiErrorException('Invalid payment webhook signature.', 'PAYMENT_WEBHOOK_INVALID', HttpStatus.UNAUTHORIZED);
    }

    const purchase = await this.db().premiumPurchase.findFirst({
      where: { providerSessionId: input.providerSessionId },
    });
    if (!purchase) {
      throw new ApiErrorException('Purchase not found.', 'PURCHASE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const context = {
      worldId: purchase.worldId,
      playerId: purchase.playerId,
      userId: purchase.userId,
      email: purchase.receiptEmail ?? '',
    };
    await this.audit(context, {
      purchaseId: purchase.id,
      actionType: 'payment_webhook_received',
      provider: purchase.provider,
      payload: input,
    });

    if (purchase.providerEventId === input.eventId || purchase.status === PURCHASE_STATUSES.FULFILLED) {
      await this.audit(context, {
        purchaseId: purchase.id,
        actionType: 'duplicate_webhook_ignored',
        provider: purchase.provider,
        payload: { eventId: input.eventId },
      });
      return { success: true, status: purchase.status, duplicate: true };
    }

    if (input.eventType === 'checkout.session.completed' || input.eventType === 'payment.succeeded') {
      const fulfilled = await this.fulfillCurrencyPurchase(purchase.id, input);
      return { success: true, status: fulfilled.status };
    }
    if (input.eventType === 'checkout.session.expired' || input.eventType === 'payment.cancelled') {
      await this.db().premiumPurchase.update({
        where: { id: purchase.id },
        data: { status: PURCHASE_STATUSES.CANCELLED, cancelledAt: new Date(), providerEventId: input.eventId },
      });
      await this.audit(context, {
        purchaseId: purchase.id,
        actionType: 'purchase_cancelled',
        provider: purchase.provider,
        statusBefore: purchase.status,
        statusAfter: PURCHASE_STATUSES.CANCELLED,
      });
      return { success: true, status: PURCHASE_STATUSES.CANCELLED };
    }
    if (input.eventType === 'payment.failed') {
      await this.db().premiumPurchase.update({
        where: { id: purchase.id },
        data: { status: PURCHASE_STATUSES.FAILED, providerEventId: input.eventId },
      });
      await this.audit(context, {
        purchaseId: purchase.id,
        actionType: 'purchase_failed',
        provider: purchase.provider,
        statusBefore: purchase.status,
        statusAfter: PURCHASE_STATUSES.FAILED,
      });
      return { success: true, status: PURCHASE_STATUSES.FAILED };
    }
    if (input.eventType === 'charge.refunded') {
      const refund = await this.recordRefundInternal(purchase.id, {
        amountCents: purchase.moneyAmountCents,
        currency: purchase.currencyCode,
        reason: 'Provider refund webhook',
        providerRefundId: input.providerPaymentId,
        status: PURCHASE_STATUSES.REFUNDED,
      });
      return { success: true, refund };
    }

    return { success: true, ignored: true };
  }

  async purchaseCurrency(input: PremiumCurrencyPurchaseRequest): Promise<PremiumCurrencyPurchaseResponse> {
    const checkout = await this.createCheckoutSession(input.packageId);
    const fulfilled = await this.handlePaymentWebhook({
      eventId: input.providerPaymentId,
      eventType: 'payment.succeeded',
      providerSessionId: checkout.purchaseId,
      providerPaymentId: input.providerPaymentId,
      signature: this.configService.get<string>('payments.webhookSecret', 'dev-webhook-secret'),
    }).catch(async () => {
      const purchase = await this.db().premiumPurchase.findUniqueOrThrow({ where: { id: checkout.purchaseId } });
      const updated = await this.fulfillCurrencyPurchase(purchase.id, {
        eventId: input.providerPaymentId,
        eventType: 'payment.succeeded',
        providerSessionId: purchase.providerSessionId,
        providerPaymentId: input.providerPaymentId,
      });
      return { purchase: updated };
    });
    const context = await this.getContext();
    const wallet = await this.ensureWallet(this.db(), context);
    const purchase = 'purchase' in fulfilled ? fulfilled.purchase : await this.db().premiumPurchase.findUniqueOrThrow({ where: { id: checkout.purchaseId } });
    return { purchase: this.toPurchase(purchase), wallet: this.toWallet(wallet) };
  }

  async purchaseWithGems(input: PurchaseWithGemsDto) {
    const result = await this.purchaseItem({
      itemId: input.productId,
      targetId: input.payload?.cityId ?? input.payload?.allianceId,
      newName: input.payload?.newName,
    });
    return {
      success: true,
      purchase: {
        id: result.purchase.id,
        productId: result.purchase.itemId,
        status: result.purchase.status,
      },
      wallet: { premiumGems: result.wallet.balance },
    };
  }

  async purchaseItem(input: PremiumItemPurchaseRequest): Promise<PremiumItemPurchaseResponse> {
    const context = await this.getContext();
    await this.assertAccountCanPurchase(context.userId);
    const product = this.findProduct(input.itemId);
    if (product.type === 'premium_currency_pack' || !('priceGems' in product)) {
      throw new ApiErrorException('This product must be bought through checkout.', 'PRODUCT_NOT_PURCHASABLE', HttpStatus.BAD_REQUEST);
    }

    const target = await this.resolveTarget(product, input, context);
    const result = await this.db().$transaction(async (tx: Db) => {
      const wallet = await tx.playerPremiumWallet.findUnique({ where: { playerId: context.playerId } });
      if (!wallet || wallet.balance < product.priceGems) {
        throw new ApiErrorException('You do not have enough Gems.', 'NOT_ENOUGH_PREMIUM_CURRENCY', HttpStatus.BAD_REQUEST);
      }
      const updatedWallet = await tx.playerPremiumWallet.update({
        where: { playerId: context.playerId },
        data: { balance: { decrement: product.priceGems }, lifetimeSpent: { increment: product.priceGems } },
      });
      const purchase = await tx.premiumPurchase.create({
        data: {
          worldId: context.worldId,
          playerId: context.playerId,
          userId: context.userId,
          kind: product.type,
          itemId: product.productId,
          itemName: product.name,
          premiumCurrencyCost: product.priceGems,
          provider: 'premium_gems',
          status: PURCHASE_STATUSES.FULFILLED,
          fulfilledAt: new Date(),
          payload: { product, target },
        },
      });
      await this.ledger(tx, context, {
        entryType: 'shop_spend',
        amount: -product.priceGems,
        balanceAfter: updatedWallet.balance,
        referenceType: 'purchase',
        referenceId: purchase.id,
        reason: product.name,
      });
      const entitlement = await this.applyProduct(tx, product, input, context, purchase.id, target);
      await this.audit(context, {
        tx,
        purchaseId: purchase.id,
        actionType: product.type.includes('rename') ? 'rename_purchased' : 'premium_item_granted',
        amountGems: product.priceGems,
        statusAfter: PURCHASE_STATUSES.FULFILLED,
        payload: { productId: product.productId, target },
      });
      return { purchase, wallet: updatedWallet, entitlement };
    });

    await this.sendReceipt(result.purchase, context.email);
    return {
      purchase: this.toPurchase(result.purchase),
      wallet: this.toWallet(result.wallet),
      entitlement: this.toEntitlement(result.entitlement),
    };
  }

  async getPurchases() {
    const history = await this.getHistory();
    return {
      purchases: history.purchases.map((purchase) => ({
        id: purchase.id,
        productId: purchase.itemId,
        productName: purchase.itemName,
        status: purchase.status,
        priceGems: purchase.premiumCurrencyCost || undefined,
        priceCents: purchase.moneyAmountCents || undefined,
        createdAt: purchase.createdAt,
        receiptSentAt: purchase.receiptSentAt,
      })),
    };
  }

  async getHistory(): Promise<PremiumHistoryResponse> {
    const context = await this.getContext();
    const [purchases, refunds, auditLogs] = await Promise.all([
      this.db().premiumPurchase.findMany({
        where: { worldId: context.worldId, playerId: context.playerId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.db().premiumRefund.findMany({
        where: { worldId: context.worldId, playerId: context.playerId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.db().premiumAuditLog.findMany({
        where: { worldId: context.worldId, playerId: context.playerId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return {
      purchases: purchases.map((purchase: Db) => this.toPurchase(purchase)),
      refunds: refunds.map((refund: Db) => this.toRefund(refund)),
      auditLogs: auditLogs.map((log: Db) => this.toAuditLog(log)),
    };
  }

  async getCosmeticInventory() {
    const context = await this.getContext();
    const items = await this.db().cosmeticInventoryItem.findMany({
      where: { worldId: context.worldId, userId: context.userId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      items: items.map((item: Db) => ({
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        equipped: Boolean(item.equippedAt),
        equippedAt: item.equippedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  async equipCosmetic(itemId: string) {
    const context = await this.getContext();
    const item = await this.db().cosmeticInventoryItem.findFirst({
      where: { worldId: context.worldId, userId: context.userId, itemId },
    });
    if (!item) {
      throw new ApiErrorException('You do not own this cosmetic item.', 'COSMETIC_NOT_OWNED', HttpStatus.NOT_FOUND);
    }
    await this.db().$transaction(async (tx: Db) => {
      await tx.cosmeticInventoryItem.updateMany({
        where: { worldId: context.worldId, userId: context.userId, itemType: item.itemType },
        data: { equippedAt: null },
      });
      await tx.cosmeticInventoryItem.update({ where: { id: item.id }, data: { equippedAt: new Date() } });
      if (item.itemType === 'avatar_frame') {
        const product = this.findProduct(item.itemId);
        const cosmeticValue = this.cosmeticValue(product) ?? item.itemId;
        await tx.player.update({ where: { id: context.playerId }, data: { avatarFrame: cosmeticValue } });
      }
      await this.audit(context, {
        tx,
        actionType: 'cosmetic_equipped',
        payload: { itemId, itemType: item.itemType },
      });
    });
    return { success: true };
  }

  async unequipCosmetic(itemType: string) {
    const context = await this.getContext();
    await this.db().$transaction(async (tx: Db) => {
      await tx.cosmeticInventoryItem.updateMany({
        where: { worldId: context.worldId, userId: context.userId, itemType },
        data: { equippedAt: null },
      });
      if (itemType === 'avatar_frame') {
        await tx.player.update({ where: { id: context.playerId }, data: { avatarFrame: null } });
      }
      await this.audit(context, {
        tx,
        actionType: 'cosmetic_unequipped',
        payload: { itemType },
      });
    });
    return { success: true };
  }

  async requestRefund(purchaseId: string, reason: string): Promise<PremiumRefundResponse> {
    const refund = await this.recordRefundInternal(purchaseId, { reason, status: 'pending' });
    return { refund: this.toRefund(refund) };
  }

  async recordRefundInternal(
    purchaseId: string,
    input: { amountCents?: number; currency?: string; reason?: string; providerRefundId?: string; status?: string },
  ) {
    const purchase = await this.db().premiumPurchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      throw new ApiErrorException('Purchase not found.', 'PURCHASE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const context = {
      worldId: purchase.worldId,
      playerId: purchase.playerId,
      userId: purchase.userId,
      email: purchase.receiptEmail ?? '',
    };
    return this.db().$transaction(async (tx: Db) => {
      const refund = await tx.premiumRefund.create({
        data: {
          worldId: purchase.worldId,
          purchaseId: purchase.id,
          playerId: purchase.playerId,
          userId: purchase.userId,
          amountCents: input.amountCents ?? purchase.moneyAmountCents,
          premiumCurrency: purchase.premiumCurrencyAmount,
          reason: input.reason ?? 'Refund recorded',
          status: input.status ?? 'recorded',
          providerRefundId: input.providerRefundId,
        },
      });
      await tx.premiumPurchase.update({
        where: { id: purchase.id },
        data: {
          status: input.status === PURCHASE_STATUSES.REFUNDED ? PURCHASE_STATUSES.REFUNDED : 'refund_requested',
          refundedAt: new Date(),
          refundReason: input.reason,
        },
      });
      await this.audit(context, {
        tx,
        purchaseId: purchase.id,
        actionType: 'refund_recorded',
        provider: purchase.provider,
        statusBefore: purchase.status,
        statusAfter: input.status ?? 'recorded',
        amountCents: input.amountCents ?? purchase.moneyAmountCents,
        payload: input,
      });
      return refund;
    });
  }

  private async fulfillCurrencyPurchase(purchaseId: string, input: PaymentWebhookDto) {
    const purchase = await this.db().premiumPurchase.findUnique({ where: { id: purchaseId }, include: { user: true } });
    if (!purchase) {
      throw new ApiErrorException('Purchase not found.', 'PURCHASE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (purchase.status === PURCHASE_STATUSES.FULFILLED || purchase.fulfilledAt) {
      return purchase;
    }
    const context = {
      worldId: purchase.worldId,
      playerId: purchase.playerId,
      userId: purchase.userId,
      email: purchase.user?.email ?? purchase.receiptEmail ?? '',
    };
    const fulfilled = await this.db().$transaction(async (tx: Db) => {
      const wallet = await tx.playerPremiumWallet.upsert({
        where: { playerId: purchase.playerId },
        update: {
          balance: { increment: purchase.premiumCurrencyAmount },
          lifetimePurchased: { increment: purchase.premiumCurrencyAmount },
        },
        create: {
          worldId: purchase.worldId,
          playerId: purchase.playerId,
          balance: purchase.premiumCurrencyAmount,
          lifetimePurchased: purchase.premiumCurrencyAmount,
        },
      });
      const updated = await tx.premiumPurchase.update({
        where: { id: purchase.id },
        data: {
          status: PURCHASE_STATUSES.FULFILLED,
          providerEventId: input.eventId,
          providerPaymentId: input.providerPaymentId,
          fulfilledAt: new Date(),
        },
      });
      await this.ledger(tx, context, {
        entryType: 'purchase_grant',
        amount: purchase.premiumCurrencyAmount,
        balanceAfter: wallet.balance,
        referenceType: 'purchase',
        referenceId: purchase.id,
        reason: purchase.itemName,
      });
      await this.audit(context, {
        tx,
        purchaseId: purchase.id,
        actionType: 'purchase_fulfilled',
        provider: purchase.provider,
        amountCents: purchase.moneyAmountCents,
        amountGems: purchase.premiumCurrencyAmount,
        statusBefore: purchase.status,
        statusAfter: PURCHASE_STATUSES.FULFILLED,
      });
      return updated;
    });
    await this.sendReceipt(fulfilled, context.email);
    return fulfilled;
  }

  private async applyProduct(tx: Db, product: ShopCatalogProduct, input: PremiumItemPurchaseRequest, context: Context, purchaseId: string, target: Db) {
    const now = new Date();
    const entitlementData = {
      worldId: context.worldId,
      playerId: context.playerId,
      purchaseId,
      itemId: product.productId,
      itemType: product.type,
      targetType: target.targetType,
      targetId: target.targetId,
      cityId: target.cityId,
      allianceId: target.allianceId,
      payload: { product, newName: input.newName?.trim() },
    };

    if (product.type === 'premium_account') {
      const player = await tx.player.findUniqueOrThrow({ where: { id: context.playerId } });
      const base = player.premiumUntil && player.premiumUntil > now ? player.premiumUntil : now;
      const premiumDays = this.premiumDays(product) ?? 30;
      const premiumUntil = new Date(base.getTime() + premiumDays * 24 * 60 * 60 * 1000);
      await tx.player.update({ where: { id: context.playerId }, data: { premiumUntil } });
      return tx.premiumEntitlement.create({ data: { ...entitlementData, startsAt: now, endsAt: premiumUntil } });
    }
    if (product.type === 'city_rename') {
      const newName = await this.normalizeCityName(tx, context, target.cityId, input.newName);
      await tx.city.update({ where: { id: target.cityId }, data: { name: newName } });
    }
    if (product.type === 'player_rename') {
      const newName = await this.normalizePlayerName(tx, context, input.newName);
      await tx.player.update({ where: { id: context.playerId }, data: { name: newName } });
    }
    if (['city_skin', 'avatar_frame', 'alliance_banner'].includes(product.type)) {
      await tx.cosmeticInventoryItem.upsert({
        where: { userId_itemId: { userId: context.userId, itemId: product.productId } },
        update: {},
        create: {
          worldId: context.worldId,
          userId: context.userId,
          playerId: context.playerId,
          itemType: product.type,
          itemId: product.productId,
          sourceType: 'purchase',
          sourceId: purchaseId,
        },
      });
      if (product.type === 'city_skin') {
        const value = this.cosmeticValue(product) ?? product.productId;
        await tx.city.update({ where: { id: target.cityId }, data: { citySkin: value } });
      }
      if (product.type === 'avatar_frame') {
        const value = this.cosmeticValue(product) ?? product.productId;
        await tx.player.update({ where: { id: context.playerId }, data: { avatarFrame: value } });
      }
      if (product.type === 'alliance_banner') {
        const value = this.cosmeticValue(product) ?? product.productId;
        await tx.alliance.update({ where: { id: target.allianceId }, data: { bannerCosmetic: value } });
      }
    }
    return tx.premiumEntitlement.create({ data: entitlementData });
  }

  private async resolveTarget(product: ShopCatalogProduct, input: PremiumItemPurchaseRequest, context: Context) {
    if (product.type === 'city_rename' || product.type === 'city_skin') {
      const cityId = input.targetId;
      if (!cityId) throw new ApiErrorException('City target is required.', 'PREMIUM_TARGET_REQUIRED', HttpStatus.BAD_REQUEST);
      const city = await this.db().city.findFirst({ where: { id: cityId, worldId: context.worldId, playerId: context.playerId } });
      if (!city) throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      return { targetType: 'city', targetId: city.id, cityId: city.id };
    }
    if (product.type === 'alliance_banner') {
      const membership = await this.db().allianceMember.findFirst({
        where: { worldId: context.worldId, playerId: context.playerId, role: { in: ['leader', 'founder', 'officer'] } },
      });
      if (!membership) {
        throw new ApiErrorException('Only an alliance leader or officer can buy alliance banner cosmetics.', 'ALLIANCE_LEADER_REQUIRED', HttpStatus.FORBIDDEN);
      }
      return { targetType: 'alliance', targetId: membership.allianceId, allianceId: membership.allianceId };
    }
    return { targetType: 'player', targetId: context.playerId };
  }

  private async normalizePlayerName(tx: Db, context: Context, value?: string) {
    const name = this.normalizeName(value, MONETIZATION_CONFIG.rename.playerNameMinLength, MONETIZATION_CONFIG.rename.playerNameMaxLength);
    const existing = await tx.player.findFirst({ where: { worldId: context.worldId, name, id: { not: context.playerId } } });
    if (existing) throw new ApiErrorException('This name is not available.', 'NAME_NOT_AVAILABLE', HttpStatus.BAD_REQUEST);
    return name;
  }

  private async normalizeCityName(tx: Db, context: Context, cityId: string, value?: string) {
    const name = this.normalizeName(value, MONETIZATION_CONFIG.rename.cityNameMinLength, MONETIZATION_CONFIG.rename.cityNameMaxLength);
    const existing = await tx.city.findFirst({ where: { playerId: context.playerId, name, id: { not: cityId } } });
    if (existing) throw new ApiErrorException('This name is not available.', 'NAME_NOT_AVAILABLE', HttpStatus.BAD_REQUEST);
    return name;
  }

  private normalizeName(value: string | undefined, min: number, max: number) {
    const name = value?.trim();
    if (!name || name.length < min || name.length > max || !/^[a-zA-Z0-9][a-zA-Z0-9 '-]+$/.test(name)) {
      throw new ApiErrorException('This name is not available.', 'NAME_NOT_AVAILABLE', HttpStatus.BAD_REQUEST);
    }
    return name;
  }

  private async getContext(): Promise<Context> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const player = await this.db().player.findUniqueOrThrow({ where: { id: bootstrap.player.id }, include: { user: true } });
    return { worldId: bootstrap.world.id, playerId: player.id, userId: player.userId, email: player.user.email };
  }

  private async assertAccountCanPurchase(userId: string) {
    const user = await this.db().user.findUniqueOrThrow({ where: { id: userId } });
    if (['suspended', 'banned', 'deleted'].includes(user.accountStatus)) {
      throw new ApiErrorException('This account cannot make purchases.', 'ACCOUNT_PURCHASE_BLOCKED', HttpStatus.FORBIDDEN);
    }
  }

  private async ensureWallet(db: Db, context: Context) {
    return db.playerPremiumWallet.upsert({
      where: { playerId: context.playerId },
      update: {},
      create: { worldId: context.worldId, playerId: context.playerId, balance: 0, lifetimePurchased: 0, lifetimeSpent: 0 },
    });
  }

  private async ledger(tx: Db, context: Context, input: Db) {
    await tx.premiumLedgerEntry.create({
      data: {
        worldId: context.worldId,
        userId: context.userId,
        playerId: context.playerId,
        entryType: input.entryType,
        amount: input.amount,
        balanceAfter: input.balanceAfter,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        reason: input.reason,
        metadata: input.metadata,
      },
    });
  }

  private async audit(context: Context, input: Db) {
    const tx = input.tx ?? this.db();
    await tx.premiumAuditLog.create({
      data: {
        worldId: context.worldId,
        playerId: context.playerId,
        userId: context.userId,
        purchaseId: input.purchaseId,
        actionType: input.actionType,
        targetType: input.targetType,
        targetId: input.targetId,
        payload: {
          provider: input.provider,
          amountCents: input.amountCents,
          amountGems: input.amountGems,
          statusBefore: input.statusBefore,
          statusAfter: input.statusAfter,
          ...(input.payload ?? {}),
        },
      },
    });
  }

  private async sendReceipt(purchase: Db, email: string) {
    if (!MONETIZATION_CONFIG.receipts.sendReceiptEmail || purchase.receiptSentAt) return;
    await this.mailService.sendPremiumPurchaseReceipt(email, {
      itemName: purchase.itemName,
      premiumCurrencyAmount: purchase.premiumCurrencyAmount,
      premiumCurrencyCost: purchase.premiumCurrencyCost,
      moneyAmountCents: purchase.moneyAmountCents,
      currencyCode: purchase.currencyCode,
      purchaseId: purchase.id,
    });
    await this.db().premiumPurchase.update({
      where: { id: purchase.id },
      data: { receiptSentAt: new Date(), receiptEmail: email },
    });
  }

  private findProduct(productId: string): ShopCatalogProduct {
    const product = SHOP_CATALOG.find((entry) => entry.productId === productId);
    if (!product) throw new ApiErrorException('Shop product not found.', 'SHOP_PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
    return product;
  }

  private currencyProducts() {
    return SHOP_CATALOG.filter((product) => product.type === 'premium_currency_pack');
  }

  private gemProducts() {
    return SHOP_CATALOG.filter((product) => product.type !== 'premium_currency_pack');
  }

  private targetType(product: ShopCatalogProduct): 'city' | 'player' | 'alliance' | undefined {
    if (product.type === 'city_rename' || product.type === 'city_skin') return 'city';
    if (product.type === 'alliance_banner') return 'alliance';
    if (product.type === 'player_rename' || product.type === 'avatar_frame') return 'player';
    return undefined;
  }

  private premiumDays(product: ShopCatalogProduct): number | undefined {
    if ('grants' in product && 'premiumDays' in product.grants) return product.grants.premiumDays;
    return undefined;
  }

  private cosmeticValue(product: ShopCatalogProduct): string | undefined {
    if ('grants' in product && 'cosmeticValue' in product.grants) return product.grants.cosmeticValue;
    return undefined;
  }

  private toWallet(wallet: Db) {
    return {
      balance: wallet.balance,
      premiumGems: wallet.balance,
      lifetimePurchased: wallet.lifetimePurchased,
      lifetimeSpent: wallet.lifetimeSpent,
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  private toPurchase(purchase: Db) {
    return {
      id: purchase.id,
      kind: purchase.kind,
      itemId: purchase.itemId,
      itemName: purchase.itemName,
      premiumCurrencyAmount: purchase.premiumCurrencyAmount,
      premiumCurrencyCost: purchase.premiumCurrencyCost,
      moneyAmountCents: purchase.moneyAmountCents,
      currencyCode: purchase.currencyCode,
      provider: purchase.provider,
      providerPaymentId: purchase.providerPaymentId,
      status: purchase.status,
      receiptEmail: purchase.receiptEmail,
      receiptSentAt: purchase.receiptSentAt?.toISOString() ?? null,
      createdAt: purchase.createdAt.toISOString(),
    };
  }

  private toEntitlement(entitlement: Db) {
    return {
      id: entitlement.id,
      itemId: entitlement.itemId,
      itemType: entitlement.itemType,
      targetType: entitlement.targetType,
      targetId: entitlement.targetId,
      status: entitlement.status,
      startsAt: entitlement.startsAt.toISOString(),
      endsAt: entitlement.endsAt?.toISOString() ?? null,
      payload: entitlement.payload ?? null,
    };
  }

  private toRefund(refund: Db) {
    return {
      id: refund.id,
      purchaseId: refund.purchaseId,
      amountCents: refund.amountCents,
      premiumCurrency: refund.premiumCurrency,
      reason: refund.reason,
      status: refund.status,
      providerRefundId: refund.providerRefundId,
      createdAt: refund.createdAt.toISOString(),
    };
  }

  private toAuditLog(log: Db) {
    return {
      id: log.id,
      actionType: log.actionType,
      targetType: log.targetType,
      targetId: log.targetId,
      payload: log.payload ?? null,
      createdAt: log.createdAt.toISOString(),
    };
  }

  private async firstWorldId() {
    return (await this.db().world.findFirst())?.id ?? 'unknown';
  }

  private async firstPlayerId() {
    return (await this.db().player.findFirst())?.id ?? 'unknown';
  }

  private db(): Db {
    return this.prisma as unknown as Db;
  }
}
