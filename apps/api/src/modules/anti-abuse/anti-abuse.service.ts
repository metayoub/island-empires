import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { ANTI_ABUSE_CONFIG } from '@island-empires/config';
import { calculateActionFrequencyRisk, calculateRiskScore } from '@island-empires/game-engine';
import { PrismaService } from '../../database/prisma.service';

export type AbuseSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AbuseSignalType =
  | 'suspicious_trade'
  | 'resource_pushing'
  | 'multi_account'
  | 'repeated_attack'
  | 'bot_like_activity'
  | 'rate_limit'
  | 'action_frequency'
  | 'ip_device_risk'
  | 'marketplace_abuse'
  | 'sensitive_action';

type Db = Record<string, any>;

const FREQUENCY_WINDOWS: Record<string, { windowMs: number; warnAt: number; blockAt: number }> = {
  login: {
    windowMs: ANTI_ABUSE_CONFIG.rateLimits.loginAttempt.windowMinutes * 60 * 1000,
    warnAt: Math.ceil(ANTI_ABUSE_CONFIG.rateLimits.loginAttempt.maxActions * 0.8),
    blockAt: ANTI_ABUSE_CONFIG.rateLimits.loginAttempt.maxActions,
  },
  create_marketplace_offer: {
    windowMs: ANTI_ABUSE_CONFIG.rateLimits.marketplaceOfferCreate.windowMinutes * 60 * 1000,
    warnAt: Math.ceil(ANTI_ABUSE_CONFIG.rateLimits.marketplaceOfferCreate.maxActions * 0.8),
    blockAt: ANTI_ABUSE_CONFIG.rateLimits.marketplaceOfferCreate.maxActions,
  },
  accept_marketplace_offer: {
    windowMs: ANTI_ABUSE_CONFIG.rateLimits.marketplaceOfferAccept.windowMinutes * 60 * 1000,
    warnAt: Math.ceil(ANTI_ABUSE_CONFIG.rateLimits.marketplaceOfferAccept.maxActions * 0.8),
    blockAt: ANTI_ABUSE_CONFIG.rateLimits.marketplaceOfferAccept.maxActions,
  },
  pvp_attack_started: {
    windowMs: ANTI_ABUSE_CONFIG.rateLimits.pvpAttackStart.windowMinutes * 60 * 1000,
    warnAt: Math.ceil(ANTI_ABUSE_CONFIG.rateLimits.pvpAttackStart.maxActions * 0.8),
    blockAt: ANTI_ABUSE_CONFIG.rateLimits.pvpAttackStart.maxActions,
  },
  message_sent: {
    windowMs: ANTI_ABUSE_CONFIG.rateLimits.messageSend.windowMinutes * 60 * 1000,
    warnAt: Math.ceil(ANTI_ABUSE_CONFIG.rateLimits.messageSend.maxActions * 0.8),
    blockAt: ANTI_ABUSE_CONFIG.rateLimits.messageSend.maxActions,
  },
  naval_attack_started: {
    windowMs: ANTI_ABUSE_CONFIG.rateLimits.navalAttackStart.windowMinutes * 60 * 1000,
    warnAt: Math.ceil(ANTI_ABUSE_CONFIG.rateLimits.navalAttackStart.maxActions * 0.8),
    blockAt: ANTI_ABUSE_CONFIG.rateLimits.navalAttackStart.maxActions,
  },
  alliance_donation_created: {
    windowMs: ANTI_ABUSE_CONFIG.rateLimits.allianceDonation.windowMinutes * 60 * 1000,
    warnAt: Math.ceil(ANTI_ABUSE_CONFIG.rateLimits.allianceDonation.maxActions * 0.8),
    blockAt: ANTI_ABUSE_CONFIG.rateLimits.allianceDonation.maxActions,
  },
  resource_transport_started: { windowMs: 60 * 60 * 1000, warnAt: 30, blockAt: 60 },
};

@Injectable()
export class AntiAbuseService {
  constructor(private readonly prisma: PrismaService) {}

