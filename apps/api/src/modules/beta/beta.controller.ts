import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { BetaService } from './beta.service';
import {
  AdminBetaFeedbackQueryDto,
  CreateBetaAllowlistDto,
  CreateBetaInviteDto,
  SubmitBetaFeedbackDto,
  UpdateBetaAllowlistDto,
  UpdateBetaFeedbackDto,
  UpdateBetaInviteDto,
  ValidateBetaInviteDto,
} from './dto/beta.dto';

@Controller('beta')
export class BetaController {
  constructor(private readonly betaService: BetaService) {}

  @Post('invite/validate')
  validateInvite(@Body() dto: ValidateBetaInviteDto) {
    return this.betaService.validateInviteCode(dto.code);
  }

  @Post('feedback')
  @UseGuards(AuthGuard)
  submitFeedback(@CurrentAuth() auth: AuthContext, @Body() dto: SubmitBetaFeedbackDto) {
    return this.betaService.submitFeedback(auth, dto);
  }

  @Get('feedback/mine')
  @UseGuards(AuthGuard)
  myFeedback(@CurrentAuth() auth: AuthContext) {
    return this.betaService.getMyFeedback(auth);
  }
}

@Controller('admin/beta')
@UseGuards(AuthGuard)
export class AdminBetaController {
  constructor(private readonly betaService: BetaService) {}

  @Get('overview')
  overview(@CurrentAuth() auth: AuthContext) {
    return this.betaService.adminOverview(auth);
  }

  @Get('metrics')
  metrics(@CurrentAuth() auth: AuthContext) {
    return this.betaService.adminMetrics(auth);
  }

  @Get('invites')
  invites(@CurrentAuth() auth: AuthContext) {
    return this.betaService.listInvites(auth);
  }

  @Post('invites')
  createInvite(@CurrentAuth() auth: AuthContext, @Body() dto: CreateBetaInviteDto) {
    return this.betaService.createInvite(auth, dto);
  }

  @Patch('invites/:inviteId')
  updateInvite(
    @CurrentAuth() auth: AuthContext,
    @Param('inviteId') inviteId: string,
    @Body() dto: UpdateBetaInviteDto,
  ) {
    return this.betaService.updateInvite(auth, inviteId, dto);
  }

  @Get('allowlist')
  allowlist(@CurrentAuth() auth: AuthContext) {
    return this.betaService.listAllowlist(auth);
  }

  @Post('allowlist')
  createAllowlistEntry(@CurrentAuth() auth: AuthContext, @Body() dto: CreateBetaAllowlistDto) {
    return this.betaService.createAllowlistEntry(auth, dto);
  }

  @Patch('allowlist/:allowlistId')
  updateAllowlistEntry(
    @CurrentAuth() auth: AuthContext,
    @Param('allowlistId') allowlistId: string,
    @Body() dto: UpdateBetaAllowlistDto,
  ) {
    return this.betaService.updateAllowlistEntry(auth, allowlistId, dto);
  }

  @Get('feedback')
  feedback(@CurrentAuth() auth: AuthContext, @Query() query: AdminBetaFeedbackQueryDto) {
    return this.betaService.adminFeedbackQueue(auth, query);
  }

  @Patch('feedback/:feedbackId')
  updateFeedback(
    @CurrentAuth() auth: AuthContext,
    @Param('feedbackId') feedbackId: string,
    @Body() dto: UpdateBetaFeedbackDto,
  ) {
    return this.betaService.updateFeedback(auth, feedbackId, dto);
  }
}
