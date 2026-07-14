import { HttpStatus, Injectable } from '@nestjs/common';
import { BETA_CONFIG } from '@island-empires/config';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import type { AuthContext } from '../auth/auth-context.service';
import type {
  AdminBetaFeedbackQueryDto,
  CreateBetaAllowlistDto,
  CreateBetaInviteDto,
  SubmitBetaFeedbackDto,
  UpdateBetaAllowlistDto,
  UpdateBetaFeedbackDto,
  UpdateBetaInviteDto,
} from './dto/beta.dto';

type Db = Record<string, any>;
type AdminRole = 'viewer' | 'support' | 'moderator' | 'operator' | 'super_admin';

const ROLE_LEVEL: Record<AdminRole, number> = {
  viewer: 1,
  support: 2,
  moderator: 3,
  operator: 4,
  super_admin: 5,
};

@Injectable()
export class BetaService {
  constructor(private readonly prisma: PrismaService) {}

  async validateInviteCode(codeInput: string): Promise<{ valid: boolean; cohort: string | null; reason?: string }> {
    if (!BETA_CONFIG.betaModeEnabled || !BETA_CONFIG.inviteCodeRequired) {
      return { valid: true, cohort: null };
    }

    const code = this.normalizeCode(codeInput);
    const invite = await this.db().betaInviteCode.findUnique({ where: { code } });
    if (!invite) return { valid: false, cohort: null, reason: 'not_found' };
    const status = this.getInviteStatus(invite);
    if (status !== 'active') return { valid: false, cohort: invite.cohort ?? null, reason: status };

    const betaWorld = await this.findBetaWorld();
    if (betaWorld) {
      const players = await this.prisma.player.count({ where: { worldId: betaWorld.id } });
      if (players >= BETA_CONFIG.maxPlayersInBetaWorld) {
        return { valid: false, cohort: invite.cohort ?? null, reason: 'beta_full' };
      }
    }

    return { valid: true, cohort: invite.cohort ?? null };
  }

  async assertCanRegister(input: {
    email: string;
    inviteCode?: string;
  }): Promise<{ accessMode: 'invite_code' | 'email_allowlist' | 'open'; code: string | null; cohort: string | null; allowlistId?: string }> {
    if (!BETA_CONFIG.betaModeEnabled) {
      return { accessMode: 'open', code: input.inviteCode ? this.normalizeCode(input.inviteCode) : null, cohort: null };
    }

    if (BETA_CONFIG.accessMode === 'email_allowlist') {
      const email = this.normalizeEmail(input.email);
      const row = await this.db().betaEmailAllowlist.findUnique({ where: { email } });
      if (!row || this.getAccessStatus(row) !== 'active') {
        throw new ApiErrorException(
          'This email is not currently allowlisted for the beta.',
          'BETA_EMAIL_NOT_ALLOWLISTED',
          HttpStatus.FORBIDDEN,
        );
      }
      await this.assertBetaCapacity();
      return { accessMode: 'email_allowlist', code: null, cohort: row.cohort ?? null, allowlistId: row.id };
    }

    if (!BETA_CONFIG.inviteCodeRequired) {
      return { accessMode: 'open', code: input.inviteCode ? this.normalizeCode(input.inviteCode) : null, cohort: null };
    }
    if (!input.inviteCode?.trim()) {
      throw new ApiErrorException(
        'A beta invite code is required to create an account.',
        'BETA_INVITE_REQUIRED',
        HttpStatus.FORBIDDEN,
      );
    }
    const validation = await this.validateInviteCode(input.inviteCode);
    if (!validation.valid) {
      throw new ApiErrorException(
        validation.reason === 'beta_full'
          ? 'The beta world is currently full. You can join the waitlist.'
          : 'This beta invite code is not valid or has expired.',
        validation.reason === 'beta_full' ? 'BETA_WORLD_FULL' : 'BETA_INVITE_INVALID',
        HttpStatus.FORBIDDEN,
      );
    }
    return { accessMode: 'invite_code', code: this.normalizeCode(input.inviteCode), cohort: validation.cohort };
  }