  async recordSignal(input: {
    worldId: string;
    playerId?: string | null;
    relatedPlayerId?: string | null;
    signalType: AbuseSignalType;
    severity?: AbuseSeverity;
    reason: string;
    source?: string;
    targetType?: string;
    targetId?: string;
    ipHash?: string | null;
    userAgentHash?: string | null;
    sessionHash?: string | null;
    payload?: Prisma.InputJsonValue;
  }) {
    const severity = input.severity ?? 'low';
    const score = calculateRiskScore({ riskLevel: severity, signalCount: 1 });
    return this.safeCreate('abuseSignal', {
      worldId: input.worldId,
      playerId: input.playerId ?? null,
      relatedPlayerId: input.relatedPlayerId ?? null,
      signalType: input.signalType,
      severity,
      score,
      title: this.signalTitle(input.signalType, severity),
      description: input.reason,
      reason: input.reason,
      source: input.source ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ipHash: input.ipHash ?? null,
      userAgentHash: input.userAgentHash ?? null,
      sessionHash: input.sessionHash ?? null,
      payload: input.payload ?? undefined,
    });
  }

  async monitorAction(input: {
    worldId: string;
    playerId: string;
    actionType: string;
    targetType?: string;
    targetId?: string;
    relatedPlayerId?: string | null;
    payload?: Prisma.InputJsonValue;
  }): Promise<{ allowed: boolean; count: number }> {
    const config = FREQUENCY_WINDOWS[input.actionType] ?? { windowMs: 10 * 60 * 1000, warnAt: 25, blockAt: 60 };
    const since = new Date(Date.now() - config.windowMs);
    const now = new Date();
    const windowKey = this.windowKey(input.actionType, now, config.windowMs);
    const counter = await this.safeUpsert('actionFrequencyCounter', {
      where: { playerId_actionType_windowKey: { playerId: input.playerId, actionType: input.actionType, windowKey } },
      update: { count: { increment: 1 }, lastSeenAt: now },
      create: {
        worldId: input.worldId,
        playerId: input.playerId,
        actionType: input.actionType,
        windowKey,
        count: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });
    const historicalCount = await this.db().gameAnalyticsEvent.count({
      where: { worldId: input.worldId, playerId: input.playerId, eventType: input.actionType, createdAt: { gte: since } },
    });
    const count = Math.max(counter?.count ?? 1, historicalCount + 1);
    const riskLevel = calculateActionFrequencyRisk({ count, warnAt: config.warnAt, blockAt: config.blockAt });

    if (riskLevel === 'medium' || riskLevel === 'high' || riskLevel === 'critical') {
      await this.recordSignal({
        worldId: input.worldId,
        playerId: input.playerId,
        relatedPlayerId: input.relatedPlayerId,
        signalType: riskLevel === 'high' || riskLevel === 'critical' ? 'rate_limit' : 'bot_like_activity',
        severity: riskLevel === 'critical' ? 'critical' : riskLevel === 'high' ? 'high' : 'medium',
        reason: riskLevel === 'high' || riskLevel === 'critical' ? 'rate_limit_exceeded' : 'unusual_action_frequency',
        source: 'action_frequency_monitor',
        targetType: input.targetType,
        targetId: input.targetId,
        payload: {
          actionType: input.actionType,
          count,
          windowMs: config.windowMs,
          warnAt: config.warnAt,
          blockAt: config.blockAt,
          ...(input.payload && typeof input.payload === 'object' ? { details: input.payload } : {}),
        },
      });
    }

    return { allowed: count < config.blockAt, count };
  }

  async trackAction(input: {
    worldId: string;
    playerId: string;
    eventType: string;
    payload?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.db().gameAnalyticsEvent.create({
      data: {
        worldId: input.worldId,
        playerId: input.playerId,
        eventType: input.eventType,
        payload: input.payload ?? undefined,
      },
    });
  }

  async logSensitiveAction(input: {
    worldId?: string | null;
    userId?: string | null;
    playerId?: string | null;
    relatedPlayerId?: string | null;
    cityId?: string | null;
    allianceId?: string | null;
    actionType: string;
    targetType?: string | null;
    targetId?: string | null;
    ipHash?: string | null;
    userAgentHash?: string | null;
    sessionHash?: string | null;
    payload?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.safeCreate('sensitiveActionAuditLog', {
      worldId: input.worldId ?? null,
      userId: input.userId ?? null,
      playerId: input.playerId ?? null,
      relatedPlayerId: input.relatedPlayerId ?? null,
      cityId: input.cityId ?? null,
      allianceId: input.allianceId ?? null,
      actionType: input.actionType,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ipHash: input.ipHash ?? null,
      userAgentHash: input.userAgentHash ?? null,
      sessionHash: input.sessionHash ?? null,
      payload: input.payload ?? undefined,
    });
  }

  async logIpDeviceRisk(input: {
    userId: string;
    worldId?: string;
    playerId?: string;
    request: Request;
    source: 'register' | 'login';
  }): Promise<void> {
    if (!input.worldId || !input.playerId) return;
    const ipHash = this.hashValue(this.extractIp(input.request));
    const userAgentHash = this.hashValue(input.request.headers['user-agent']);
    if (!ipHash && !userAgentHash) return;

    const [ipSessionCount, deviceSessionCount] = await Promise.all([
      ipHash ? this.db().session.count({ where: { ipHash, userId: { not: input.userId }, revokedAt: null } }) : 0,
      userAgentHash ? this.db().session.count({ where: { userAgent: input.request.headers['user-agent'], userId: { not: input.userId }, revokedAt: null } }) : 0,
    ]);
    const riskLevel = ipSessionCount >= 4 || deviceSessionCount >= 5 ? 'high' : ipSessionCount >= 2 || deviceSessionCount >= 3 ? 'medium' : 'low';
    await this.safeCreate('accountRiskSignal', {
      userId: input.userId,
      playerId: input.playerId,
      signalType: riskLevel === 'low' ? 'ip_device_observed' : 'shared_ip_or_device',
      riskLevel,
      ipHash,
      userAgentHash,
      payload: { ipSessionCount, deviceSessionCount, source: input.source },
    });
    await this.logSensitiveAction({
      worldId: input.worldId,
      userId: input.userId,
      playerId: input.playerId,
      actionType: input.source === 'register' ? 'account_registration' : 'account_login',
      targetType: 'user',
      targetId: input.userId,
      ipHash,
      userAgentHash,
    });

    if (ipSessionCount >= 2 || deviceSessionCount >= 3) {
      await this.recordSignal({
        worldId: input.worldId,
        playerId: input.playerId,
        signalType: 'multi_account',
        severity: ipSessionCount >= 4 || deviceSessionCount >= 5 ? 'high' : 'medium',
        reason: 'shared_ip_or_device',
        source: input.source,
        targetType: 'user',
        targetId: input.userId,
        ipHash,
        userAgentHash,
        payload: { ipSessionCount, deviceSessionCount },
      });
    } else {
      await this.recordSignal({
        worldId: input.worldId,
        playerId: input.playerId,
        signalType: 'ip_device_risk',
        severity: 'low',
        reason: 'ip_device_observed',
        source: input.source,
        targetType: 'user',
        targetId: input.userId,
        ipHash,
        userAgentHash,
      });
    }
  }

  async flagSensitiveAction(input: {
    worldId: string;
    playerId?: string | null;
    reason: string;
    targetType: string;
    targetId: string;
    payload?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.logSensitiveAction({
      worldId: input.worldId,
      playerId: input.playerId,
      actionType: input.reason,
      targetType: input.targetType,
      targetId: input.targetId,
      payload: input.payload,
    });
  }

  hashForAudit(value: unknown): string | null {
    return this.hashValue(value);
  }

  private hashValue(value: unknown): string | null {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '').trim();
    return text ? createHash('sha256').update(text).digest('hex') : null;
  }

  private extractIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      return forwardedFor.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || '';
  }

  private windowKey(actionType: string, date: Date, windowMs: number): string {
    const bucket = Math.floor(date.getTime() / windowMs);
    return `${actionType}:${bucket}`;
  }

  private signalTitle(signalType: AbuseSignalType, severity: AbuseSeverity): string {
    return `${severity} ${signalType}`.replace(/_/g, ' ');
  }

  private async safeCreate(model: string, data: Record<string, unknown>) {
    try {
      const delegate = this.db()[model];
      if (!delegate?.create) return null;
      return await delegate.create({ data });
    } catch {
      return null;
    }
  }

  private async safeUpsert(model: string, args: Record<string, unknown>) {
    try {
      const delegate = this.db()[model];
      if (!delegate?.upsert) return null;
      return await delegate.upsert(args);
    } catch {
      return null;
    }
  }

  private db(): Db {
    return this.prisma as unknown as Db;
  }
}
