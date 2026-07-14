import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  BrowserPushSubscriptionListResponse,
  BrowserPushSubscriptionResponse,
  ClearNotificationsResponse,
  NotificationChannel,
  NotificationCenterResponse,
  NotificationDeliverySummary,
  NotificationSettings,
  NotificationType,
  ReportSummary,
  UnreadCounterResponse,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import type { AuthContext } from '../auth/auth-context.service';
import { MessagesService } from '../messages/messages.service';
import { DevelopmentStateService } from '../players/development-state.service';
import type { BrowserPushSubscriptionDto } from './dto/browser-push-subscription.dto';
import type { UpdateNotificationSettingsDto } from './dto/notification-settings.dto';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const CHANNELS: NotificationChannel[] = ['in_game', 'email', 'browser_push'];

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly messagesService: MessagesService,
  ) {}

  async getReports(input: { category?: string; limit?: number } = {}): Promise<ReportSummary[]> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const reports = await this.prisma.report.findMany({
      where: {
        playerId: bootstrap.player.id,
        ...(input.category ? { type: { in: this.getReportTypesForCategory(input.category) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: this.normalizeLimit(input.limit),
    });

    return reports.map((report) => this.toReportSummary(report));
  }

  async markRead(reportId: string): Promise<ReportSummary> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (
      !report ||
      report.playerId !== bootstrap.player.id ||
      report.worldId !== bootstrap.world.id
    ) {
      throw new ApiErrorException('Report not found.', 'REPORT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const updated = await this.prisma.report.update({
      where: { id: report.id },
      data: { isRead: true },
    });
    await (this.prisma as any).notificationDelivery.updateMany({
      where: {
        reportId: report.id,
        playerId: bootstrap.player.id,
        channel: 'in_game',
        readAt: null,
      },
      data: { readAt: new Date(), status: 'delivered' },
    });

    return this.toReportSummary(updated);
  }

  async getNotificationCenter(limitInput?: number): Promise<NotificationCenterResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const limit = this.normalizeLimit(limitInput);
    const [messageList, reports] = await Promise.all([
      this.messagesService.getInbox(limit),
      this.prisma.report.findMany({
        where: { playerId: bootstrap.player.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);
    const settings = await this.getNotificationSettingsForPlayer(
      bootstrap.player.id,
      bootstrap.world.id,
    );
    await Promise.all([
      this.ensureReportDeliveries(reports, settings),
      this.ensureMessageDeliveries(messageList.messages, bootstrap.player.id, bootstrap.world.id, settings),
    ]);
    const unread = await this.getUnreadCountersForPlayer(bootstrap.player.id, bootstrap.world.id);
    const deliveries = await (this.prisma as any).notificationDelivery.findMany({
      where: {
        playerId: bootstrap.player.id,
        worldId: bootstrap.world.id,
        channel: { in: CHANNELS },
        archivedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      unread,
      settings,
      deliveries: deliveries.map((delivery: any) => this.toDeliverySummary(delivery)),
      messages: messageList.messages,
      reports: reports.map((report) => this.toReportSummary(report)),
    };
  }

  async getUnreadCounters(): Promise<UnreadCounterResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const settings = await this.getNotificationSettingsForPlayer(
      bootstrap.player.id,
      bootstrap.world.id,
    );
    const [messageList, reports] = await Promise.all([
      this.messagesService.getInbox(DEFAULT_LIMIT),
      this.prisma.report.findMany({
        where: { playerId: bootstrap.player.id },
        orderBy: { createdAt: 'desc' },
        take: DEFAULT_LIMIT,
      }),
    ]);
    await Promise.all([
      this.ensureReportDeliveries(reports, settings),
      this.ensureMessageDeliveries(
        messageList.messages,
        bootstrap.player.id,
        bootstrap.world.id,
        settings,
      ),
    ]);

    return this.getUnreadCountersForPlayer(bootstrap.player.id, bootstrap.world.id);
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    return this.getNotificationSettingsForPlayer(bootstrap.player.id, bootstrap.world.id);
  }

  async updateNotificationSettings(
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const data = this.pickSettingsUpdate(dto);
    const updated = await (this.prisma as any).notificationPreference.upsert({
      where: { playerId: bootstrap.player.id },
      update: data,
      create: {
        playerId: bootstrap.player.id,
        worldId: bootstrap.world.id,
        ...data,
      },
    });

    return this.toNotificationSettings(updated);
  }

  async saveBrowserPushSubscription(
    auth: AuthContext,
    dto: BrowserPushSubscriptionDto,
  ): Promise<BrowserPushSubscriptionResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const subscription = await (this.prisma as any).browserPushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        playerId: bootstrap.player.id,
        worldId: bootstrap.world.id,
        userId: auth.userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
        enabled: true,
      },
      create: {
        playerId: bootstrap.player.id,
        worldId: bootstrap.world.id,
        userId: auth.userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
        enabled: true,
      },
    });
    await this.updateNotificationSettings({ browserPushEnabled: true });

    return this.toBrowserPushSubscriptionResponse(subscription);
  }

  async listBrowserPushSubscriptions(): Promise<BrowserPushSubscriptionListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const subscriptions = await (this.prisma as any).browserPushSubscription.findMany({
      where: {
        worldId: bootstrap.world.id,
        playerId: bootstrap.player.id,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      subscriptions: subscriptions.map((subscription: any) =>
        this.toBrowserPushSubscriptionResponse(subscription),
      ),
    };
  }

  async disableBrowserPushSubscription(
    subscriptionId: string,
  ): Promise<BrowserPushSubscriptionResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const subscription = await (this.prisma as any).browserPushSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (
      !subscription ||
      subscription.worldId !== bootstrap.world.id ||
      subscription.playerId !== bootstrap.player.id
    ) {
      throw new ApiErrorException(
        'Push subscription not found.',
        'PUSH_SUBSCRIPTION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await (this.prisma as any).browserPushSubscription.update({
      where: { id: subscription.id },
      data: { enabled: false },
    });

    return this.toBrowserPushSubscriptionResponse(updated);
  }

  async markNotificationRead(notificationId: string): Promise<NotificationDeliverySummary> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const delivery = await this.getOwnedNotificationDelivery(
      notificationId,
      bootstrap.player.id,
      bootstrap.world.id,
    );
    const readAt = delivery.readAt ?? new Date();
    const updated = await (this.prisma as any).notificationDelivery.update({
      where: { id: delivery.id },
      data: { readAt, status: delivery.status === 'pending' ? 'delivered' : delivery.status },
    });

    if (delivery.reportId) {
      await this.prisma.report.updateMany({
        where: {
          id: delivery.reportId,
          playerId: bootstrap.player.id,
          worldId: bootstrap.world.id,
        },
        data: { isRead: true },
      });
    }
    if (delivery.messageId) {
      await this.prisma.message.updateMany({
        where: {
          id: delivery.messageId,
          recipientPlayerId: bootstrap.player.id,
          worldId: bootstrap.world.id,
        },
        data: { isReadByRecipient: true, readAt },
      });
    }

    return this.toDeliverySummary(updated);
  }

  async archiveNotification(notificationId: string): Promise<NotificationDeliverySummary> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const delivery = await this.getOwnedNotificationDelivery(
      notificationId,
      bootstrap.player.id,
      bootstrap.world.id,
    );
    const archivedAt = delivery.archivedAt ?? new Date();
    const updated = await (this.prisma as any).notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        archivedAt,
        readAt: delivery.readAt ?? archivedAt,
        status: delivery.status === 'pending' ? 'delivered' : delivery.status,
      },
    });

    return this.toDeliverySummary(updated);
  }

  async clearNotifications(): Promise<ClearNotificationsResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const clearedAt = new Date();
    const [result] = await Promise.all([
      (this.prisma as any).notificationDelivery.updateMany({
        where: {
          playerId: bootstrap.player.id,
          worldId: bootstrap.world.id,
          channel: { in: CHANNELS },
          archivedAt: null,
        },
        data: {
          archivedAt: clearedAt,
          readAt: clearedAt,
        },
      }),
      this.prisma.report.updateMany({
        where: {
          playerId: bootstrap.player.id,
          worldId: bootstrap.world.id,
          isRead: false,
        },
        data: { isRead: true },
      }),
      this.prisma.message.updateMany({
        where: {
          recipientPlayerId: bootstrap.player.id,
          worldId: bootstrap.world.id,
          deletedByRecipient: false,
          isReadByRecipient: false,
        },
        data: {
          isReadByRecipient: true,
          readAt: clearedAt,
        },
      }),
    ]);

    return { archivedCount: result.count };
  }

  private async getUnreadCountersForPlayer(
    playerId: string,
    worldId: string,
  ): Promise<UnreadCounterResponse> {
    const [messages, reports, notifications] = await Promise.all([
      this.messagesService.getUnreadMessageCount(playerId, worldId),
      this.prisma.report.count({
        where: {
          worldId,
          playerId,
          isRead: false,
        },
      }),
      (this.prisma as any).notificationDelivery.count({
        where: {
          worldId,
          playerId,
          channel: 'in_game',
          readAt: null,
          archivedAt: null,
        },
      }),
    ]);

    return {
      total: messages + reports,
      messages,
      reports,
      notifications,
    };
  }

  private normalizeLimit(limitInput?: number): number {
    if (!Number.isFinite(limitInput) || !limitInput) {
      return DEFAULT_LIMIT;
    }

    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limitInput)));
  }

  private toReportSummary(report: {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: Date;
  }): ReportSummary {
    return {
      id: report.id,
      type: report.type,
      category: this.getReportCategory(report.type),
      title: report.title,
      message: report.message,
      isRead: report.isRead,
      createdAt: report.createdAt.toISOString(),
    };
  }

  private async getNotificationSettingsForPlayer(
    playerId: string,
    worldId: string,
  ): Promise<NotificationSettings> {
    const preference = await (this.prisma as any).notificationPreference.upsert({
      where: { playerId },
      update: {},
      create: { playerId, worldId },
    });

    return this.toNotificationSettings(preference);
  }

  private async ensureReportDeliveries(
    reports: Array<{
      id: string;
      worldId: string;
      playerId: string;
      cityId: string | null;
      type: string;
      title: string;
      message: string;
      createdAt: Date;
      isRead: boolean;
    }>,
    settings: NotificationSettings,
  ): Promise<void> {
    const operations = reports.flatMap((report) => {
      const notificationType = this.getNotificationTypeForReport(report.type);
      if (!notificationType || !this.isTypeEnabled(notificationType, settings)) return [];

      return this.getEnabledChannels(settings).map((channel) =>
        (this.prisma as any).notificationDelivery.upsert({
          where: { reportId_channel: { reportId: report.id, channel } },
          update: {},
          create: {
            worldId: report.worldId,
            playerId: report.playerId,
            cityId: report.cityId,
            reportId: report.id,
            type: notificationType,
            channel,
            status: channel === 'in_game' ? 'delivered' : 'pending',
            title: report.title,
            body: report.message,
            scheduledAt: report.createdAt,
            deliveredAt: channel === 'in_game' ? report.createdAt : null,
            readAt: channel === 'in_game' && report.isRead ? report.createdAt : null,
          },
        }),
      );
    });

    await Promise.all(operations);
  }

  private async ensureMessageDeliveries(
    messages: Array<{
      id: string;
      subject: string;
      bodyPreview: string;
      isRead: boolean;
      createdAt: string;
    }>,
    playerId: string,
    worldId: string,
    settings: NotificationSettings,
  ): Promise<void> {
    if (!this.isTypeEnabled('message', settings) && !this.isTypeEnabled('alliance_message', settings)) {
      return;
    }

    const operations = messages.flatMap((message) =>
      this.getEnabledChannels(settings).map((channel) =>
        (this.prisma as any).notificationDelivery.upsert({
          where: { messageId_channel: { messageId: message.id, channel } },
          update: {},
          create: {
            worldId,
            playerId,
            messageId: message.id,
            type: 'message',
            channel,
            status: channel === 'in_game' ? 'delivered' : 'pending',
            title: message.subject,
            body: message.bodyPreview,
            scheduledAt: new Date(message.createdAt),
            deliveredAt: channel === 'in_game' ? new Date(message.createdAt) : null,
            readAt: channel === 'in_game' && message.isRead ? new Date(message.createdAt) : null,
          },
        }),
      ),
    );

    await Promise.all(operations);
  }

  private getEnabledChannels(settings: NotificationSettings): NotificationChannel[] {
    return CHANNELS.filter((channel) => {
      if (channel === 'in_game') return true;
      if (channel === 'email') return settings.emailEnabled && !this.isQuietHour(settings);
      return settings.browserPushEnabled && !this.isQuietHour(settings);
    });
  }

  private isQuietHour(settings: NotificationSettings): boolean {
    if (settings.quietHoursStart === null || settings.quietHoursEnd === null) return false;
    const hour = new Date().getUTCHours();
    if (settings.quietHoursStart === settings.quietHoursEnd) return false;
    if (settings.quietHoursStart < settings.quietHoursEnd) {
      return hour >= settings.quietHoursStart && hour < settings.quietHoursEnd;
    }
    return hour >= settings.quietHoursStart || hour < settings.quietHoursEnd;
  }

  private isTypeEnabled(type: NotificationType, settings: NotificationSettings): boolean {
    switch (type) {
      case 'construction_completed':
        return settings.constructionCompleted;
      case 'research_completed':
        return settings.researchCompleted;
      case 'trade_arrived':
        return settings.tradeArrived;
      case 'army_returned':
        return settings.armyReturned;
      case 'incoming_attack':
        return settings.incomingAttack;
      case 'alliance_message':
        return settings.allianceMessage;
      case 'warehouse_full':
        return settings.warehouseFull;
      case 'event_announcement':
      case 'event_reward':
      case 'event_ending':
        return settings.eventEnding;
      case 'message':
      case 'system':
        return true;
      default:
        return false;
    }
  }

  private getNotificationTypeForReport(type: string): NotificationType | null {
    if (type === 'building_completed') return 'construction_completed';
    if (type === 'research_completed') return 'research_completed';
    if (
      ['transport_arrived', 'resource_transport_completed', 'marketplace_trade_completed'].includes(type)
    ) {
      return 'trade_arrived';
    }
    if (['army_returned', 'pvp_army_returned', 'naval_fleet_returned'].includes(type)) {
      return 'army_returned';
    }
    if (
      [
        'pvp_defense_victory',
        'pvp_defense_defeat',
        'naval_defense_victory',
        'naval_defense_defeat',
      ].includes(type)
    ) {
      return 'incoming_attack';
    }
    if (type.startsWith('alliance_')) return 'alliance_message';
    if (type === 'warehouse_full') return 'warehouse_full';
    if (type === 'event_announcement') return 'event_announcement';
    if (type === 'event_reward') return 'event_reward';
    if (type === 'event_ending') return 'event_ending';
    return null;
  }

  private toNotificationSettings(preference: any): NotificationSettings {
    return {
      inGameEnabled: preference.inGameEnabled,
      emailEnabled: preference.emailEnabled,
      browserPushEnabled: preference.browserPushEnabled,
      constructionCompleted: preference.constructionCompleted,
      researchCompleted: preference.researchCompleted,
      tradeArrived: preference.tradeArrived,
      armyReturned: preference.armyReturned,
      incomingAttack: preference.incomingAttack,
      allianceMessage: preference.allianceMessage,
      warehouseFull: preference.warehouseFull,
      eventEnding: preference.eventEnding,
      quietHoursStart: preference.quietHoursStart,
      quietHoursEnd: preference.quietHoursEnd,
    };
  }

  private toDeliverySummary(delivery: any): NotificationDeliverySummary {
    return {
      id: delivery.id,
      type: delivery.type,
      channel: delivery.channel,
      status: delivery.status,
      title: delivery.title,
      body: delivery.body,
      reportId: delivery.reportId,
      messageId: delivery.messageId,
      createdAt: delivery.createdAt.toISOString(),
      deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
      readAt: delivery.readAt?.toISOString() ?? null,
      archivedAt: delivery.archivedAt?.toISOString() ?? null,
    };
  }

  private toBrowserPushSubscriptionResponse(subscription: any): BrowserPushSubscriptionResponse {
    return {
      id: subscription.id,
      endpoint: subscription.endpoint,
      enabled: subscription.enabled,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }

  private async getOwnedNotificationDelivery(
    notificationId: string,
    playerId: string,
    worldId: string,
  ): Promise<any> {
    const delivery = await (this.prisma as any).notificationDelivery.findUnique({
      where: { id: notificationId },
    });
    if (!delivery || delivery.playerId !== playerId || delivery.worldId !== worldId) {
      throw new ApiErrorException(
        'Notification not found.',
        'NOTIFICATION_NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    return delivery;
  }

  private pickSettingsUpdate(dto: UpdateNotificationSettingsDto): Partial<NotificationSettings> {
    const update: Partial<NotificationSettings> = {};
    const input = dto as Partial<Record<keyof NotificationSettings, NotificationSettings[keyof NotificationSettings]>>;
    const keys = [
      'inGameEnabled',
      'emailEnabled',
      'browserPushEnabled',
      'constructionCompleted',
      'researchCompleted',
      'tradeArrived',
      'armyReturned',
      'incomingAttack',
      'allianceMessage',
      'warehouseFull',
      'eventEnding',
      'quietHoursStart',
      'quietHoursEnd',
    ] satisfies Array<keyof NotificationSettings>;

    for (const key of keys) {
      if (input[key] !== undefined) {
        update[key] = input[key] as never;
      }
    }

    return update;
  }

  private getReportTypesForCategory(category: string): string[] {
    switch (category) {
      case 'battle':
        return [
          'pve_battle_victory',
          'pve_battle_defeat',
          'army_returned',
          'pvp_attack_victory',
          'pvp_attack_defeat',
          'pvp_defense_victory',
          'pvp_defense_defeat',
          'pvp_army_returned',
          'naval_attack_victory',
          'naval_attack_defeat',
          'naval_defense_victory',
          'naval_defense_defeat',
          'naval_fleet_returned',
        ];
      case 'trade':
        return [
          'transport_arrived',
          'transport_cancelled',
          'resource_transport_completed',
          'marketplace_trade_completed',
          'blockade_started',
          'blockade_expired',
        ];
      case 'construction':
        return ['building_completed', 'units_trained', 'city_founded'];
      case 'research':
        return ['research_completed'];
      case 'system':
        return ['quest_reward_claimed'];
      case 'intelligence':
        return ['spy_report', 'spies_trained'];
      default:
        return [];
    }
  }

  private getReportCategory(type: string): ReportSummary['category'] {
    if (this.getReportTypesForCategory('battle').includes(type)) return 'battle';
    if (this.getReportTypesForCategory('trade').includes(type)) return 'trade';
    if (this.getReportTypesForCategory('construction').includes(type)) return 'construction';
    if (this.getReportTypesForCategory('research').includes(type)) return 'research';
    if (this.getReportTypesForCategory('intelligence').includes(type)) return 'intelligence' as ReportSummary['category'];
    return 'system';
  }
}