  async recordAccessUsage(input: {
    accessMode: 'invite_code' | 'email_allowlist' | 'open';
    code: string | null;
    allowlistId?: string;
    userId: string;
    playerId: string;
  }): Promise<void> {
    if (input.accessMode === 'email_allowlist' && input.allowlistId) {
      const row = await this.db().betaEmailAllowlist.findUnique({ where: { id: input.allowlistId } });
      if (!row || this.getAccessStatus(row) !== 'active') {
        throw new ApiErrorException(
          'This email is not currently allowlisted for the beta.',
          'BETA_EMAIL_NOT_ALLOWLISTED',
          HttpStatus.FORBIDDEN,
        );
      }
      await this.db().betaAllowlistUsage.create({
        data: {
          allowlistId: row.id,
          userId: input.userId,
          playerId: input.playerId,
          cohort: row.cohort,
        },
      });
      await this.db().gameAnalyticsEvent.create({
        data: {
          worldId: (await this.ensureBetaWorld()).id,
          playerId: input.playerId,
          eventType: 'beta_email_allowlist_used',
          payload: { cohort: row.cohort },
        },
      });
      return;
    }

    if (!BETA_CONFIG.betaModeEnabled || !BETA_CONFIG.inviteCodeRequired || !input.code) return;

    const db = this.db();
    await this.prisma.$transaction(async (tx) => {
      const invite = await (tx as any).betaInviteCode.findUnique({
        where: { code: input.code },
      });
      if (!invite || this.getInviteStatus(invite) !== 'active') {
        throw new ApiErrorException(
          'This beta invite code is not valid or has expired.',
          'BETA_INVITE_INVALID',
          HttpStatus.FORBIDDEN,
        );
      }
      const result = await (tx as any).betaInviteCode.updateMany({
        where: {
          id: invite.id,
          status: 'active',
          usedCount: { lt: invite.maxUses },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { usedCount: { increment: 1 } },
      });
      if (result.count !== 1) {
        throw new ApiErrorException(
          'This beta invite code is not valid or has expired.',
          'BETA_INVITE_INVALID',
          HttpStatus.FORBIDDEN,
        );
      }
      await (tx as any).betaInviteUsage.create({
        data: {
          inviteCodeId: invite.id,
          userId: input.userId,
          playerId: input.playerId,
          cohort: invite.cohort,
        },
      });
    });

    await db.gameAnalyticsEvent.create({
      data: {
        worldId: (await this.ensureBetaWorld()).id,
        playerId: input.playerId,
        eventType: 'beta_invite_code_used',
        payload: { code: input.code },
      },
    });
  }

  async submitFeedback(auth: AuthContext, dto: SubmitBetaFeedbackDto): Promise<{ success: true }> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.db().betaFeedback.count({
      where: { userId: auth.userId, createdAt: { gte: since } },
    });
    if (recentCount >= BETA_CONFIG.feedback.submissionsPerHour) {
      throw new ApiErrorException(
        'Please wait before sending more beta feedback.',
        'BETA_FEEDBACK_RATE_LIMITED',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.db().betaFeedback.create({
      data: {
        worldId: auth.worldId,
        userId: auth.userId,
        playerId: auth.playerId,
        category: dto.category,
        title: dto.title.trim(),
        message: dto.message.trim(),
        page: dto.page?.trim() || undefined,
      },
    });
    await this.db().gameAnalyticsEvent.create({
      data: {
        worldId: auth.worldId,
        playerId: auth.playerId,
        eventType: 'beta_feedback_submitted',
        payload: { category: dto.category, page: dto.page },
      },
    });
    return { success: true };
  }

  async getMyFeedback(auth: AuthContext) {
    const rows = await this.db().betaFeedback.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { feedback: rows.map((row: any) => this.serializable(row)) };
  }

  async adminOverview(auth: AuthContext) {
    await this.assertAdmin(auth, 'viewer');
    const world = await this.ensureBetaWorld();
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const d1Start = new Date(now.getTime() - BETA_CONFIG.retention.d1WindowHoursEnd * 60 * 60 * 1000);
    const d1End = new Date(now.getTime() - BETA_CONFIG.retention.d1WindowHoursStart * 60 * 60 * 1000);

    const [
      totalRegistrations,
      todayRegistrations,
      tutorialStarted,
      tutorialCompleted,
      d1Eligible,
      d1Returned,
      openFeedback,
      bugFeedback,
      balanceFeedback,
    ] = await Promise.all([
      this.prisma.player.count({ where: { worldId: world.id } }),
      this.prisma.player.count({ where: { worldId: world.id, createdAt: { gte: today } } }),
      this.prisma.playerOnboardingState.count({ where: { worldId: world.id } }),
      this.prisma.playerOnboardingState.count({ where: { worldId: world.id, hasCompletedTutorial: true } }),
      this.prisma.player.count({ where: { worldId: world.id, createdAt: { gte: d1Start, lte: d1End } } }),
      this.db().gameAnalyticsEvent.groupBy({
        by: ['playerId'],
        where: {
          worldId: world.id,
          eventType: 'login',
          createdAt: { gte: d1Start, lte: now },
          player: { createdAt: { gte: d1Start, lte: d1End } },
        },
      }),
      this.db().betaFeedback.count({ where: { worldId: world.id, status: { in: ['open', 'reviewing'] } } }),
      this.db().betaFeedback.count({ where: { worldId: world.id, category: 'bug', status: { in: ['open', 'reviewing'] } } }),
      this.db().betaFeedback.count({ where: { worldId: world.id, category: 'balance', status: { in: ['open', 'reviewing'] } } }),
    ]);

    return {
      world: { id: world.id, name: world.name, status: world.status },
      registrations: { total: totalRegistrations, today: todayRegistrations },
      tutorial: {
        started: tutorialStarted,
        completed: tutorialCompleted,
        completionRate: tutorialStarted === 0 ? 0 : tutorialCompleted / tutorialStarted,
      },
      retention: {
        d1: d1Eligible === 0 ? 0 : d1Returned.length / d1Eligible,
      },
      feedback: { open: openFeedback, bugs: bugFeedback, balance: balanceFeedback },
      generatedAt: now.toISOString(),
    };
  }

  async adminMetrics(auth: AuthContext) {
    await this.assertAdmin(auth, 'viewer');
    const world = await this.ensureBetaWorld();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const db = this.db();
    const [
      resources,
      buildingStarted,
      buildingCompleted,
      researchStarted,
      researchCompleted,
      pveAttacks,
      pvpAttacks,
      marketplaceOffers,
      marketplaceAccepted,
      alliancesCreated,
      reports,
      abuseSignals,
      feedbackByCategory,
      invites,
    ] = await Promise.all([
      this.prisma.cityResource.aggregate({
        _avg: { wood: true, gold: true, marble: true, wine: true, crystal: true, sulfur: true },
        where: { city: { worldId: world.id } },
      }),
      db.gameAnalyticsEvent.count({ where: { worldId: world.id, eventType: 'building_upgrade_started', createdAt: { gte: since } } }),
      db.gameAnalyticsEvent.count({ where: { worldId: world.id, eventType: 'building_upgrade_completed', createdAt: { gte: since } } }),
      db.gameAnalyticsEvent.count({ where: { worldId: world.id, eventType: 'research_started', createdAt: { gte: since } } }),
      db.gameAnalyticsEvent.count({ where: { worldId: world.id, eventType: 'research_completed', createdAt: { gte: since } } }),
      db.gameAnalyticsEvent.count({ where: { worldId: world.id, eventType: 'pve_attack_started', createdAt: { gte: since } } }),
      db.gameAnalyticsEvent.count({ where: { worldId: world.id, eventType: 'pvp_attack_started', createdAt: { gte: since } } }),
      db.marketplaceOffer.count({ where: { worldId: world.id, createdAt: { gte: since } } }),
      db.tradeHistory.count({ where: { worldId: world.id, createdAt: { gte: since } } }),
      db.alliance.count({ where: { worldId: world.id, createdAt: { gte: since } } }),
      db.messageReport.count({ where: { worldId: world.id, status: 'pending' } }),
      db.abuseSignal.count({ where: { worldId: world.id, status: { in: ['open', 'reviewing'] } } }),
      db.betaFeedback.groupBy({ by: ['category'], where: { worldId: world.id }, _count: { category: true } }),
      db.betaInviteCode.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    return {
      world: { id: world.id, name: world.name, status: world.status },
      economy: { averageBalances: resources._avg, buildingStarted, buildingCompleted },
      research: { researchStarted, researchCompleted },
      combat: { pveAttacks, pvpAttacks },
      marketplace: { offersCreated: marketplaceOffers, offersAccepted: marketplaceAccepted },
      alliances: { created: alliancesCreated },
      health: { openReports: reports, openAbuseFlags: abuseSignals },
      feedback: Object.fromEntries(feedbackByCategory.map((row: any) => [row.category, row._count.category])),
      invites: invites.map((invite: any) => ({ ...this.serializable(invite), status: this.getInviteStatus(invite) })),
      generatedAt: new Date().toISOString(),
    };
  }

  async listInvites(auth: AuthContext) {
    await this.assertAdmin(auth, 'operator');
    const invites = await this.db().betaInviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { invites: invites.map((invite: any) => ({ ...this.serializable(invite), status: this.getInviteStatus(invite) })) };
  }

  async listAllowlist(auth: AuthContext) {
    await this.assertAdmin(auth, 'operator');
    const entries = await this.db().betaEmailAllowlist.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { allowlist: entries.map((entry: any) => ({ ...this.serializable(entry), status: this.getAccessStatus(entry) })) };
  }

  async createAllowlistEntry(auth: AuthContext, dto: CreateBetaAllowlistDto) {
    await this.assertAdmin(auth, 'operator');
    const entry = await this.db().betaEmailAllowlist.create({
      data: {
        email: this.normalizeEmail(dto.email),
        cohort: dto.cohort?.trim() || undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdByUserId: auth.userId,
      },
    });
    return { allowlistEntry: this.serializable(entry) };
  }

  async updateAllowlistEntry(auth: AuthContext, allowlistId: string, dto: UpdateBetaAllowlistDto) {
    await this.assertAdmin(auth, 'operator');
    const entry = await this.db().betaEmailAllowlist.update({
      where: { id: allowlistId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.cohort !== undefined ? { cohort: dto.cohort?.trim() || null } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: new Date(dto.expiresAt) } : {}),
      },
    });
    return { allowlistEntry: this.serializable(entry) };
  }

  async createInvite(auth: AuthContext, dto: CreateBetaInviteDto) {
    await this.assertAdmin(auth, 'operator');
    const invite = await this.db().betaInviteCode.create({
      data: {
        code: this.normalizeCode(dto.code),
        cohort: dto.cohort?.trim() || undefined,
        maxUses: dto.maxUses ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdByUserId: auth.userId,
      },
    });
    return { invite: this.serializable(invite) };
  }

  async updateInvite(auth: AuthContext, inviteId: string, dto: UpdateBetaInviteDto) {
    await this.assertAdmin(auth, 'operator');
    const invite = await this.db().betaInviteCode.update({
      where: { id: inviteId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.cohort !== undefined ? { cohort: dto.cohort?.trim() || null } : {}),
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: new Date(dto.expiresAt) } : {}),
      },
    });
    return { invite: this.serializable(invite) };
  }

  async adminFeedbackQueue(auth: AuthContext, query: AdminBetaFeedbackQueryDto) {
    await this.assertAdmin(auth, 'support');
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 50));
    const page = Math.max(1, query.page ?? 1);
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [items, total] = await Promise.all([
      this.db().betaFeedback.findMany({
        where,
        include: { user: true, player: true, world: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db().betaFeedback.count({ where }),
    ]);
    return {
      feedback: items.map((item: any) => this.serializable(item)),
      page,
      pageSize,
      total,
    };
  }

  async updateFeedback(auth: AuthContext, feedbackId: string, dto: UpdateBetaFeedbackDto) {
    await this.assertAdmin(auth, 'support');
    const feedback = await this.db().betaFeedback.update({
      where: { id: feedbackId },
      data: {
        status: dto.status,
        adminNote: dto.adminNote,
        reviewedAt: ['fixed', 'dismissed', 'archived'].includes(dto.status) ? new Date() : undefined,
      },
    });
    return { feedback: this.serializable(feedback) };
  }

  async ensureBetaWorld() {
    return this.db().world.upsert({
      where: { name: BETA_CONFIG.betaWorld.name },
      update: { status: BETA_CONFIG.betaWorld.status },
      create: {
        name: BETA_CONFIG.betaWorld.name,
        status: BETA_CONFIG.betaWorld.status,
        speedBuilding: 1,
        speedResearch: 1,
        speedResource: 1,
        speedTravel: 1,
      },
    });
  }

  private async findBetaWorld() {
    return this.prisma.world.findUnique({ where: { name: BETA_CONFIG.betaWorld.name } });
  }

  private async assertBetaCapacity(): Promise<void> {
    const betaWorld = await this.findBetaWorld();
    if (!betaWorld) return;
    const players = await this.prisma.player.count({ where: { worldId: betaWorld.id } });
    if (players >= BETA_CONFIG.maxPlayersInBetaWorld) {
      throw new ApiErrorException(
        'The beta world is currently full. You can join the waitlist.',
        'BETA_WORLD_FULL',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private getInviteStatus(invite: { status: string; usedCount: number; maxUses: number; expiresAt?: Date | null }) {
    if (invite.status !== 'active') return invite.status;
    if (invite.expiresAt && invite.expiresAt <= new Date()) return 'expired';
    if (invite.usedCount >= invite.maxUses) return 'exhausted';
    return 'active';
  }

  private getAccessStatus(row: { status: string; expiresAt?: Date | null }) {
    if (row.status !== 'active') return row.status;
    if (row.expiresAt && row.expiresAt <= new Date()) return 'expired';
    return 'active';
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async assertAdmin(auth: AuthContext, minimumRole: AdminRole): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: auth.userId } });
    const role = (user?.adminRole ?? 'viewer') as AdminRole;
    if (!user?.isAdmin || ROLE_LEVEL[role] < ROLE_LEVEL[minimumRole]) {
      throw new ApiErrorException('Admin access required.', 'ADMIN_REQUIRED', HttpStatus.FORBIDDEN);
    }
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
