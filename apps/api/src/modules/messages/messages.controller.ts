import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { BlockPlayerDto } from './dto/block-player.dto';
import { ReportMessageDto } from './dto/report-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@Controller()
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('messages/inbox')
  getInbox(@Query('limit') limit?: string) {
    return this.messagesService.getInbox(Number(limit));
  }

  @Get('messages/sent')
  getSent(@Query('limit') limit?: string) {
    return this.messagesService.getSent(Number(limit));
  }

  @Get('messages/system')
  getSystemMessages(@Query('limit') limit?: string) {
    return this.messagesService.getSystemMessages(Number(limit));
  }

  @Post('messages')
  sendMessage(@Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(dto);
  }

  @Post('messages/:messageId/read')
  markRead(@Param('messageId') messageId: string) {
    return this.messagesService.markRead(messageId);
  }

  @Post('players/:playerId/block')
  blockPlayer(@Param('playerId') playerId: string, @Body() dto: BlockPlayerDto) {
    return this.messagesService.blockPlayer(playerId, dto);
  }

  @Post('messages/:messageId/report')
  reportMessage(@Param('messageId') messageId: string, @Body() dto: ReportMessageDto) {
    return this.messagesService.reportMessage(messageId, dto);
  }

  @Get('moderation/messages')
  getModerationQueue(@Query('limit') limit?: string) {
    return this.messagesService.getModerationQueue(Number(limit));
  }
}
