import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { AdminService } from './admin.service';
import {
  AdminAuditQueryDto,
  AdminAbuseSignalQueryDto,
  AdminAssignAbuseSignalDto,
  AdminListQueryDto,
  AdminModerationActionDto,
  AdminNoteDto,
  AdminReviewAbuseSignalDto,
  AdminRevokeModerationActionDto,
  AdminReviewReportDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('me')
  me(@CurrentAuth() auth: AuthContext) {
    return this.adminService.me(auth);
  }

  @Get('overview')
  overview(@CurrentAuth() auth: AuthContext) {
    return this.adminService.getOverview(auth);
  }

  @Get('players')
  searchPlayers(@CurrentAuth() auth: AuthContext, @Query() query: AdminListQueryDto) {
    return this.adminService.searchPlayers(auth, query);
  }

  @Get('players/:playerId')
  getPlayer(@CurrentAuth() auth: AuthContext, @Param('playerId') playerId: string) {
    return this.adminService.getPlayer(auth, playerId);
  }

  @Post('players/:playerId/notes')
  addPlayerNote(
    @CurrentAuth() auth: AuthContext,
    @Param('playerId') playerId: string,
    @Body() dto: AdminNoteDto,
  ) {
    return this.adminService.addPlayerNote(auth, playerId, dto);
  }

  @Get('players/:playerId/notes')
  async getPlayerNotes(@CurrentAuth() auth: AuthContext, @Param('playerId') playerId: string) {
    const player = await this.adminService.getPlayer(auth, playerId);
    return { notes: player.player.notes };
  }

  @Post('players/:playerId/warn')
  warnPlayer(
    @CurrentAuth() auth: AuthContext,
    @Param('playerId') playerId: string,
    @Body() dto: AdminModerationActionDto,
  ) {
    return this.adminService.warnPlayer(auth, playerId, dto);
  }

  @Post('players/:playerId/mute')
  mutePlayer(@CurrentAuth() auth: AuthContext, @Param('playerId') playerId: string, @Body() dto: AdminModerationActionDto) {
    return this.adminService.mutePlayer(auth, playerId, dto);
  }

  @Post('players/:playerId/unmute')
  unmutePlayer(@CurrentAuth() auth: AuthContext, @Param('playerId') playerId: string, @Body() dto: AdminModerationActionDto) {
    return this.adminService.unmutePlayer(auth, playerId, dto);
  }

  @Post('players/:playerId/suspend')
  suspendPlayer(@CurrentAuth() auth: AuthContext, @Param('playerId') playerId: string, @Body() dto: AdminModerationActionDto) {
    return this.adminService.suspendPlayer(auth, playerId, dto);
  }

  @Post('players/:playerId/unsuspend')
  unsuspendPlayer(@CurrentAuth() auth: AuthContext, @Param('playerId') playerId: string, @Body() dto: AdminModerationActionDto) {
    return this.adminService.unsuspendPlayer(auth, playerId, dto);
  }

  @Post('players/:playerId/ban')
  banPlayer(@CurrentAuth() auth: AuthContext, @Param('playerId') playerId: string, @Body() dto: AdminModerationActionDto) {
    return this.adminService.banPlayer(auth, playerId, dto);
  }

  @Post('players/:playerId/unban')
  unbanPlayer(@CurrentAuth() auth: AuthContext, @Param('playerId') playerId: string, @Body() dto: AdminModerationActionDto) {
    return this.adminService.unbanPlayer(auth, playerId, dto);
  }

  @Get('cities')
  searchCities(@CurrentAuth() auth: AuthContext, @Query() query: AdminListQueryDto) {
    return this.adminService.searchCities(auth, query);
  }

  @Get('cities/:cityId')
  getCity(@CurrentAuth() auth: AuthContext, @Param('cityId') cityId: string) {
    return this.adminService.getCity(auth, cityId);
  }

  @Get('audits/resources')
  resourceAudit(@CurrentAuth() auth: AuthContext, @Query() query: AdminAuditQueryDto) {
    return this.adminService.listResourceAudit(auth, query);
  }

  @Get('audits/trades')
  tradeAudit(@CurrentAuth() auth: AuthContext, @Query() query: AdminAuditQueryDto) {
    return this.adminService.listTradeAudit(auth, query);
  }

  @Get('audits/battles')
  battleAudit(@CurrentAuth() auth: AuthContext, @Query() query: AdminAuditQueryDto) {
    return this.adminService.listBattleAudit(auth, query);
  }

  @Get('audits/naval')
  navalAudit(@CurrentAuth() auth: AuthContext, @Query() query: AdminAuditQueryDto) {
    return this.adminService.listNavalAudit(auth, query);
  }

  @Get('audits/scouting')
  scoutingAudit(@CurrentAuth() auth: AuthContext, @Query() query: AdminAuditQueryDto) {
    return this.adminService.listScoutingAudit(auth, query);
  }

  @Get('audits/payments')
  paymentAudit(@CurrentAuth() auth: AuthContext, @Query() query: AdminAuditQueryDto) {
    return this.adminService.getPaymentAudit(auth, query);
  }

  @Get('audits/payments/:purchaseId')
  paymentAuditDetail(@CurrentAuth() auth: AuthContext, @Param('purchaseId') purchaseId: string) {
    return this.adminService.getPaymentAuditDetail(auth, purchaseId);
  }

  @Post('audits/payments/:purchaseId/refund-record')
  recordPaymentRefund(
    @CurrentAuth() auth: AuthContext,
    @Param('purchaseId') purchaseId: string,
    @Body() dto: { amountCents?: number; currency?: string; reason?: string },
  ) {
    return this.adminService.recordPaymentRefund(auth, purchaseId, dto);
  }

  @Get('moderation/messages')
  messageModeration(@CurrentAuth() auth: AuthContext, @Query() query: AdminListQueryDto) {
    return this.adminService.getMessageModeration(auth, query);
  }

  @Post('moderation/messages/:reportId/review')
  reviewMessageReport(
    @CurrentAuth() auth: AuthContext,
    @Param('reportId') reportId: string,
    @Body() dto: AdminReviewReportDto,
  ) {
    return this.adminService.reviewMessageReport(auth, reportId, dto);
  }

  @Post('moderation/actions/:actionId/revoke')
  revokeModerationAction(
    @CurrentAuth() auth: AuthContext,
    @Param('actionId') actionId: string,
    @Body() dto: AdminRevokeModerationActionDto,
  ) {
    return this.adminService.revokeModerationAction(auth, actionId, dto.reason);
  }

  @Get('suspicious-activity')
  suspiciousActivity(@CurrentAuth() auth: AuthContext, @Query() query: AdminListQueryDto) {
    return this.adminService.listSuspiciousActivity(auth, query);
  }

  @Get('anti-abuse/dashboard')
  antiAbuseDashboard(@CurrentAuth() auth: AuthContext) {
    return this.adminService.getAntiAbuseDashboard(auth);
  }

  @Get('anti-abuse/overview')
  antiAbuseOverview(@CurrentAuth() auth: AuthContext) {
    return this.adminService.getAntiAbuseDashboard(auth);
  }

  @Get('anti-abuse/signals')
  abuseSignals(@CurrentAuth() auth: AuthContext, @Query() query: AdminAbuseSignalQueryDto) {
    return this.adminService.listAbuseSignals(auth, query);
  }

  @Get('anti-abuse/flags')
  abuseFlags(@CurrentAuth() auth: AuthContext, @Query() query: AdminAbuseSignalQueryDto) {
    return this.adminService.listAbuseSignals(auth, query);
  }

  @Get('anti-abuse/flags/:signalId')
  abuseFlagDetail(@CurrentAuth() auth: AuthContext, @Param('signalId') signalId: string) {
    return this.adminService.getAbuseSignal(auth, signalId);
  }

  @Get('anti-abuse/players/:playerId/risk-profile')
  playerRiskProfile(@CurrentAuth() auth: AuthContext, @Param('playerId') playerId: string) {
    return this.adminService.getPlayerRiskProfile(auth, playerId);
  }

  @Get('anti-abuse/audit-actions')
  sensitiveActionAudits(@CurrentAuth() auth: AuthContext, @Query() query: AdminAbuseSignalQueryDto) {
    return this.adminService.listSensitiveActionAudits(auth, query);
  }

  @Post('anti-abuse/signals/:signalId/review')
  reviewAbuseSignal(
    @CurrentAuth() auth: AuthContext,
    @Param('signalId') signalId: string,
    @Body() dto: AdminReviewAbuseSignalDto,
  ) {
    return this.adminService.reviewAbuseSignal(auth, signalId, dto);
  }

  @Post('anti-abuse/flags/:signalId/review')
  reviewAbuseFlag(
    @CurrentAuth() auth: AuthContext,
    @Param('signalId') signalId: string,
    @Body() dto: AdminReviewAbuseSignalDto,
  ) {
    return this.adminService.reviewAbuseSignal(auth, signalId, dto);
  }

  @Patch('anti-abuse/flags/:signalId')
  updateAbuseFlag(
    @CurrentAuth() auth: AuthContext,
    @Param('signalId') signalId: string,
    @Body() dto: AdminReviewAbuseSignalDto,
  ) {
    return this.adminService.reviewAbuseSignal(auth, signalId, dto);
  }

  @Post('anti-abuse/flags/:signalId/assign')
  assignAbuseFlag(
    @CurrentAuth() auth: AuthContext,
    @Param('signalId') signalId: string,
    @Body() dto: AdminAssignAbuseSignalDto,
  ) {
    return this.adminService.assignAbuseSignal(auth, signalId, dto.adminUserId);
  }

  @Get('action-logs')
  actionLogs(@CurrentAuth() auth: AuthContext, @Query() query: AdminListQueryDto) {
    return this.adminService.listActionLogs(auth, query);
  }
}
