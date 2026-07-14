import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  BlockPlayerResponse,
  MessageDetail,
  MessageListResponse,
  ModerationQueueResponse,
  ReportMessageResponse,
  SendMessageResponse,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { DevelopmentStateService } from '../players/development-state.service';
import type { BlockPlayerDto } from './dto/block-player.dto';
import type { ReportMessageDto } from './dto/report-message.dto';
import type { SendMessageDto } from './dto/send-message.dto';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
  ) {}

  async getInbox(limitInput?: number): Promise<MessageListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const messages = await this.prisma.message.findMany({
      where: {
        worldId: bootstrap.world.id,
        recipientPlayerId: bootstrap.player.id,
        deletedByRecipient: false,
      },
      include: { sender: true, recipient: true },
      orderBy: { createdAt: 'desc' },
      take: this.normalizeLimit(limitInput),
    });

    return { messages: messages.map((message) => this.toMessageSummary(message)) };
  }

  async getSent(limitInput?: number): Promise<MessageListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const messages = await this.prisma.message.findMany({
      where: {
        worldId: bootstrap.world.id,
        senderPlayerId: bootstrap.player.id,
        deletedBySender: false,
      },
      include: { sender: true, recipient: true },
      orderBy: { createdAt: 'desc' },
      take: this.normalizeLimit(limitInput),
    });

    return { messages: messages.map((message) => this.toMessageSummary(message)) };
  }

  async getSystemMessages(limitInput?: number): Promise<MessageListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const messages = await this.prisma.message.findMany({
      where: {
        worldId: bootstrap.world.id,
        recipientPlayerId: bootstrap.player.id,
        messageType: 'system',
        deletedByRecipient: false,
      },
      include: { sender: true, recipient: true },
      orderBy: { createdAt: 'desc' },
      take: this.normalizeLimit(limitInput),
    });

    return { messages: messages.map((message) => this.toMessageSummary(message)) };
  }

  async sendMessage(dto: SendMessageDto): Promise<SendMessageResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const recipient = await this.prisma.player.findUnique({
      where: { id: dto.recipientPlayerId },
    });

    if (!recipient || recipient.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Player not found.', 'PLAYER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (recipient.id === bootstrap.player.id) {
      throw new ApiErrorException(
        'You cannot send a message to yourself.',
        'CANNOT_MESSAGE_SELF',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.assertCanSendMessages(bootstrap.player.id);

    const blockingRelationship = await this.prisma.playerBlock.findFirst({
      where: {
        worldId: bootstrap.world.id,
        OR: [
          { blockerPlayerId: recipient.id, blockedPlayerId: bootstrap.player.id },
          { blockerPlayerId: bootstrap.player.id, blockedPlayerId: recipient.id },
        ],
      },
    });
    if (blockingRelationship) {
      throw new ApiErrorException(
        'Messages are not allowed between these players.',
        'PLAYER_MESSAGE_BLOCKED',
        HttpStatus.FORBIDDEN,
      );
    }

    const message = await this.prisma.message.create({
      data: {
        worldId: bootstrap.world.id,
        senderPlayerId: bootstrap.player.id,
        recipientPlayerId: recipient.id,
        messageType: 'player',
        subject: dto.subject.trim(),
        body: dto.body.trim(),
      },
      include: { sender: true, recipient: true },
    });

    return { message: this.toMessageDetail(message) };
  }

  async markRead(messageId: string): Promise<MessageDetail> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: true, recipient: true },
    });
    if (
      !message ||
      message.worldId !== bootstrap.world.id ||
      message.recipientPlayerId !== bootstrap.player.id ||
      message.deletedByRecipient
    ) {
      throw new ApiErrorException('Message not found.', 'MESSAGE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const updated = await this.prisma.message.update({
      where: { id: message.id },
      data: {
        isReadByRecipient: true,
        readAt: message.readAt ?? new Date(),
      },
      include: { sender: true, recipient: true },
    });
    await (this.prisma as any).notificationDelivery?.updateMany({
      where: {
        messageId: message.id,
        playerId: bootstrap.player.id,
        channel: 'in_game',
        readAt: null,
      },
      data: { readAt: updated.readAt ?? new Date(), status: 'delivered' },
    });

    return this.toMessageDetail(updated);
  }

  async blockPlayer(playerId: string, dto: BlockPlayerDto): Promise<BlockPlayerResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const blocked = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!blocked || blocked.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Player not found.', 'PLAYER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (blocked.id === bootstrap.player.id) {
      throw new ApiErrorException(
        'You cannot block yourself.',
        'CANNOT_BLOCK_SELF',
        HttpStatus.BAD_REQUEST,
      );
    }

    const block = await this.prisma.playerBlock.upsert({
      where: {
        blockerPlayerId_blockedPlayerId: {
          blockerPlayerId: bootstrap.player.id,
          blockedPlayerId: blocked.id,
        },
      },
      update: {
        reason: dto.reason?.trim() || null,
      },
      create: {
        worldId: bootstrap.world.id,
        blockerPlayerId: bootstrap.player.id,
        blockedPlayerId: blocked.id,
        reason: dto.reason?.trim() || null,
      },
    });

    return {
      blockedPlayerId: blocked.id,
      blockedPlayerName: blocked.name,
      reason: block.reason,
      createdAt: block.createdAt.toISOString(),
    };
  }

  async reportMessage(messageId: string, dto: ReportMessageDto): Promise<ReportMessageResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (
      !message ||
      message.worldId !== bootstrap.world.id ||
      (message.senderPlayerId !== bootstrap.player.id &&
        message.recipientPlayerId !== bootstrap.player.id)
    ) {
      throw new ApiErrorException('Message not found.', 'MESSAGE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const report = await this.prisma.messageReport.upsert({
      where: {
        messageId_reporterPlayerId: {
          messageId: message.id,
          reporterPlayerId: bootstrap.player.id,
        },
      },
      update: {
        reason: dto.reason.trim(),
        status: 'pending',
      },
      create: {
        worldId: bootstrap.world.id,
        messageId: message.id,
        reporterPlayerId: bootstrap.player.id,
        reason: dto.reason.trim(),
        status: 'pending',
      },
    });

    return { reportId: report.id, status: 'pending' };
  }

  async getModerationQueue(limitInput?: number): Promise<ModerationQueueResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const queue = await this.prisma.messageReport.findMany({
      where: {
        worldId: bootstrap.world.id,
        status: 'pending',
      },
      include: { reporter: true },
      orderBy: { createdAt: 'asc' },
      take: this.normalizeLimit(limitInput),
    });

    return {
      queue: queue.map((item) => ({
        id: item.id,
        messageId: item.messageId,
        reporterPlayerId: item.reporterPlayerId,
        reporterPlayerName: item.reporter.name,
        reason: item.reason,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  async getUnreadMessageCount(playerId: string, worldId: string): Promise<number> {
    return this.prisma.message.count({
      where: {
        worldId,
        recipientPlayerId: playerId,
        deletedByRecipient: false,
        isReadByRecipient: false,
      },
    });
  }

  private normalizeLimit(limitInput?: number): number {
    if (!Number.isFinite(limitInput) || !limitInput) {
      return DEFAULT_LIMIT;
    }

    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limitInput)));
  }

  private async assertCanSendMessages(playerId: string): Promise<void> {
    const moderation = await (this.prisma as any).playerModeration?.findUnique({
      where: { playerId },
    });
    if (moderation?.bannedAt || moderation?.suspendedUntil > new Date()) {
      throw new ApiErrorException(
        'This account cannot send messages while moderated.',
        'PLAYER_MODERATED',
        HttpStatus.FORBIDDEN,
      );
    }
    if (moderation?.mutedUntil && moderation.mutedUntil > new Date()) {
      throw new ApiErrorException(
        'This account is muted and cannot send messages.',
        'PLAYER_MUTED',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private toMessageSummary(message: {
    id: string;
    messageType: string;
    subject: string;
    body: string;
    isReadByRecipient: boolean;
    createdAt: Date;
    readAt: Date | null;
    sender: { id: string; name: string } | null;
    recipient: { id: string; name: string };
  }) {
    return {
      id: message.id,
      messageType: message.messageType === 'system' ? 'system' : 'player',
      subject: message.subject,
      bodyPreview: this.getBodyPreview(message.body),
      isRead: message.isReadByRecipient,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? null,
      sender: message.sender
        ? {
            id: message.sender.id,
            name: message.sender.name,
          }
        : null,
      recipient: {
        id: message.recipient.id,
        name: message.recipient.name,
      },
    } as const;
  }

  private toMessageDetail(
    message: Parameters<MessagesService['toMessageSummary']>[0],
  ): MessageDetail {
    return {
      ...this.toMessageSummary(message),
      body: message.body,
    };
  }

  private getBodyPreview(body: string): string {
    return body.length <= 140 ? body : `${body.slice(0, 137)}...`;
  }
}
