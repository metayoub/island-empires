import { HttpStatus, Injectable } from '@nestjs/common';
import { ADMIN_CONFIG } from '@island-empires/config';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import type { AuthContext } from '../auth/auth-context.service';
import type {
  AdminAbuseSignalQueryDto,
  AdminAuditQueryDto,
  AdminListQueryDto,
  AdminModerationActionDto,
  AdminNoteDto,
  AdminReviewAbuseSignalDto,
  AdminReviewReportDto,
  AdminRole,
} from './dto/admin.dto';

const ROLE_LEVEL: Record<AdminRole, number> = {
  viewer: 1,
  support: 2,
  moderator: 3,
  operator: 4,
  super_admin: 5,
};

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const RESOURCE_KEYS = ['wood', 'gold', 'marble', 'wine', 'crystal', 'sulfur'] as const;
type ModerationActionType = 'warning' | 'mute' | 'suspend' | 'ban';

type Db = Record<string, any>;
type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  adminRole: AdminRole;
  emailVerifiedAt: Date | null;
  accountStatus: string;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async me(auth: AuthContext) {
    const admin = await this.assertAdmin(auth, 'viewer');
    return {
      user: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.adminRole,
      },
      permissions: this.getPermissions(admin.adminRole),
    };
  }

  async getOverview(auth: AuthContext) {
    await this.assertAdmin(auth, 'viewer');
    const db = this.db();
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [
      players,
      cities,
      islands,
      messages24h,
      pendingReports,
      suspiciousTrades,
      openAbuseSignals,
      activeMovements,
      activeEvents,
      activeMutes,
      activeSuspensions,
      bans,
      resources,
    ] = await Promise.all([
      db.player.count({ where: { worldId: auth.worldId } }),
      db.city.count({ where: { worldId: auth.worldId } }),
      db.island.count({ where: { worldId: auth.worldId } }),
      db.message.count({ where: { worldId: auth.worldId, createdAt: { gte: since } } }),
      db.messageReport.count({ where: { worldId: auth.worldId, status: 'pending' } }),
      db.suspiciousTradeLog.count({ where: { worldId: auth.worldId } }),
      db.abuseSignal.count({ where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] } } }),
      db.movement.count({ where: { worldId: auth.worldId, status: { in: ['in_transit', 'returning'] } } }),
      db.liveEvent.count({ where: { worldId: auth.worldId, status: { in: ['scheduled', 'active'] } } }),
      db.playerModeration.count({ where: { worldId: auth.worldId, mutedUntil: { gt: now } } }),
      db.playerModeration.count({ where: { worldId: auth.worldId, suspendedUntil: { gt: now } } }),
      db.playerModeration.count({ where: { worldId: auth.worldId, bannedAt: { not: null } } }),
      db.cityResource.aggregate({
        _sum: RESOURCE_KEYS.reduce((sum, key) => ({ ...sum, [key]: true }), {}),
        where: { city: { worldId: auth.worldId } },
      }),
    ]);

    return {
      world: { id: auth.worldId },
      counts: {
        players,
        cities,
        islands,
        messages24h,
        pendingReports,
        suspiciousTrades,
        openAbuseSignals,
        activeMovements,
        activeEvents,
        activeMutes,
        activeSuspensions,
        bans,
      },
      resources: resources._sum,
      generatedAt: now.toISOString(),
    };
  }

  async searchPlayers(auth: AuthContext, query: AdminListQueryDto) {
    await this.assertAdmin(auth, 'support');
    const q = query.q?.trim();
    const players = await this.db().player.findMany({
      where: {
        worldId: auth.worldId,
        ...(q
          ? {
              OR: [
                { id: q },
                { name: { contains: q, mode: 'insensitive' } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { user: { displayName: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        user: true,
        moderation: true,
        cities: { select: { id: true, name: true }, take: 3, orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take: this.limit(query.limit),
    });

    return { players: players.map((player: any) => this.playerSummary(player)) };
  }

  async getPlayer(auth: AuthContext, playerId: string) {
    await this.assertAdmin(auth, 'support');
    const player = await this.db().player.findFirst({
      where: { id: playerId, worldId: auth.worldId },
      include: {
        user: true,
        moderation: true,
        cities: { include: { island: true, resources: true }, orderBy: { createdAt: 'asc' } },
        adminNotes: { include: { adminUser: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        adminWarnings: { include: { adminUser: true }, orderBy: { createdAt: 'desc' }, take: 20 },
        moderationActions: { include: { adminUser: true }, orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!player) {
      throw new ApiErrorException('Player not found.', 'PLAYER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    return {
      player: {
        ...this.playerSummary(player),
        cities: player.cities.map((city: any) => this.citySummary(city)),
        notes: player.adminNotes.map((note: any) => ({
          id: note.id,
          body: note.body,
          admin: this.adminSummary(note.adminUser),
          createdAt: note.createdAt.toISOString(),
        })),
        warnings: player.adminWarnings.map((warning: any) => ({
          id: warning.id,
          reason: warning.reason,
          message: warning.message,
          admin: this.adminSummary(warning.adminUser),
          createdAt: warning.createdAt.toISOString(),
        })),
        moderationActions: player.moderationActions.map((action: any) => ({
          ...this.serializable(action),
          admin: this.adminSummary(action.adminUser),
        })),
      },
    };
  }

  async searchCities(auth: AuthContext, query: AdminListQueryDto) {
    await this.assertAdmin(auth, 'support');
    const q = query.q?.trim();
    const cities = await this.db().city.findMany({
      where: {
        worldId: auth.worldId,
        ...(q
          ? {
              OR: [
                { id: q },
                { name: { contains: q, mode: 'insensitive' } },
                { player: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: { player: true, island: true, resources: true },
      orderBy: [{ level: 'desc' }, { population: 'desc' }],
      take: this.limit(query.limit),
    });

    return { cities: cities.map((city: any) => this.citySummary(city)) };
  }

  async getCity(auth: AuthContext, cityId: string) {
    await this.assertAdmin(auth, 'support');
    const city = await this.db().city.findFirst({
      where: { id: cityId, worldId: auth.worldId },
      include: {
        player: true,
        island: true,
        resources: true,
        buildings: { orderBy: { slotIndex: 'asc' } },
        units: true,
        fleet: true,
        spyState: true,
      },
    });
    if (!city) {
      throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return { city: this.citySummary(city), buildings: city.buildings, units: city.units, fleet: city.fleet, spyState: city.spyState };
  }

  async listResourceAudit(auth: AuthContext, query: AdminAuditQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const rows = await this.db().resourceTransaction.findMany({
      where: {
        worldId: auth.worldId,
        ...(query.playerId ? { playerId: query.playerId } : {}),
        ...(query.cityId ? { cityId: query.cityId } : {}),
      },
      include: { player: true, city: true },
      orderBy: { createdAt: 'desc' },
      take: this.limit(query.limit),
    });
    return { transactions: rows.map((row: any) => ({ ...this.serializable(row), player: this.playerLite(row.player), city: this.cityLite(row.city) })) };
  }

  async listTradeAudit(auth: AuthContext, query: AdminAuditQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const rows = await this.db().tradeHistory.findMany({
      where: {
        worldId: auth.worldId,
        ...(query.playerId
          ? { OR: [{ sellerPlayerId: query.playerId }, { buyerPlayerId: query.playerId }] }
          : {}),
        ...(query.cityId
          ? { OR: [{ sellerCityId: query.cityId }, { buyerCityId: query.cityId }] }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: this.limit(query.limit),
    });
    const suspicious = await this.db().suspiciousTradeLog.findMany({
      where: { worldId: auth.worldId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { trades: rows.map((row: any) => this.serializable(row)), suspicious: suspicious.map((row: any) => this.serializable(row)) };
  }

  async listBattleAudit(auth: AuthContext, query: AdminAuditQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const rows = await this.db().movement.findMany({
      where: {
        worldId: auth.worldId,
        movementType: { in: ['pve_attack', 'pve_return', 'pvp_attack', 'pvp_return'] },
        ...(query.playerId ? { playerId: query.playerId } : {}),
        ...(query.cityId ? { OR: [{ originCityId: query.cityId }, { destinationCityId: query.cityId }] } : {}),
      },
      include: { player: true, originCity: true, destinationCity: true },
      orderBy: { createdAt: 'desc' },
      take: this.limit(query.limit),
    });
    return { battles: rows.map((row: any) => this.movementRow(row)) };
  }

  async listNavalAudit(auth: AuthContext, query: AdminAuditQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const rows = await this.db().navalAttack.findMany({
      where: {
        worldId: auth.worldId,
        ...(query.playerId ? { OR: [{ attackerPlayerId: query.playerId }, { defenderPlayerId: query.playerId }] } : {}),
        ...(query.cityId ? { OR: [{ originCityId: query.cityId }, { targetCityId: query.cityId }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: this.limit(query.limit),
    });
    const blockades = await this.db().cityBlockade.findMany({
      where: { worldId: auth.worldId, ...(query.cityId ? { targetCityId: query.cityId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { navalAttacks: rows.map((row: any) => this.serializable(row)), blockades: blockades.map((row: any) => this.serializable(row)) };
  }

  async listScoutingAudit(auth: AuthContext, query: AdminAuditQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const rows = await this.db().spyMission.findMany({
      where: {
        worldId: auth.worldId,
        ...(query.playerId ? { OR: [{ attackerPlayerId: query.playerId }, { targetPlayerId: query.playerId }] } : {}),
        ...(query.cityId ? { OR: [{ originCityId: query.cityId }, { targetCityId: query.cityId }] } : {}),
      },
      include: { attackerPlayer: true, targetPlayer: true, originCity: true, targetCity: true },
      orderBy: { createdAt: 'desc' },
      take: this.limit(query.limit),
    });
    return { spyMissions: rows.map((row: any) => this.serializable(row)) };
  }

  async getPaymentAudit(auth: AuthContext, query: AdminAuditQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const q = query.q?.trim();
    const purchases = await this.db().premiumPurchase.findMany({
      where: {
        worldId: auth.worldId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.playerId ? { playerId: query.playerId } : {}),
        ...(q
          ? {
              OR: [
                { id: q },
                { itemId: { contains: q, mode: 'insensitive' } },
                { itemName: { contains: q, mode: 'insensitive' } },
                { provider: { contains: q, mode: 'insensitive' } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
                { player: { name: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: { user: true, player: true, refunds: true },
      orderBy: { createdAt: 'desc' },
      take: this.limit(query.limit),
    });
    return {
      payments: purchases.map((purchase: any) => ({
        id: purchase.id,
        userEmail: purchase.user?.email ?? null,
        playerName: purchase.player?.name ?? null,
        productId: purchase.itemId,
        productName: purchase.itemName,
        productType: purchase.kind,
        status: purchase.status,
        amountCents: purchase.moneyAmountCents,
        amountGems: purchase.premiumCurrencyAmount || purchase.premiumCurrencyCost,
        currency: purchase.currencyCode,
        provider: purchase.provider,
        providerSessionId: purchase.providerSessionId,
        providerPaymentId: purchase.providerPaymentId,
        createdAt: purchase.createdAt.toISOString(),
        fulfilledAt: purchase.fulfilledAt?.toISOString() ?? null,
        refundedAt: purchase.refundedAt?.toISOString() ?? null,
        refundStatus: purchase.refunds?.[0]?.status ?? null,
      })),
    };
  }

  async getPaymentAuditDetail(auth: AuthContext, purchaseId: string) {
    await this.assertAdmin(auth, 'operator');
    const purchase = await this.db().premiumPurchase.findFirst({
      where: { id: purchaseId, worldId: auth.worldId },
      include: { user: true, player: true, refunds: true, auditLogs: true },
    });
    if (!purchase) {
      throw new ApiErrorException('Purchase not found.', 'PURCHASE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const ledgerEntries = await this.db().premiumLedgerEntry.findMany({
      where: { worldId: auth.worldId, referenceType: 'purchase', referenceId: purchase.id },
      orderBy: { createdAt: 'desc' },
    });
    const abuseSignals = await this.db().abuseSignal.findMany({
      where: { worldId: auth.worldId, playerId: purchase.playerId, signalType: { contains: 'purchase', mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return {
      purchase: this.serializable(purchase),
      user: purchase.user ? { id: purchase.user.id, email: purchase.user.email, accountStatus: purchase.user.accountStatus } : null,
      player: this.playerLite(purchase.player),
      ledgerEntries: ledgerEntries.map((entry: any) => this.serializable(entry)),
      refunds: purchase.refunds.map((refund: any) => this.serializable(refund)),
      auditLogs: purchase.auditLogs.map((log: any) => this.serializable(log)),
      abuseSignals: abuseSignals.map((signal: any) => this.serializable(signal)),
    };
  }

  async recordPaymentRefund(
    auth: AuthContext,
    purchaseId: string,
    input: { amountCents?: number; currency?: string; reason?: string },
  ) {
    const admin = await this.assertAdmin(auth, 'operator');
    const purchase = await this.db().premiumPurchase.findFirst({ where: { id: purchaseId, worldId: auth.worldId } });
    if (!purchase) {
      throw new ApiErrorException('Purchase not found.', 'PURCHASE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const refund = await this.db().$transaction(async (tx: Db) => {
      const created = await tx.premiumRefund.create({
        data: {
          worldId: auth.worldId,
          purchaseId: purchase.id,
          playerId: purchase.playerId,
          userId: purchase.userId,
          amountCents: input.amountCents ?? purchase.moneyAmountCents,
          premiumCurrency: purchase.premiumCurrencyAmount,
          reason: input.reason ?? 'Admin refund record',
          status: 'recorded',
        },
      });
      await tx.premiumPurchase.update({
        where: { id: purchase.id },
        data: { status: 'refunded', refundedAt: new Date(), refundReason: input.reason },
      });
      await tx.premiumAuditLog.create({
        data: {
          worldId: auth.worldId,
          playerId: purchase.playerId,
          userId: purchase.userId,
          purchaseId: purchase.id,
          actionType: 'refund_recorded',
          payload: {
            adminUserId: admin.id,
            amountCents: input.amountCents ?? purchase.moneyAmountCents,
            currency: input.currency ?? purchase.currencyCode,
            reason: input.reason,
          },
        },
      });
      await tx.adminActionLog.create({
        data: {
          worldId: auth.worldId,
          adminUserId: admin.id,
          actionType: 'payment_refund_recorded',
          targetType: 'premium_purchase',
          targetId: purchase.id,
          reason: input.reason ?? 'Admin refund record',
          metadata: { amountCents: input.amountCents, currency: input.currency },
        },
      });
      return created;
    });
    return { success: true, refund: this.serializable(refund) };
  }

  async getMessageModeration(auth: AuthContext, query: AdminListQueryDto) {
    await this.assertAdmin(auth, 'moderator');
    const reports = await this.db().messageReport.findMany({
      where: { worldId: auth.worldId, ...(query.q ? { reason: { contains: query.q, mode: 'insensitive' } } : {}) },
      include: { reporter: true, message: { include: { sender: true, recipient: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: this.limit(query.limit),
    });
    return {
      reports: reports.map((report: any) => ({
        id: report.id,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
        reporter: this.playerLite(report.reporter),
        message: this.messageSummary(report.message),
      })),
    };
  }

  async reviewMessageReport(auth: AuthContext, reportId: string, dto: AdminReviewReportDto) {
    const admin = await this.assertAdmin(auth, 'moderator');
    const report = await this.db().messageReport.findFirst({ where: { id: reportId, worldId: auth.worldId } });
    if (!report) {
      throw new ApiErrorException('Report not found.', 'REPORT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const updated = await this.db().messageReport.update({
      where: { id: report.id },
      data: { status: dto.status, reviewedAt: new Date() },
    });
    await this.log(auth.worldId, admin.id, 'message_report_reviewed', 'message_report', report.id, dto.reason, {
      payloadBefore: report,
      payloadAfter: updated,
      metadata: { status: dto.status, resolutionNote: dto.resolutionNote ?? null },
    });
    return { report: this.serializable(updated) };
  }

  async addPlayerNote(auth: AuthContext, playerId: string, dto: AdminNoteDto) {
    const admin = await this.assertAdmin(auth, 'support');
    const player = await this.assertPlayerInWorld(playerId, auth.worldId);
    const body = (dto.body ?? dto.note ?? '').trim();
    if (!body) {
      throw new ApiErrorException('Admin note is required.', 'ADMIN_NOTE_REQUIRED', HttpStatus.BAD_REQUEST);
    }
    const note = await this.db().adminPlayerNote.create({
      data: { worldId: auth.worldId, playerId, userId: player.userId, adminUserId: admin.id, body },
      include: { adminUser: true },
    });
    await this.log(auth.worldId, admin.id, 'player_note_added', 'player', playerId, null, {
      payloadAfter: note,
      metadata: { noteId: note.id },
    });
    return { note: this.serializable(note) };
  }

  async warnPlayer(auth: AuthContext, playerId: string, dto: AdminModerationActionDto) {
    const admin = await this.assertAdmin(auth, 'moderator');
    const player = await this.assertPlayerInWorld(playerId, auth.worldId);
    const warning = await this.db().adminPlayerWarning.create({
      data: {
        worldId: auth.worldId,
        playerId,
        adminUserId: admin.id,
        reason: dto.reason.trim(),
        message: this.publicMessage(dto) || null,
      },
    });
    const moderationBefore = await this.db().playerModeration.findUnique({ where: { playerId } });
    const moderation = await this.db().playerModeration.upsert({
      where: { playerId },
      update: { warningCount: { increment: 1 }, status: 'warned', reason: dto.reason.trim() },
      create: { playerId, worldId: auth.worldId, warningCount: 1, status: 'warned', reason: dto.reason.trim() },
    });
    const action = await this.createModerationAction({
      auth,
      player,
      adminUserId: admin.id,
      actionType: 'warning',
      dto,
    });
    await this.sendModerationSystemMessage(auth.worldId, playerId, 'Account warning', this.publicMessage(dto) || 'An account warning has been added to your moderation history.');
    await this.log(auth.worldId, admin.id, 'player_warned', 'player', playerId, dto.reason, {
      payloadBefore: moderationBefore,
      payloadAfter: moderation,
      metadata: { warningId: warning.id, moderationActionId: action.id },
    });
    return { warning: this.serializable(warning) };
  }

  async mutePlayer(auth: AuthContext, playerId: string, dto: AdminModerationActionDto) {
    return this.setModeration(auth, playerId, dto, 'player_muted', 'mute', {
      status: 'muted',
      mutedUntil: this.durationFromNow(dto, ADMIN_CONFIG.moderation.maxMuteDays, 1),
    });
  }

  async unmutePlayer(auth: AuthContext, playerId: string, dto: AdminModerationActionDto) {
    return this.revokeActiveModerationByType(auth, playerId, 'mute', dto.reason, { mutedUntil: null });
  }

  async suspendPlayer(auth: AuthContext, playerId: string, dto: AdminModerationActionDto) {
    return this.setModeration(auth, playerId, dto, 'player_suspended', 'suspend', {
      status: 'suspended',
      suspendedUntil: this.durationFromNow(dto, ADMIN_CONFIG.moderation.maxSuspendDays, 7),
    });
  }

  async unsuspendPlayer(auth: AuthContext, playerId: string, dto: AdminModerationActionDto) {
    return this.revokeActiveModerationByType(auth, playerId, 'suspend', dto.reason, { suspendedUntil: null });
  }

  async banPlayer(auth: AuthContext, playerId: string, dto: AdminModerationActionDto) {
    return this.setModeration(auth, playerId, dto, 'player_banned', 'ban', {
      status: 'banned',
      bannedAt: new Date(),
    }, ADMIN_CONFIG.permissions.banRequiresSuperAdmin ? 'super_admin' : 'operator');
  }

  async unbanPlayer(auth: AuthContext, playerId: string, dto: AdminModerationActionDto) {
    return this.revokeActiveModerationByType(auth, playerId, 'ban', dto.reason, { bannedAt: null, status: 'clear' }, 'super_admin');
  }

  async revokeModerationAction(auth: AuthContext, actionId: string, reason: string) {
    const admin = await this.assertAdmin(auth, 'moderator');
    const action = await this.db().playerModerationAction.findFirst({
      where: { id: actionId, worldId: auth.worldId },
    });
    if (!action) {
      throw new ApiErrorException('Moderation action not found.', 'MODERATION_ACTION_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (action.status !== 'active') {
      throw new ApiErrorException('Moderation action is not active.', 'MODERATION_ACTION_NOT_ACTIVE', HttpStatus.CONFLICT);
    }
    const updates = this.restrictionClearUpdates(action.actionType);
    const updated = await this.db().playerModerationAction.update({
      where: { id: action.id },
      data: { status: 'revoked', revokedAt: new Date(), revokedByUserId: admin.id },
    });
    const moderationBefore = await this.db().playerModeration.findUnique({ where: { playerId: action.playerId } });
    const moderation = await this.db().playerModeration.upsert({
      where: { playerId: action.playerId },
      update: { ...updates, reason },
      create: { playerId: action.playerId, worldId: auth.worldId, status: 'clear', ...updates, reason },
    });
    await this.sendModerationSystemMessage(auth.worldId, action.playerId, 'Moderation action revoked', 'A moderation action on your account has been revoked.');
    await this.log(auth.worldId, admin.id, 'moderation_action_revoked', 'moderation_action', action.id, reason, {
      playerId: action.playerId,
      payloadBefore: { action, moderation: moderationBefore },
      payloadAfter: { action: updated, moderation },
    });
    return { action: this.serializable(updated), moderation: this.serializable(moderation) };
  }

  async listSuspiciousActivity(auth: AuthContext, query: AdminListQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const [trades, analytics, abuseSignals] = await Promise.all([
      this.db().suspiciousTradeLog.findMany({
        where: { worldId: auth.worldId },
        orderBy: { createdAt: 'desc' },
        take: this.limit(query.limit),
      }),
      this.db().gameAnalyticsEvent.findMany({
        where: {
          worldId: auth.worldId,
          eventType: { in: ['pvp_attack_started', 'naval_attack_started', 'spy_mission_started'] },
        },
        orderBy: { createdAt: 'desc' },
        take: this.limit(query.limit),
      }),
      this.db().abuseSignal.findMany({
        where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] } },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: this.limit(query.limit),
      }),
    ]);
    return {
      suspiciousTrades: trades.map((row: any) => this.serializable(row)),
      activity: analytics.map((row: any) => this.serializable(row)),
      abuseSignals: abuseSignals.map((row: any) => this.serializable(row)),
    };
  }

  async getAntiAbuseDashboard(auth: AuthContext) {
    await this.assertAdmin(auth, 'operator');
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [open, criticalFlags, highSeverity, mediumFlags, lowFlags, created24h, byType, bySeverity, latest] = await Promise.all([
      this.db().abuseSignal.count({ where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] } } }),
      this.db().abuseSignal.count({ where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] }, severity: 'critical' } }),
      this.db().abuseSignal.count({ where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] }, severity: { in: ['high', 'critical'] } } }),
      this.db().abuseSignal.count({ where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] }, severity: 'medium' } }),
      this.db().abuseSignal.count({ where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] }, severity: 'low' } }),
      this.db().abuseSignal.count({ where: { worldId: auth.worldId, createdAt: { gte: since24h } } }),
      this.db().abuseSignal.groupBy({
        by: ['signalType'],
        where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] } },
        _count: { _all: true },
      }),
      this.db().abuseSignal.groupBy({
        by: ['severity'],
        where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] } },
        _count: { _all: true },
      }),
      this.db().abuseSignal.findMany({
        where: { worldId: auth.worldId, status: { in: ['open', 'reviewing'] } },
        include: { player: true, relatedPlayer: true },
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
    ]);
    return {
      openFlags: open,
      criticalFlags,
      highFlags: highSeverity,
      mediumFlags,
      lowFlags,
      flagsToday: created24h,
      topFlagTypes: byType.map((row: any) => ({ flagType: row.signalType, count: row._count._all })),
      counts: { open, criticalFlags, highSeverity, mediumFlags, lowFlags, created24h },
      byType: byType.map((row: any) => ({ signalType: row.signalType, count: row._count._all })),
      bySeverity: bySeverity.map((row: any) => ({ severity: row.severity, count: row._count._all })),
      latest: latest.map((row: any) => this.abuseSignalRow(row)),
      generatedAt: new Date().toISOString(),
    };
  }

  async listAbuseSignals(auth: AuthContext, query: AdminAbuseSignalQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const rows = await this.db().abuseSignal.findMany({
      where: {
        worldId: auth.worldId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.signalType ? { signalType: query.signalType } : {}),
        ...(query.severity || query.riskLevel ? { severity: query.severity ?? query.riskLevel } : {}),
        ...(query.playerId ? { OR: [{ playerId: query.playerId }, { relatedPlayerId: query.playerId }] } : {}),
      },
      include: { player: true, relatedPlayer: true },
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
      take: this.limit(query.limit),
    });
    const flags = rows.map((row: any) => this.abuseSignalRow(row));
    return { signals: flags, flags, pagination: { page: query.page ?? 1, pageSize: this.limit(query.pageSize ?? query.limit), total: flags.length } };
  }

  async getAbuseSignal(auth: AuthContext, signalId: string) {
    await this.assertAdmin(auth, 'operator');
    const signal = await this.db().abuseSignal.findFirst({
      where: { id: signalId, worldId: auth.worldId },
      include: { player: true, relatedPlayer: true },
    });
    if (!signal) {
      throw new ApiErrorException('Anti-abuse flag not found.', 'ANTI_ABUSE_FLAG_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const [sensitiveActions, accountSignals, tradeHistory, battles, resourceTransactions] = await Promise.all([
      this.db().sensitiveActionAuditLog.findMany({
        where: {
          worldId: auth.worldId,
          OR: [{ playerId: signal.playerId }, { relatedPlayerId: signal.playerId }, { playerId: signal.relatedPlayerId }],
        },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
      signal.playerId
        ? this.db().accountRiskSignal.findMany({ where: { playerId: signal.playerId }, orderBy: { createdAt: 'desc' }, take: 25 })
        : [],
      signal.playerId
        ? this.db().tradeHistory.findMany({
            where: { worldId: auth.worldId, OR: [{ sellerPlayerId: signal.playerId }, { buyerPlayerId: signal.playerId }] },
            orderBy: { createdAt: 'desc' },
            take: 25,
          })
        : [],
      signal.playerId
        ? this.db().movement.findMany({
            where: { worldId: auth.worldId, playerId: signal.playerId, movementType: { in: ['pvp_attack', 'pvp_return', 'naval_attack', 'naval_return'] } },
            orderBy: { createdAt: 'desc' },
            take: 25,
          })
        : [],
      signal.playerId
        ? this.db().resourceTransaction.findMany({ where: { worldId: auth.worldId, playerId: signal.playerId }, orderBy: { createdAt: 'desc' }, take: 25 })
        : [],
    ]);
    return {
      flag: this.abuseSignalRow(signal),
      relatedActions: sensitiveActions.map((row: any) => this.serializable(row)),
      accountSignals: accountSignals.map((row: any) => this.serializable(row)),
      linkedTrades: tradeHistory.map((row: any) => this.serializable(row)),
      linkedBattles: battles.map((row: any) => this.serializable(row)),
      resourceTransactions: resourceTransactions.map((row: any) => this.serializable(row)),
      adminNotes: signal.adminNote ? [{ body: signal.adminNote, createdAt: signal.updatedAt.toISOString() }] : [],
      reviewHistory: [{ status: signal.status, reviewedAt: signal.reviewedAt?.toISOString() ?? null, reviewedBy: signal.reviewedBy ?? null }],
    };
  }

  async reviewAbuseSignal(auth: AuthContext, signalId: string, dto: AdminReviewAbuseSignalDto) {
    const admin = await this.assertAdmin(auth, 'operator');
    const signal = await this.db().abuseSignal.findFirst({ where: { id: signalId, worldId: auth.worldId } });
    if (!signal) {
      throw new ApiErrorException('Anti-abuse flag not found.', 'ANTI_ABUSE_FLAG_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const updated = await this.db().abuseSignal.update({
      where: { id: signal.id },
      data: {
        status: dto.status,
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        resolvedAt: ['resolved', 'dismissed', 'false_positive'].includes(dto.status) ? new Date() : null,
        resolutionNote: dto.resolutionNote?.trim() || null,
        adminNote: dto.adminNote?.trim() || signal.adminNote,
      },
    });
    await this.log(auth.worldId, admin.id, 'abuse_signal_reviewed', 'abuse_signal', signal.id, dto.resolutionNote ?? dto.status, {
      playerId: signal.playerId,
      payloadBefore: signal,
      payloadAfter: updated,
      metadata: { status: dto.status },
    });
    return { signal: this.serializable(updated) };
  }

  async assignAbuseSignal(auth: AuthContext, signalId: string, adminUserId: string) {
    const admin = await this.assertAdmin(auth, 'operator');
    const signal = await this.db().abuseSignal.findFirst({ where: { id: signalId, worldId: auth.worldId } });
    if (!signal) {
      throw new ApiErrorException('Anti-abuse flag not found.', 'ANTI_ABUSE_FLAG_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const updated = await this.db().abuseSignal.update({
      where: { id: signal.id },
      data: { assignedAdminUserId: adminUserId, status: signal.status === 'open' ? 'reviewing' : signal.status },
    });
    await this.log(auth.worldId, admin.id, 'abuse_signal_assigned', 'abuse_signal', signal.id, `Assigned to ${adminUserId}`, {
      playerId: signal.playerId,
      payloadBefore: signal,
      payloadAfter: updated,
    });
    return { signal: this.serializable(updated) };
  }

  async getPlayerRiskProfile(auth: AuthContext, playerId: string) {
    await this.assertAdmin(auth, 'operator');
    await this.assertPlayerInWorld(playerId, auth.worldId);
    const [signals, relatedSignals, actions] = await Promise.all([
      this.db().abuseSignal.findMany({ where: { worldId: auth.worldId, playerId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.db().abuseSignal.findMany({ where: { worldId: auth.worldId, relatedPlayerId: playerId }, include: { player: true }, orderBy: { createdAt: 'desc' }, take: 25 }),
      this.db().sensitiveActionAuditLog.findMany({ where: { worldId: auth.worldId, playerId }, orderBy: { createdAt: 'desc' }, take: 25 }),
    ]);
    const riskScore = Math.max(0, ...signals.map((signal: any) => signal.score ?? 0));
    return {
      playerId,
      riskScore,
      riskLevel: this.scoreToRiskLevel(riskScore),
      openFlags: signals.filter((signal: any) => ['open', 'reviewing', 'escalated'].includes(signal.status)).length,
      recentSignals: signals.map((signal: any) => this.serializable(signal)),
      relatedPlayers: relatedSignals
        .filter((signal: any) => signal.player)
        .map((signal: any) => ({
          playerId: signal.player.id,
          playerName: signal.player.name,
          relationshipType: signal.signalType,
          riskLevel: signal.severity,
        })),
      recentSensitiveActions: actions.map((row: any) => this.serializable(row)),
    };
  }

  async listSensitiveActionAudits(auth: AuthContext, query: AdminAbuseSignalQueryDto) {
    await this.assertAdmin(auth, 'operator');
    const rows = await this.db().sensitiveActionAuditLog.findMany({
      where: {
        worldId: auth.worldId,
        ...(query.actionType ? { actionType: query.actionType } : query.q ? { actionType: { contains: query.q, mode: 'insensitive' } } : {}),
        ...(query.playerId ? { OR: [{ playerId: query.playerId }, { relatedPlayerId: query.playerId }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: this.limit(query.limit ?? query.pageSize),
    });
    return { auditActions: rows.map((row: any) => this.serializable(row)) };
  }

  async listActionLogs(auth: AuthContext, query: AdminListQueryDto) {
    await this.assertAdmin(auth, 'viewer');
    const logs = await this.db().adminActionLog.findMany({
      where: { worldId: auth.worldId, ...(query.q ? { actionType: { contains: query.q, mode: 'insensitive' } } : {}) },
      include: { adminUser: true },
      orderBy: { createdAt: 'desc' },
      take: this.limit(query.limit),
    });
    return { logs: logs.map((log: any) => ({ ...this.serializable(log), admin: this.adminSummary(log.adminUser) })) };
  }

  private async setModeration(
    auth: AuthContext,
    playerId: string,
    dto: AdminModerationActionDto,
    action: string,
    actionType: ModerationActionType,
    updates: Record<string, unknown>,
    role: AdminRole = 'moderator',
  ) {
    const admin = await this.assertAdmin(auth, role);
    const player = await this.assertPlayerInWorld(playerId, auth.worldId);
    await this.assertNoActiveRestriction(playerId, actionType);
    const moderationBefore = await this.db().playerModeration.findUnique({ where: { playerId } });
    const moderation = await this.db().playerModeration.upsert({
      where: { playerId },
      update: { ...updates, reason: dto.reason.trim() },
      create: {
        playerId,
        worldId: auth.worldId,
        ...updates,
        reason: dto.reason.trim(),
      },
    });
    const moderationAction = await this.createModerationAction({
      auth,
      player,
      adminUserId: admin.id,
      actionType,
      dto,
      endsAt: (updates.mutedUntil ?? updates.suspendedUntil ?? null) as Date | null,
    });
    await this.sendModerationSystemMessage(auth.worldId, playerId, this.moderationTitle(actionType), this.publicMessage(dto) || this.defaultModerationMessage(actionType));
    await this.log(auth.worldId, admin.id, action, 'player', playerId, dto.reason, {
      payloadBefore: moderationBefore,
      payloadAfter: moderation,
      metadata: {
        durationDays: dto.durationDays ?? null,
        durationHours: dto.durationHours ?? null,
        moderationActionId: moderationAction.id,
      },
    });
    return { moderation: this.serializable(moderation), action: this.serializable(moderationAction) };
  }

  private async revokeActiveModerationByType(
    auth: AuthContext,
    playerId: string,
    actionType: 'mute' | 'suspend' | 'ban',
    reason: string,
    updates: Record<string, unknown>,
    role: AdminRole = 'moderator',
  ) {
    const admin = await this.assertAdmin(auth, role);
    await this.assertPlayerInWorld(playerId, auth.worldId);
    const activeAction = await this.db().playerModerationAction.findFirst({
      where: { worldId: auth.worldId, playerId, actionType, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    const moderationBefore = await this.db().playerModeration.findUnique({ where: { playerId } });
    if (activeAction) {
      await this.db().playerModerationAction.update({
        where: { id: activeAction.id },
        data: { status: 'revoked', revokedAt: new Date(), revokedByUserId: admin.id },
      });
    }
    const moderation = await this.db().playerModeration.upsert({
      where: { playerId },
      update: { ...updates, reason },
      create: { playerId, worldId: auth.worldId, status: 'clear', ...updates, reason },
    });
    await this.sendModerationSystemMessage(auth.worldId, playerId, 'Moderation action revoked', `Your ${actionType} has been revoked.`);
    await this.log(auth.worldId, admin.id, this.revokeActionLogType(actionType), 'player', playerId, reason, {
      payloadBefore: { action: activeAction, moderation: moderationBefore },
      payloadAfter: moderation,
    });
    return { moderation: this.serializable(moderation) };
  }

  private async assertAdmin(auth: AuthContext, minimumRole: AdminRole): Promise<AdminUser> {
    const user = await this.db().user.findUnique({
      where: { id: auth.userId },
      include: { adminRoles: { where: { revokedAt: null }, orderBy: { grantedAt: 'desc' } } },
    });
    if (!user?.isAdmin || user.accountStatus !== 'active' || !user.emailVerifiedAt) {
      throw new ApiErrorException('Admin access is required.', 'ADMIN_ACCESS_REQUIRED', HttpStatus.FORBIDDEN);
    }
    const role = this.highestRole(user.adminRoles?.map((entry: { role: string }) => entry.role) ?? [user.adminRole]);
    if (ROLE_LEVEL[role] < ROLE_LEVEL[minimumRole]) {
      throw new ApiErrorException('This admin role cannot perform that action.', 'ADMIN_PERMISSION_DENIED', HttpStatus.FORBIDDEN);
    }
    return { ...user, adminRole: role };
  }

  private async assertPlayerInWorld(playerId: string, worldId: string) {
    const player = await this.db().player.findFirst({ where: { id: playerId, worldId }, select: { id: true, userId: true } });
    if (!player) {
      throw new ApiErrorException('Player not found.', 'PLAYER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return player;
  }

  private async assertNoActiveRestriction(
    playerId: string,
    actionType: ModerationActionType,
  ): Promise<void> {
    if (actionType === 'warning') return;
    const now = new Date();
    const moderation = await this.db().playerModeration.findUnique({ where: { playerId } });
    if (actionType === 'mute' && moderation?.mutedUntil && moderation.mutedUntil > now) {
      throw new ApiErrorException('This player is already muted.', 'PLAYER_ALREADY_MUTED', HttpStatus.CONFLICT);
    }
    if (actionType === 'suspend' && moderation?.suspendedUntil && moderation.suspendedUntil > now) {
      throw new ApiErrorException('This player is already suspended.', 'PLAYER_ALREADY_SUSPENDED', HttpStatus.CONFLICT);
    }
    if (actionType === 'ban' && moderation?.bannedAt) {
      throw new ApiErrorException('This player is already banned.', 'PLAYER_ALREADY_BANNED', HttpStatus.CONFLICT);
    }
  }

  private async createModerationAction(input: {
    auth: AuthContext;
    player: { id: string; userId: string };
    adminUserId: string;
    actionType: ModerationActionType;
    dto: AdminModerationActionDto;
    endsAt?: Date | null;
  }) {
    return this.db().playerModerationAction.create({
      data: {
        worldId: input.auth.worldId,
        playerId: input.player.id,
        userId: input.player.userId,
        adminUserId: input.adminUserId,
        actionType: input.actionType,
        status: 'active',
        reason: input.dto.reason.trim(),
        internalNote: input.dto.internalNote?.trim() || null,
        publicMessage: this.publicMessage(input.dto) || null,
        endsAt: input.endsAt ?? null,
      },
    });
  }

  private async sendModerationSystemMessage(
    worldId: string,
    playerId: string,
    subject: string,
    body: string,
  ): Promise<void> {
    const message = await this.db().message.create({
      data: {
        worldId,
        recipientPlayerId: playerId,
        messageType: 'system',
        subject,
        body,
      },
    });
    await this.db().notificationDelivery?.upsert({
      where: { messageId_channel: { messageId: message.id, channel: 'in_game' } },
      update: {},
      create: {
        worldId,
        playerId,
        messageId: message.id,
        type: 'message',
        channel: 'in_game',
        status: 'delivered',
        title: subject,
        body,
        scheduledAt: message.createdAt,
        deliveredAt: message.createdAt,
      },
    });
  }

  private publicMessage(dto: AdminModerationActionDto): string | null {
    return dto.publicMessage?.trim() || dto.message?.trim() || null;
  }

  private durationFromNow(dto: AdminModerationActionDto, maxDays: number, fallbackDays: number): Date {
    const hours = dto.durationHours ?? (dto.durationDays ?? fallbackDays) * 24;
    const maxHours = maxDays * 24;
    if (hours > maxHours) {
      throw new ApiErrorException(
        `Moderation duration cannot exceed ${maxDays} days.`,
        'MODERATION_DURATION_TOO_LONG',
        HttpStatus.BAD_REQUEST,
      );
    }
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private restrictionClearUpdates(actionType: string): Record<string, unknown> {
    if (actionType === 'mute') return { mutedUntil: null };
    if (actionType === 'suspend') return { suspendedUntil: null };
    if (actionType === 'ban') return { bannedAt: null, status: 'clear' };
    return {};
  }

  private moderationTitle(actionType: string): string {
    if (actionType === 'mute') return 'Messaging temporarily muted';
    if (actionType === 'suspend') return 'Account temporarily suspended';
    if (actionType === 'ban') return 'Account banned';
    return 'Account warning';
  }

  private defaultModerationMessage(actionType: string): string {
    if (actionType === 'mute') {
      return 'Your messaging access is temporarily muted. You can still continue playing the game.';
    }
    if (actionType === 'suspend') {
      return 'Your account is temporarily suspended.';
    }
    if (actionType === 'ban') {
      return 'Your account has been banned.';
    }
    return 'An account warning has been added to your moderation history.';
  }

  private revokeActionLogType(actionType: string): string {
    if (actionType === 'mute') return 'player_unmuted';
    if (actionType === 'suspend') return 'player_unsuspended';
    if (actionType === 'ban') return 'player_unbanned';
    return 'moderation_action_revoked';
  }

  private async log(
    worldId: string,
    adminUserId: string,
    action: string,
    targetType: string | null,
    targetId: string | null,
    reason: string | null,
    options?: {
      playerId?: string | null;
      payloadBefore?: unknown;
      payloadAfter?: unknown;
      metadata?: Record<string, unknown>;
    },
  ) {
    await this.db().adminActionLog.create({
      data: {
        worldId,
        adminUserId,
        actionType: action,
        targetType,
        targetId,
        playerId: options?.playerId ?? (targetType === 'player' ? targetId : null),
        reason,
        payloadBefore: options?.payloadBefore ? this.serializable(options.payloadBefore) : undefined,
        payloadAfter: options?.payloadAfter ? this.serializable(options.payloadAfter) : undefined,
        metadata: options?.metadata ?? undefined,
      },
    });
  }

  private getPermissions(role: AdminRole) {
    return {
      canView: ROLE_LEVEL[role] >= ROLE_LEVEL.viewer,
      canSupport: ROLE_LEVEL[role] >= ROLE_LEVEL.support,
      canModerate: ROLE_LEVEL[role] >= ROLE_LEVEL.moderator,
      canReviewAudits: ROLE_LEVEL[role] >= ROLE_LEVEL.operator,
      canBan: ADMIN_CONFIG.permissions.banRequiresSuperAdmin
        ? role === 'super_admin'
        : ROLE_LEVEL[role] >= ROLE_LEVEL.operator,
      canSuperAdmin: role === 'super_admin',
    };
  }

  private normalizeRole(role: string): AdminRole {
    return (Object.keys(ROLE_LEVEL).includes(role) ? role : 'viewer') as AdminRole;
  }

  private highestRole(roles: string[]): AdminRole {
    return roles.map((role) => this.normalizeRole(role)).sort((a, b) => ROLE_LEVEL[b] - ROLE_LEVEL[a])[0] ?? 'viewer';
  }

  private limit(input?: number): number {
    if (!Number.isFinite(input) || !input) return DEFAULT_LIMIT;
    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(input)));
  }

  private daysFromNow(days: number): Date {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private playerSummary(player: any) {
    return {
      id: player.id,
      name: player.name,
      score: player.score,
      createdAt: player.createdAt.toISOString(),
      user: player.user
        ? {
            id: player.user.id,
            email: player.user.email,
            displayName: player.user.displayName,
            accountStatus: player.user.accountStatus,
            emailVerified: Boolean(player.user.emailVerifiedAt),
          }
        : null,
      moderation: player.moderation ? this.serializable(player.moderation) : null,
      cities: player.cities?.map((city: any) => this.cityLite(city)) ?? undefined,
    };
  }

  private citySummary(city: any) {
    return {
      id: city.id,
      name: city.name,
      level: city.level,
      population: city.population,
      populationCapacity: city.populationCapacity,
      happiness: city.happiness,
      createdAt: city.createdAt.toISOString(),
      player: city.player ? this.playerLite(city.player) : null,
      island: city.island
        ? {
            id: city.island.id,
            name: city.island.name,
            x: city.island.x,
            y: city.island.y,
            luxuryResource: city.island.luxuryResource,
          }
        : null,
      resources: city.resources ?? null,
    };
  }

  private movementRow(row: any) {
    return {
      ...this.serializable(row),
      player: this.playerLite(row.player),
      originCity: this.cityLite(row.originCity),
      destinationCity: row.destinationCity ? this.cityLite(row.destinationCity) : null,
    };
  }

  private abuseSignalRow(row: any) {
    return {
      ...this.serializable(row),
      flagType: row.signalType,
      riskLevel: row.severity,
      player: row.player ? this.playerLite(row.player) : null,
      relatedPlayer: row.relatedPlayer ? this.playerLite(row.relatedPlayer) : null,
    };
  }

  private scoreToRiskLevel(score: number): string {
    if (score >= 95) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 35) return 'medium';
    if (score > 0) return 'low';
    return 'none';
  }

  private messageSummary(message: any) {
    return {
      id: message.id,
      subject: message.subject,
      body: message.body,
      messageType: message.messageType,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender ? this.playerLite(message.sender) : null,
      recipient: this.playerLite(message.recipient),
    };
  }

  private playerLite(player: any) {
    return { id: player.id, name: player.name };
  }

  private cityLite(city: any) {
    return { id: city.id, name: city.name };
  }

  private adminSummary(user: any) {
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  private serializable(row: any): any {
    if (!row || typeof row !== 'object') return row;
    if (row instanceof Date) return row.toISOString();
    if (Array.isArray(row)) return row.map((item) => this.serializable(item));
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        value instanceof Date ? value.toISOString() : this.serializable(value),
      ]),
    );
  }

  private db(): Db {
    return this.prisma as unknown as Db;
  }
}
