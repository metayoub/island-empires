import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import {
  AllianceMessageDto,
  CreateAllianceAnnouncementDto,
  CreateAllianceChatMessageDto,
  CreateAllianceHelpRequestDto,
  CreateAllianceTradeRequestDto,
  DonateToAllianceDto,
  InvitePlayerDto,
  ShareAllianceBattleReportDto,
  StartAllianceProjectDto,
  UpdateAllianceProfileDto,
  UpdateAllianceRoleDto,
} from './dto/alliance-action.dto';
import { CreateAllianceDto } from './dto/create-alliance.dto';
import { AlliancesService } from './alliances.service';

@Controller('alliances')
@UseGuards(AuthGuard)
export class AlliancesController {
  constructor(private readonly alliancesService: AlliancesService) {}

  @Get()
  listAlliances(@Query('q') query?: string) {
    return this.alliancesService.listAlliances(query);
  }

  @Get('me')
  getMyAlliance() {
    return this.alliancesService.getMyAlliance();
  }

  @Get('invitations/my')
  getMyInvitations() {
    return this.alliancesService.getMyInvitations();
  }

  @Post()
  createAlliance(@Body() body: CreateAllianceDto) {
    return this.alliancesService.createAlliance(body);
  }

  @Get(':allianceId')
  getAlliance(@Param('allianceId') allianceId: string) {
    return this.alliancesService.getAlliance(allianceId);
  }

  @Patch(':allianceId/profile')
  updateProfile(@Param('allianceId') allianceId: string, @Body() body: UpdateAllianceProfileDto) {
    return this.alliancesService.updateProfile(allianceId, body);
  }

  @Post(':allianceId/applications')
  applyToAlliance(@Param('allianceId') allianceId: string, @Body() body: AllianceMessageDto) {
    return this.alliancesService.applyToAlliance(allianceId, body);
  }

  @Get(':allianceId/applications')
  getApplications(@Param('allianceId') allianceId: string) {
    return this.alliancesService.getApplications(allianceId);
  }

  @Post('applications/:applicationId/accept')
  acceptApplication(@Param('applicationId') applicationId: string) {
    return this.alliancesService.decideApplication(applicationId, 'accepted');
  }

  @Post('applications/:applicationId/reject')
  rejectApplication(@Param('applicationId') applicationId: string) {
    return this.alliancesService.decideApplication(applicationId, 'rejected');
  }

  @Post(':allianceId/invitations')
  invitePlayer(@Param('allianceId') allianceId: string, @Body() body: InvitePlayerDto) {
    return this.alliancesService.invitePlayer(allianceId, body);
  }

  @Post('invitations/:invitationId/accept')
  acceptInvitation(@Param('invitationId') invitationId: string) {
    return this.alliancesService.decideInvitation(invitationId, 'accepted');
  }

  @Post('invitations/:invitationId/reject')
  rejectInvitation(@Param('invitationId') invitationId: string) {
    return this.alliancesService.decideInvitation(invitationId, 'rejected');
  }

  @Patch(':allianceId/members/:memberId/role')
  updateMemberRole(
    @Param('allianceId') allianceId: string,
    @Param('memberId') memberId: string,
    @Body() body: UpdateAllianceRoleDto,
  ) {
    return this.alliancesService.updateMemberRole(allianceId, memberId, body.role);
  }

  @Get(':allianceId/chat')
  getChat(@Param('allianceId') allianceId: string, @Query('limit') limit?: string) {
    return this.alliancesService.getChat(allianceId, Number(limit));
  }

  @Post(':allianceId/chat')
  sendChat(@Param('allianceId') allianceId: string, @Body() body: CreateAllianceChatMessageDto) {
    return this.alliancesService.sendChat(allianceId, body);
  }

  @Get(':allianceId/announcements')
  getAnnouncements(@Param('allianceId') allianceId: string) {
    return this.alliancesService.getAnnouncements(allianceId);
  }

  @Post(':allianceId/announcements')
  createAnnouncement(
    @Param('allianceId') allianceId: string,
    @Body() body: CreateAllianceAnnouncementDto,
  ) {
    return this.alliancesService.createAnnouncement(allianceId, body);
  }

  @Get(':allianceId/cooperation')
  getCooperation(@Param('allianceId') allianceId: string) {
    return this.alliancesService.getCooperation(allianceId);
  }

  @Post(':allianceId/donations')
  donate(@Param('allianceId') allianceId: string, @Body() body: DonateToAllianceDto) {
    return this.alliancesService.donate(allianceId, body);
  }

  @Post(':allianceId/projects')
  startProject(@Param('allianceId') allianceId: string, @Body() body: StartAllianceProjectDto) {
    return this.alliancesService.startProject(allianceId, body);
  }

  @Post(':allianceId/help-requests')
  createHelpRequest(@Param('allianceId') allianceId: string, @Body() body: CreateAllianceHelpRequestDto) {
    return this.alliancesService.createHelpRequest(allianceId, body);
  }

  @Post(':allianceId/trade-requests')
  createTradeRequest(@Param('allianceId') allianceId: string, @Body() body: CreateAllianceTradeRequestDto) {
    return this.alliancesService.createTradeRequest(allianceId, body);
  }

  @Post(':allianceId/shared-battle-reports')
  shareBattleReport(@Param('allianceId') allianceId: string, @Body() body: ShareAllianceBattleReportDto) {
    return this.alliancesService.shareBattleReport(allianceId, body);
  }

  @Post(':allianceId/leave')
  leaveAlliance(@Param('allianceId') allianceId: string) {
    return this.alliancesService.leaveAlliance(allianceId);
  }

  @Post(':allianceId/disband')
  disbandAlliance(@Param('allianceId') allianceId: string) {
    return this.alliancesService.disbandAlliance(allianceId);
  }
}
