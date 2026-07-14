import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { BrowserPushSubscriptionDto } from './dto/browser-push-subscription.dto';
import { UpdateNotificationSettingsDto } from './dto/notification-settings.dto';
import { ReportsService } from './reports.service';

@Controller()
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports')
  getReports(@Query('category') category?: string, @Query('limit') limit?: string) {
    return this.reportsService.getReports({ category, limit: Number(limit) });
  }

  @Post('reports/:reportId/read')
  markRead(@Param('reportId') reportId: string) {
    return this.reportsService.markRead(reportId);
  }

  @Get('notifications')
  getNotificationCenter(@Query('limit') limit?: string) {
    return this.reportsService.getNotificationCenter(Number(limit));
  }

  @Get('notifications/unread-count')
  getUnreadCounters() {
    return this.reportsService.getUnreadCounters();
  }

  @Get('notifications/settings')
  getNotificationSettings() {
    return this.reportsService.getNotificationSettings();
  }

  @Patch('notifications/settings')
  updateNotificationSettings(@Body() body: UpdateNotificationSettingsDto) {
    return this.reportsService.updateNotificationSettings(body);
  }

  @Post('notifications/browser-push-subscriptions')
  saveBrowserPushSubscription(
    @CurrentAuth() auth: AuthContext,
    @Body() body: BrowserPushSubscriptionDto,
  ) {
    return this.reportsService.saveBrowserPushSubscription(auth, body);
  }

  @Get('notifications/browser-push-subscriptions')
  listBrowserPushSubscriptions() {
    return this.reportsService.listBrowserPushSubscriptions();
  }

  @Post('notifications/browser-push-subscriptions/:subscriptionId/disable')
  disableBrowserPushSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.reportsService.disableBrowserPushSubscription(subscriptionId);
  }

  @Post('notifications/clear')
  clearNotifications() {
    return this.reportsService.clearNotifications();
  }

  @Post('notifications/:notificationId/read')
  markNotificationRead(@Param('notificationId') notificationId: string) {
    return this.reportsService.markNotificationRead(notificationId);
  }

  @Post('notifications/:notificationId/archive')
  archiveNotification(@Param('notificationId') notificationId: string) {
    return this.reportsService.archiveNotification(notificationId);
  }
}
