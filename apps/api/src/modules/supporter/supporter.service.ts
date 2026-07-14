import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getInventoryItemDefinition,
  getSupporterPackDefinition,
  SUPPORTER_CONFIG,
} from '@island-empires/config';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import type { AuthContext } from '../auth/auth-context.service';
import { InventoryService } from '../inventory/inventory.service';
import { MailService } from '../mail/mail.service';
import type {
  AdminDonationQueryDto,
  PaymentWebhookDto,
  RecordDonationRefundDto,
  SupporterHistoryQueryDto,
} from './dto/supporter.dto';

type Db = Record<string, any>;

const DONATION_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FULFILLED: 'fulfilled',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const;

@Injectable()
export class SupporterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly inventoryService: InventoryService,
    private readonly mailService: MailService,
  ) {}

  async getPacks() {
    return {
      packs: SUPPORTER_CONFIG.packs.map((pack) => ({
        ...pack,
        items: pack.grants.map((grant) => {
          const definition = getInventoryItemDefinition(grant.itemId);
          return { itemId: grant.itemId, name: definition?.name ?? grant.itemId, quantity: grant.quantity };
        }),
      })),
      fairnessPromise: SUPPORTER_CONFIG.promise,
      fairness: SUPPORTER_CONFIG.fairness,
    };
  }

  async createCheckout(auth: AuthContext, supporterPackId: string) {
    const user = await this.db().user.findUnique({ where: { id: auth.userId } });
    if (!user || ['suspended', 'banned'].includes(user.accountStatus)) {
      throw new ApiErrorException('This account cannot start checkout.', 'SUPPORT_CHECKOUT_BLOCKED', HttpStatus.FORBIDDEN);
    }
    const pack = getSupporterPackDefinition(supporterPackId);
    if (!pack) throw new ApiErrorException('Supporter pack not found.', 'SUPPORTER_PACK_NOT_FOUND', HttpStatus.NOT_FOUND);
    if (pack.grants.some((grant) => {
      const item = getInventoryItemDefinition(grant.itemId);
      return item?.category === 'resource_pack' || item?.category === 'unit_pack';
    })) {
      throw new ApiErrorException('Supporter packs cannot grant gameplay power.', 'SUPPORTER_PACK_INVALID', HttpStatus.BAD_REQUEST);
    }

    const provider = this.configService.get<string>('payments.provider', 'mock_provider');
    const providerSessionId = `sup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const checkoutBaseUrl = this.configService.get<string>('payments.mockCheckoutBaseUrl', 'https://payment-provider.example/checkout');
    const checkoutUrl = `${checkoutBaseUrl}/${providerSessionId}`;
    const donation = await this.db().supporterDonation.create({
      data: {
        userId: auth.userId,
        playerId: auth.playerId,
        supporterPackId: pack.supporterPackId,
        status: DONATION_STATUS.PENDING,
        amountCents: pack.priceCents,
        currency: pack.currency,
        provider,
        providerSessionId,
        checkoutUrl,
        receiptEmail: user.email,
        metadata: { pack, fairness: SUPPORTER_CONFIG.fairness },
      },
    });
    await this.audit({
      donationId: donation.id,
      userId: auth.userId,
      playerId: auth.playerId,
      actionType: 'support_checkout_created',
      statusAfter: DONATION_STATUS.PENDING,
      amountCents: pack.priceCents,
      currency: pack.currency,
      provider,
      payload: { supporterPackId, providerSessionId },
    });
    await this.sensitive(auth, 'support_checkout_created', 'supporter_donation', donation.id, { supporterPackId });
    return { donationId: donation.id, checkoutUrl };
  }

  async getHistory(auth: AuthContext, query: SupporterHistoryQueryDto) {
    const pageSize = Number(query.pageSize ?? 20);
    const page = Number(query.page ?? 1);
    const [rows, total] = await Promise.all([
      this.db().supporterDonation.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.db().supporterDonation.count({ where: { userId: auth.userId } }),
    ]);
    return { donations: rows.map((row: Db) => this.donationSummary(row)), pagination: { page, pageSize, total } };
  }

  async handlePaymentWebhook(input: PaymentWebhookDto) {
    const secret = this.configService.get<string>('payments.webhookSecret', 'dev-webhook-secret');
    if (input.signature !== secret) {
      throw new ApiErrorException('Invalid payment webhook signature.', 'PAYMENT_WEBHOOK_INVALID', HttpStatus.UNAUTHORIZED);
    }
    const donation = await this.db().supporterDonation.findFirst({ where: { providerSessionId: input.providerSessionId } });
    if (!donation) throw new ApiErrorException('Donation not found.', 'DONATION_NOT_FOUND', HttpStatus.NOT_FOUND);

    await this.audit({
      donationId: donation.id,
      userId: donation.userId,
      playerId: donation.playerId,
      actionType: 'support_payment_received',
      provider: donation.provider,
      payload: input,
    });

    if (donation.providerEventId === input.eventId || donation.status === DONATION_STATUS.FULFILLED) {
      await this.audit({ donationId: donation.id, userId: donation.userId, playerId: donation.playerId, actionType: 'duplicate_webhook_ignored', provider: donation.provider, payload: { eventId: input.eventId } });
      return { success: true, status: donation.status, duplicate: true };
    }
    if (['checkout.session.completed', 'payment.succeeded'].includes(input.eventType)) {
      return this.fulfillDonation(donation.id, input);
    }
    if (['checkout.session.expired', 'payment.cancelled'].includes(input.eventType)) {
      const updated = await this.db().supporterDonation.update({ where: { id: donation.id }, data: { status: DONATION_STATUS.CANCELLED, cancelledAt: new Date(), providerEventId: input.eventId } });
      await this.audit({ donationId: donation.id, userId: donation.userId, playerId: donation.playerId, actionType: 'support_donation_cancelled', statusBefore: donation.status, statusAfter: updated.status, provider: donation.provider });
      return { success: true, status: updated.status };
    }
    if (input.eventType === 'payment.failed') {
      const updated = await this.db().supporterDonation.update({ where: { id: donation.id }, data: { status: DONATION_STATUS.FAILED, providerEventId: input.eventId } });
      await this.audit({ donationId: donation.id, userId: donation.userId, playerId: donation.playerId, actionType: 'support_donation_failed', statusBefore: donation.status, statusAfter: updated.status, provider: donation.provider });
      return { success: true, status: updated.status };
    }
    if (input.eventType === 'charge.refunded' || input.eventType === 'refund.succeeded') {
      return this.recordRefundInternal(donation, {
        amountCents: input.amountCents,
        currency: input.currency,
        providerRefundId: input.providerRefundId,
        reason: 'provider_refund_webhook',
      }, input.eventId);
    }
    return { success: true, ignored: true };
  }

  async listDonations(auth: AuthContext, query: AdminDonationQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const pageSize = Number(query.pageSize ?? 50);
    const page = Number(query.page ?? 1);
    const where = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.playerId ? { playerId: query.playerId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const rows = await this.db().supporterDonation.findMany({
      where,
      include: { user: { select: { email: true, displayName: true } }, player: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });
    return { donations: rows.map((row: Db) => this.donationSummary(row)) };
  }

  async getDonation(auth: AuthContext, donationId: string) {
    await this.assertAdmin(auth, 'operator');
    const donation = await this.db().supporterDonation.findUnique({
      where: { id: donationId },
      include: { user: true, player: true, auditLogs: { orderBy: { createdAt: 'desc' } }, refunds: { orderBy: { createdAt: 'desc' } } },
    });
    if (!donation) throw new ApiErrorException('Donation not found.', 'DONATION_NOT_FOUND', HttpStatus.NOT_FOUND);
    return { donation: this.donationSummary(donation), auditLogs: donation.auditLogs, refunds: donation.refunds };
  }

  async recordRefund(auth: AuthContext, donationId: string, dto: RecordDonationRefundDto) {
    await this.assertAdmin(auth, 'operator');
    const donation = await this.db().supporterDonation.findUnique({ where: { id: donationId } });
    if (!donation) throw new ApiErrorException('Donation not found.', 'DONATION_NOT_FOUND', HttpStatus.NOT_FOUND);
    return this.recordRefundInternal(donation, dto, `admin_refund:${auth.userId}:${Date.now()}`);
  }

  private async fulfillDonation(donationId: string, input: PaymentWebhookDto) {
    const donation = await this.db().supporterDonation.findUnique({ where: { id: donationId } });
    if (!donation) throw new ApiErrorException('Donation not found.', 'DONATION_NOT_FOUND', HttpStatus.NOT_FOUND);
    if (donation.status === DONATION_STATUS.FULFILLED) return { success: true, status: donation.status, duplicate: true };
    const pack = getSupporterPackDefinition(donation.supporterPackId);
    if (!pack) throw new ApiErrorException('Supporter pack not found.', 'SUPPORTER_PACK_NOT_FOUND', HttpStatus.NOT_FOUND);

    await this.db().supporterDonation.update({
      where: { id: donation.id },
      data: { status: DONATION_STATUS.PAID, providerPaymentId: input.providerPaymentId, providerEventId: input.eventId },
    });
    for (const grant of pack.grants) {
      await this.inventoryService.grantInventoryItem({
        userId: donation.userId,
        playerId: donation.playerId ?? undefined,
        itemId: grant.itemId,
        quantity: grant.quantity,
        sourceType: 'supporter_pack',
        sourceId: donation.id,
        idempotencyKey: `${donation.id}:${grant.itemId}`,
        metadata: { donationId: donation.id, supporterPackId: pack.supporterPackId },
      });
    }
    const updated = await this.db().supporterDonation.update({
      where: { id: donation.id },
      data: { status: DONATION_STATUS.FULFILLED, fulfilledAt: new Date() },
    });
    if (!donation.receiptSentAt && donation.receiptEmail) {
      await this.mailService.sendSupporterReceipt(donation.receiptEmail, {
        donationId: donation.id,
        supporterPackName: pack.name,
        amountCents: pack.priceCents,
        currency: pack.currency,
      });
      await this.db().supporterDonation.update({ where: { id: donation.id }, data: { receiptSentAt: new Date() } });
    }
    await this.audit({ donationId: donation.id, userId: donation.userId, playerId: donation.playerId, actionType: 'support_donation_fulfilled', statusBefore: donation.status, statusAfter: DONATION_STATUS.FULFILLED, amountCents: pack.priceCents, currency: pack.currency, provider: donation.provider });
    await this.sensitive({ userId: donation.userId, playerId: donation.playerId, worldId: '' }, 'support_donation_fulfilled', 'supporter_donation', donation.id, { supporterPackId: pack.supporterPackId });
    return { success: true, status: updated.status };
  }

  private async recordRefundInternal(donation: Db, dto: RecordDonationRefundDto, eventId: string) {
    const status = (dto.amountCents ?? donation.amountCents) >= donation.amountCents ? DONATION_STATUS.REFUNDED : DONATION_STATUS.PARTIALLY_REFUNDED;
    const refund = await this.db().donationRefundRecord.create({
      data: {
        donationId: donation.id,
        userId: donation.userId,
        provider: donation.provider,
        providerRefundId: dto.providerRefundId,
        amountCents: dto.amountCents ?? donation.amountCents,
        currency: dto.currency ?? donation.currency,
        reason: dto.reason,
        status: 'recorded',
        metadata: { eventId },
      },
    });
    await this.db().supporterDonation.update({ where: { id: donation.id }, data: { status, refundedAt: new Date(), refundReason: dto.reason, providerEventId: eventId } });
    await this.audit({ donationId: donation.id, userId: donation.userId, playerId: donation.playerId, actionType: 'support_donation_refunded', statusBefore: donation.status, statusAfter: status, amountCents: refund.amountCents, currency: refund.currency, provider: donation.provider, payload: { refundId: refund.id } });
    return { success: true, refundId: refund.id, status };
  }

  private donationSummary(row: Db) {
    const pack = getSupporterPackDefinition(row.supporterPackId);
    return {
      id: row.id,
      supporterPackId: row.supporterPackId,
      supporterPackName: pack?.name ?? row.supporterPackId,
      status: row.status,
      amountCents: row.amountCents,
      currency: row.currency,
      provider: row.provider,
      providerSessionId: row.providerSessionId,
      fulfilledAt: row.fulfilledAt?.toISOString?.() ?? null,
      refundedAt: row.refundedAt?.toISOString?.() ?? null,
      receiptSentAt: row.receiptSentAt?.toISOString?.() ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      user: row.user ? { email: row.user.email, displayName: row.user.displayName } : undefined,
      player: row.player ? { id: row.player.id, name: row.player.name } : undefined,
      items: pack?.grants.map((grant) => ({ ...grant, name: getInventoryItemDefinition(grant.itemId)?.name ?? grant.itemId })) ?? [],
    };
  }

  private async audit(input: { donationId?: string; userId?: string; playerId?: string | null; actionType: string; statusBefore?: string; statusAfter?: string; amountCents?: number; currency?: string; provider?: string; payload?: unknown }) {
    await this.db().donationAuditLog.create({
      data: { ...input, playerId: input.playerId ?? undefined, payload: input.payload as any },
    });
  }

  private async sensitive(auth: Pick<AuthContext, 'userId' | 'playerId' | 'worldId'>, actionType: string, targetType: string, targetId: string, payload?: unknown) {
    await this.db().sensitiveActionAuditLog.create({ data: { worldId: auth.worldId || undefined, userId: auth.userId, playerId: auth.playerId || undefined, actionType, targetType, targetId, payload: payload as any } }).catch(() => undefined);
  }

  private async assertAdmin(auth: AuthContext, minimumRole: 'viewer' | 'support' | 'operator' | 'moderator' | 'super_admin') {
    const levels = { viewer: 1, support: 2, moderator: 3, operator: 4, super_admin: 5 };
    const user = await this.db().user.findUnique({ where: { id: auth.userId } });
    if (!user?.isAdmin || levels[user.adminRole as keyof typeof levels] < levels[minimumRole]) {
      throw new ApiErrorException('Admin access required.', 'ADMIN_ACCESS_REQUIRED', HttpStatus.FORBIDDEN);
    }
  }

  private db(): Db {
    return this.prisma as unknown as Db;
  }
}
