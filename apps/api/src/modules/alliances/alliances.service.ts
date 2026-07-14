import { HttpStatus, Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@island-empires/config';
import {
  ALLIANCE_RESOURCE_TYPES,
  calculateAllianceContributionScore,
  calculateAllianceProjectProgressPercent,
  getAllianceProjectDefinition,
  isAllianceProjectComplete,
  type AllianceProjectType,
  type AllianceResourceBalance,
} from '@island-empires/game-engine';
import type {
  AllianceCooperationOverviewResponse,
  AllianceApplicationListResponse,
  AllianceChatResponse,
  AllianceDetailResponse,
  AllianceInvitationListResponse,
  AllianceListResponse,
  AllianceRole,
} from '@island-empires/shared-types';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { PrismaService } from '../../database/prisma.service';
import { LiveEventsService } from '../live-events/live-events.service';
import { DevelopmentStateService } from '../players/development-state.service';
import type {
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
} from './dto/alliance-action.dto';
import type { CreateAllianceDto } from './dto/create-alliance.dto';

const MEMBER_ROLES: AllianceRole[] = ['leader', 'officer', 'recruiter', 'member'];
const MANAGEMENT_ROLES: AllianceRole[] = ['leader', 'officer'];
const RECRUITING_ROLES: AllianceRole[] = ['leader', 'officer', 'recruiter'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const RESOURCE_KEYS = [...ALLIANCE_RESOURCE_TYPES];

type Db = Record<string, any>;

@Injectable()
export class AlliancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly developmentStateService: DevelopmentStateService,
    private readonly liveEventsService: LiveEventsService,
  ) {}

  async listAlliances(query?: string): Promise<AllianceListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const q = query?.trim();
    const alliances = await (this.prisma as any).alliance.findMany({
      where: {
        worldId: bootstrap.world.id,
        status: 'active',
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { tag: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { members: true },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });

    return { alliances: alliances.map((alliance: any) => this.toAllianceSummary(alliance)) };
  }

  async getMyAlliance(): Promise<AllianceDetailResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const membership = await (this.prisma as any).allianceMember.findUnique({
      where: { playerId: bootstrap.player.id },
      include: this.memberInclude(),
    });
    if (!membership) {
      return { alliance: null };
    }
    return { alliance: this.toAllianceDetail(membership.alliance, membership) };
  }

  async getAlliance(allianceId: string): Promise<AllianceDetailResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const alliance = await this.findAlliance(allianceId, bootstrap.world.id);
    const membership = await this.findMyMembership(bootstrap.player.id);
    return { alliance: this.toAllianceDetail(alliance, membership?.allianceId === alliance.id ? membership : null) };
  }

  async createAlliance(input: CreateAllianceDto): Promise<AllianceDetailResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertHasNoAlliance(bootstrap.player.id);
    const alliance = await this.db().$transaction(async (tx: Db) => {
      const created = await tx.alliance.create({
        data: {
          worldId: bootstrap.world.id,
          name: input.name.trim(),
          tag: input.tag.trim().toUpperCase(),
          description: input.description?.trim() ?? '',
        },
      });
      await tx.allianceMember.create({
        data: {
          worldId: bootstrap.world.id,
          allianceId: created.id,
          playerId: bootstrap.player.id,
          role: 'leader',
        },
      });
      await tx.allianceTreasury.create({
        data: {
          worldId: bootstrap.world.id,
          allianceId: created.id,
        },
      });
      return tx.alliance.findUniqueOrThrow({ where: { id: created.id }, include: this.allianceInclude() });
    }).catch((error: any) => {
      if (error?.code === 'P2002') {
        throw new ApiErrorException('Alliance name or tag is already taken.', 'ALLIANCE_EXISTS', HttpStatus.CONFLICT);
      }
      throw error;
    });

    return { alliance: this.toAllianceDetail(alliance, await this.findMyMembership(bootstrap.player.id)) };
  }

  async updateProfile(allianceId: string, input: UpdateAllianceProfileDto): Promise<AllianceDetailResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, MANAGEMENT_ROLES);
    const alliance = await (this.prisma as any).alliance.update({
      where: { id: allianceId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.tag ? { tag: input.tag.trim().toUpperCase() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      },
      include: this.allianceInclude(),
    }).catch((error: any) => {
      if (error?.code === 'P2002') {
        throw new ApiErrorException('Alliance name or tag is already taken.', 'ALLIANCE_EXISTS', HttpStatus.CONFLICT);
      }
      throw error;
    });
    return { alliance: this.toAllianceDetail(alliance, await this.findMyMembership(bootstrap.player.id)) };
  }

  async applyToAlliance(allianceId: string, input: AllianceMessageDto) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const alliance = await this.findAlliance(allianceId, bootstrap.world.id);
    await this.assertHasNoAlliance(bootstrap.player.id);
    const application = await (this.prisma as any).allianceApplication.upsert({
      where: { allianceId_playerId: { allianceId: alliance.id, playerId: bootstrap.player.id } },
      create: {
        worldId: bootstrap.world.id,
        allianceId: alliance.id,
        playerId: bootstrap.player.id,
        message: input.message?.trim() || null,
      },
      update: {
        status: 'pending',
        message: input.message?.trim() || null,
        decidedById: null,
        decidedAt: null,
      },
      include: { player: true, alliance: true },
    });
    return { application: this.toApplication(application) };
  }

  async getApplications(allianceId: string): Promise<AllianceApplicationListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, RECRUITING_ROLES);
    const applications = await (this.prisma as any).allianceApplication.findMany({
      where: { worldId: bootstrap.world.id, allianceId, status: 'pending' },
      include: { player: true, alliance: true },
      orderBy: { createdAt: 'asc' },
    });
    return { applications: applications.map((application: any) => this.toApplication(application)) };
  }

  async decideApplication(applicationId: string, decision: 'accepted' | 'rejected') {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const application = await (this.prisma as any).allianceApplication.findUnique({
      where: { id: applicationId },
      include: { player: true, alliance: true },
    });
    if (!application || application.worldId !== bootstrap.world.id || application.status !== 'pending') {
      throw new ApiErrorException('Application not found.', 'ALLIANCE_APPLICATION_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    await this.assertRole(bootstrap.player.id, application.allianceId, RECRUITING_ROLES);
    if (decision === 'accepted') {
      await this.assertHasNoAlliance(application.playerId);
    }

    await this.db().$transaction(async (tx: Db) => {
      await tx.allianceApplication.update({
        where: { id: application.id },
        data: { status: decision, decidedById: bootstrap.player.id, decidedAt: new Date() },
      });
      if (decision === 'accepted') {
        await tx.allianceMember.create({
          data: {
            worldId: application.worldId,
            allianceId: application.allianceId,
            playerId: application.playerId,
            role: 'member',
          },
        });
      }
    });
    return { success: true, status: decision };
  }

  async invitePlayer(allianceId: string, input: InvitePlayerDto) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, RECRUITING_ROLES);
    const player = await this.db().player.findUnique({ where: { id: input.playerId } });
    if (!player || player.worldId !== bootstrap.world.id) {
      throw new ApiErrorException('Player not found.', 'PLAYER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (player.id === bootstrap.player.id) {
      throw new ApiErrorException('You cannot invite yourself.', 'CANNOT_INVITE_SELF', HttpStatus.BAD_REQUEST);
    }
    await this.assertHasNoAlliance(player.id);
    const invitation = await (this.prisma as any).allianceInvitation.upsert({
      where: { allianceId_inviteePlayerId: { allianceId, inviteePlayerId: player.id } },
      create: {
        worldId: bootstrap.world.id,
        allianceId,
        inviteePlayerId: player.id,
        invitedById: bootstrap.player.id,
        message: input.message?.trim() || null,
      },
      update: {
        status: 'pending',
        invitedById: bootstrap.player.id,
        message: input.message?.trim() || null,
        decidedAt: null,
      },
      include: this.invitationInclude(),
    });
    return { invitation: this.toInvitation(invitation) };
  }

  async getMyInvitations(): Promise<AllianceInvitationListResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const invitations = await (this.prisma as any).allianceInvitation.findMany({
      where: { worldId: bootstrap.world.id, inviteePlayerId: bootstrap.player.id, status: 'pending' },
      include: this.invitationInclude(),
      orderBy: { createdAt: 'desc' },
    });
    return { invitations: invitations.map((invitation: any) => this.toInvitation(invitation)) };
  }

  async decideInvitation(invitationId: string, decision: 'accepted' | 'rejected') {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const invitation = await (this.prisma as any).allianceInvitation.findUnique({
      where: { id: invitationId },
      include: this.invitationInclude(),
    });
    if (!invitation || invitation.worldId !== bootstrap.world.id || invitation.inviteePlayerId !== bootstrap.player.id || invitation.status !== 'pending') {
      throw new ApiErrorException('Invitation not found.', 'ALLIANCE_INVITATION_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (decision === 'accepted') {
      await this.assertHasNoAlliance(bootstrap.player.id);
    }
    await this.db().$transaction(async (tx: Db) => {
      await tx.allianceInvitation.update({
        where: { id: invitation.id },
        data: { status: decision, decidedAt: new Date() },
      });
      if (decision === 'accepted') {
        await tx.allianceMember.create({
          data: {
            worldId: invitation.worldId,
            allianceId: invitation.allianceId,
            playerId: bootstrap.player.id,
            role: 'member',
          },
        });
      }
    });
    return { success: true, status: decision };
  }

  async updateMemberRole(allianceId: string, memberId: string, role: AllianceRole) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const actor = await this.assertRole(bootstrap.player.id, allianceId, ['leader']);
    if (!MEMBER_ROLES.includes(role)) {
      throw new ApiErrorException('Invalid alliance role.', 'INVALID_ALLIANCE_ROLE', HttpStatus.BAD_REQUEST);
    }
    const target = await (this.prisma as any).allianceMember.findUnique({ where: { id: memberId }, include: { player: true } });
    if (!target || target.allianceId !== allianceId) {
      throw new ApiErrorException('Member not found.', 'ALLIANCE_MEMBER_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    if (target.id === actor.id) {
      throw new ApiErrorException('Leader cannot change their own role.', 'CANNOT_CHANGE_OWN_ROLE', HttpStatus.BAD_REQUEST);
    }
    if (role === 'leader') {
      await this.db().$transaction(async (tx: Db) => {
        await tx.allianceMember.update({ where: { id: actor.id }, data: { role: 'officer' } });
        await tx.allianceMember.update({ where: { id: target.id }, data: { role } });
      });
    } else {
      await (this.prisma as any).allianceMember.update({ where: { id: target.id }, data: { role } });
    }
    return this.getAlliance(allianceId);
  }

  async getChat(allianceId: string, limitInput?: number): Promise<AllianceChatResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, MEMBER_ROLES);
    const messages = await (this.prisma as any).allianceChatMessage.findMany({
      where: { worldId: bootstrap.world.id, allianceId },
      include: { player: true },
      orderBy: { createdAt: 'desc' },
      take: this.normalizeLimit(limitInput),
    });
    return { messages: messages.reverse().map((message: any) => this.toChatMessage(message)) };
  }

  async sendChat(allianceId: string, input: CreateAllianceChatMessageDto) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertCanCommunicate(bootstrap.player.id);
    await this.assertRole(bootstrap.player.id, allianceId, MEMBER_ROLES);
    const message = await (this.prisma as any).allianceChatMessage.create({
      data: {
        worldId: bootstrap.world.id,
        allianceId,
        playerId: bootstrap.player.id,
        body: input.body.trim(),
      },
      include: { player: true },
    });
    const recipients = await (this.prisma as any).allianceMember.findMany({
      where: {
        worldId: bootstrap.world.id,
        allianceId,
        playerId: { not: bootstrap.player.id },
      },
      select: { playerId: true },
    });
    await Promise.all(
      recipients.map((recipient: { playerId: string }) =>
        (this.prisma as any).report.create({
          data: {
            worldId: bootstrap.world.id,
            playerId: recipient.playerId,
            type: 'alliance_message',
            title: 'Alliance message',
            message: 'A new alliance message is available.',
            payload: {
              allianceId,
              messageId: message.id,
            },
          },
        }),
      ),
    );
    return { message: this.toChatMessage(message) };
  }

  async getAnnouncements(allianceId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, MEMBER_ROLES);
    const announcements = await (this.prisma as any).allianceAnnouncement.findMany({
      where: { worldId: bootstrap.world.id, allianceId },
      include: { player: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { announcements: announcements.map((announcement: any) => this.toAnnouncement(announcement)) };
  }

  async createAnnouncement(allianceId: string, input: CreateAllianceAnnouncementDto) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertCanCommunicate(bootstrap.player.id);
    await this.assertRole(bootstrap.player.id, allianceId, MANAGEMENT_ROLES);
    const announcement = await (this.prisma as any).allianceAnnouncement.create({
      data: {
        worldId: bootstrap.world.id,
        allianceId,
        playerId: bootstrap.player.id,
        title: input.title.trim(),
        body: input.body.trim(),
      },
      include: { player: true },
    });
    return { announcement: this.toAnnouncement(announcement) };
  }

  async getCooperation(allianceId: string): Promise<AllianceCooperationOverviewResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, MEMBER_ROLES);
    const alliance = await this.findAlliance(allianceId, bootstrap.world.id);
    return this.toCooperationOverview(alliance, bootstrap.world.id);
  }

  async donate(allianceId: string, input: DonateToAllianceDto): Promise<AllianceCooperationOverviewResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const membership = await this.assertRole(bootstrap.player.id, allianceId, MEMBER_ROLES);
    const donation = this.normalizeResourceInput(input);
    const score = calculateAllianceContributionScore(donation);
    if (score <= 0) {
      throw new ApiErrorException('Donation must include at least one resource.', 'EMPTY_DONATION', HttpStatus.BAD_REQUEST);
    }

    await this.db().$transaction(async (tx: Db) => {
      const city = await tx.city.findUnique({ where: { id: input.cityId }, include: { resources: true } });
      if (!city || city.worldId !== bootstrap.world.id || city.playerId !== bootstrap.player.id || !city.resources) {
        throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
      for (const resourceType of RESOURCE_KEYS) {
        if (city.resources[resourceType] < donation[resourceType]) {
          throw new ApiErrorException(`Not enough ${resourceType}.`, 'INSUFFICIENT_RESOURCES', HttpStatus.BAD_REQUEST);
        }
      }

      const project = input.projectId
        ? await tx.allianceProject.findUnique({ where: { id: input.projectId } })
        : null;
      if (input.projectId && (!project || project.allianceId !== allianceId || project.status !== 'active')) {
        throw new ApiErrorException('Active alliance project not found.', 'ALLIANCE_PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);
      }

      await tx.cityResource.update({
        where: { cityId: city.id },
        data: this.resourceIncrementData(donation, -1),
      });
      await tx.allianceTreasury.upsert({
        where: { allianceId },
        create: { worldId: bootstrap.world.id, allianceId, ...donation },
        update: this.resourceIncrementData(donation, 1),
      });
      const createdDonation = await tx.allianceDonation.create({
        data: {
          worldId: bootstrap.world.id,
          allianceId,
          playerId: bootstrap.player.id,
          cityId: city.id,
          projectId: project?.id ?? null,
          ...donation,
          contributionScore: score,
        },
      });
      await tx.allianceMember.update({
        where: { id: membership.id },
        data: { contributionScore: { increment: score } },
      });
      for (const resourceType of RESOURCE_KEYS) {
        if (donation[resourceType] > 0) {
          await tx.resourceTransaction.create({
            data: {
              worldId: bootstrap.world.id,
              cityId: city.id,
              playerId: bootstrap.player.id,
              transactionType: 'alliance_donation',
              resourceType,
              amount: -donation[resourceType],
              balanceAfter: city.resources[resourceType] - donation[resourceType],
              referenceType: project ? 'alliance_project' : 'alliance_treasury',
              referenceId: project?.id ?? allianceId,
            },
          });
        }
      }
      if (project) {
        await tx.allianceProject.update({
          where: { id: project.id },
          data: this.projectContributionIncrementData(donation),
        });
        await tx.allianceProjectContribution.create({
          data: {
            worldId: bootstrap.world.id,
            allianceId,
            projectId: project.id,
            playerId: bootstrap.player.id,
            donationId: createdDonation.id,
            ...donation,
            contributionScore: score,
          },
        });
        const updatedProject = await tx.allianceProject.findUniqueOrThrow({ where: { id: project.id } });
        await this.completeProjectIfReady(tx, updatedProject, bootstrap.player.id);
      }
      await this.createActivity(tx, {
        worldId: bootstrap.world.id,
        allianceId,
        playerId: bootstrap.player.id,
        type: 'donation',
        message: `${bootstrap.player.name} donated ${this.formatResources(donation)}${project ? ` to ${this.projectName(project.projectType)}` : ' to the treasury'}.`,
        payload: { donation, projectId: project?.id ?? null },
      });
      await this.liveEventsService.recordParticipationForActiveEvents({
        tx,
        worldId: bootstrap.world.id,
        playerId: bootstrap.player.id,
        type: EVENT_TYPES.ALLIANCE_DONATION,
      });
    });

    return this.getCooperation(allianceId);
  }

  async startProject(allianceId: string, input: StartAllianceProjectDto): Promise<AllianceCooperationOverviewResponse> {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, MANAGEMENT_ROLES);
    const definition = getAllianceProjectDefinition(input.projectType as AllianceProjectType);
    if (!definition) {
      throw new ApiErrorException('Unknown alliance project.', 'INVALID_ALLIANCE_PROJECT', HttpStatus.BAD_REQUEST);
    }
    await this.db().$transaction(async (tx: Db) => {
      const project = await tx.allianceProject.create({
        data: {
          worldId: bootstrap.world.id,
          allianceId,
          projectType: definition.type,
          startedById: bootstrap.player.id,
          woodRequired: definition.cost.wood,
          goldRequired: definition.cost.gold,
          marbleRequired: definition.cost.marble,
          wineRequired: definition.cost.wine,
          crystalRequired: definition.cost.crystal,
          sulfurRequired: definition.cost.sulfur,
        },
      }).catch((error: any) => {
        if (error?.code === 'P2002') {
          throw new ApiErrorException('Alliance project already exists.', 'ALLIANCE_PROJECT_EXISTS', HttpStatus.CONFLICT);
        }
        throw error;
      });
      await this.createActivity(tx, {
        worldId: bootstrap.world.id,
        allianceId,
        playerId: bootstrap.player.id,
        type: 'project_started',
        message: `${bootstrap.player.name} started ${definition.name}.`,
        payload: { projectId: project.id, projectType: definition.type },
      });
    });
    return this.getCooperation(allianceId);
  }

  async createHelpRequest(allianceId: string, input: CreateAllianceHelpRequestDto) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, MEMBER_ROLES);
    if (input.cityId) {
      const city = await this.db().city.findUnique({ where: { id: input.cityId } });
      if (!city || city.playerId !== bootstrap.player.id) {
        throw new ApiErrorException('City not found.', 'CITY_NOT_FOUND', HttpStatus.NOT_FOUND);
      }
    }
    const request = await this.db().$transaction(async (tx: Db) => {
      const created = await tx.allianceHelpRequest.create({
        data: {
          worldId: bootstrap.world.id,
          allianceId,
          playerId: bootstrap.player.id,
          cityId: input.cityId ?? null,
          kind: input.kind,
          message: input.message.trim(),
        },
      });
      await this.createActivity(tx, {
        worldId: bootstrap.world.id,
        allianceId,
        playerId: bootstrap.player.id,
        type: 'help_request',
        message: `${bootstrap.player.name} requested ${input.kind} help: ${input.message.trim()}`,
        payload: { requestId: created.id, kind: input.kind, cityId: input.cityId ?? null },
      });
      return created;
    });
    return { request };
  }

  async createTradeRequest(allianceId: string, input: CreateAllianceTradeRequestDto) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, MEMBER_ROLES);
    const request = await this.db().$transaction(async (tx: Db) => {
      const created = await tx.allianceTradeRequest.create({
        data: {
          worldId: bootstrap.world.id,
          allianceId,
          playerId: bootstrap.player.id,
          offeredResource: input.offeredResource,
          offeredAmount: input.offeredAmount,
          requestedResource: input.requestedResource,
          requestedAmount: input.requestedAmount,
          message: input.message?.trim() || null,
        },
      });
      await this.createActivity(tx, {
        worldId: bootstrap.world.id,
        allianceId,
        playerId: bootstrap.player.id,
        type: 'trade_request',
        message: `${bootstrap.player.name} offers ${input.offeredAmount} ${input.offeredResource} for ${input.requestedAmount} ${input.requestedResource}.`,
        payload: { requestId: created.id },
      });
      return created;
    });
    return { request };
  }

  async shareBattleReport(allianceId: string, input: ShareAllianceBattleReportDto) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, MEMBER_ROLES);
    const report = await this.db().report.findUnique({ where: { id: input.reportId } });
    if (
      !report ||
      report.worldId !== bootstrap.world.id ||
      report.playerId !== bootstrap.player.id ||
      !['pve_battle_victory', 'pve_battle_defeat'].includes(report.type)
    ) {
      throw new ApiErrorException('Battle report not found.', 'BATTLE_REPORT_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    const shared = await this.db().$transaction(async (tx: Db) => {
      const created = await tx.allianceSharedBattleReport.create({
        data: {
          worldId: bootstrap.world.id,
          allianceId,
          playerId: bootstrap.player.id,
          reportId: input.reportId,
          message: input.message?.trim() || null,
        },
      });
      await this.createActivity(tx, {
        worldId: bootstrap.world.id,
        allianceId,
        playerId: bootstrap.player.id,
        type: 'battle_report_shared',
        message: `${bootstrap.player.name} shared battle report: ${report.title}`,
        payload: { sharedReportId: created.id, reportId: report.id, note: input.message?.trim() || null },
      });
      return created;
    });
    return { shared };
  }

  async leaveAlliance(allianceId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    const membership = await this.assertRole(bootstrap.player.id, allianceId, MEMBER_ROLES);
    if (membership.role === 'leader') {
      const otherLeader = await (this.prisma as any).allianceMember.findFirst({
        where: { allianceId, id: { not: membership.id } },
        orderBy: { joinedAt: 'asc' },
      });
      if (!otherLeader) {
        throw new ApiErrorException('Last leader must disband the alliance.', 'LEADER_MUST_DISBAND', HttpStatus.BAD_REQUEST);
      }
      await (this.prisma as any).allianceMember.update({ where: { id: otherLeader.id }, data: { role: 'leader' } });
    }
    await (this.prisma as any).allianceMember.delete({ where: { id: membership.id } });
    return { success: true };
  }

  async disbandAlliance(allianceId: string) {
    const bootstrap = await this.developmentStateService.ensureDevelopmentState();
    await this.assertRole(bootstrap.player.id, allianceId, ['leader']);
    await this.db().$transaction(async (tx: Db) => {
      await tx.allianceApplication.updateMany({ where: { allianceId, status: 'pending' }, data: { status: 'rejected', decidedAt: new Date(), decidedById: bootstrap.player.id } });
      await tx.allianceInvitation.updateMany({ where: { allianceId, status: 'pending' }, data: { status: 'rejected', decidedAt: new Date() } });
      await tx.allianceMember.deleteMany({ where: { allianceId } });
      await tx.alliance.update({ where: { id: allianceId }, data: { status: 'disbanded' } });
    });
    return { success: true };
  }

  private async findAlliance(allianceId: string, worldId: string) {
    const alliance = await (this.prisma as any).alliance.findUnique({
      where: { id: allianceId },
      include: this.allianceInclude(),
    });
    if (!alliance || alliance.worldId !== worldId || alliance.status !== 'active') {
      throw new ApiErrorException('Alliance not found.', 'ALLIANCE_NOT_FOUND', HttpStatus.NOT_FOUND);
    }
    return alliance;
  }

  private async assertHasNoAlliance(playerId: string) {
    const membership = await this.findMyMembership(playerId);
    if (membership) {
      throw new ApiErrorException('Player is already in an alliance.', 'PLAYER_ALREADY_IN_ALLIANCE', HttpStatus.CONFLICT);
    }
  }

  private async assertCanCommunicate(playerId: string): Promise<void> {
    const moderation = await (this.prisma as any).playerModeration?.findUnique({
      where: { playerId },
    });
    const now = new Date();
    if (moderation?.bannedAt || (moderation?.suspendedUntil && moderation.suspendedUntil > now)) {
      throw new ApiErrorException(
        'This account cannot use alliance communication while moderated.',
        'PLAYER_MODERATED',
        HttpStatus.FORBIDDEN,
      );
    }
    if (moderation?.mutedUntil && moderation.mutedUntil > now) {
      throw new ApiErrorException(
        'This account is muted and cannot use alliance communication.',
        'PLAYER_MUTED',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async assertRole(playerId: string, allianceId: string, roles: AllianceRole[]) {
    const membership = await (this.prisma as any).allianceMember.findUnique({
      where: { playerId },
      include: { alliance: true, player: true },
    });
    if (!membership || membership.allianceId !== allianceId || membership.alliance.status !== 'active') {
      throw new ApiErrorException('Alliance membership required.', 'ALLIANCE_MEMBERSHIP_REQUIRED', HttpStatus.FORBIDDEN);
    }
    if (!roles.includes(membership.role)) {
      throw new ApiErrorException('Alliance role is not allowed for this action.', 'ALLIANCE_ROLE_FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    return membership;
  }

  private findMyMembership(playerId: string) {
    return (this.prisma as any).allianceMember.findUnique({
      where: { playerId },
      include: { alliance: true, player: true },
    });
  }

  private allianceInclude() {
    return {
      members: { include: { player: true }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] },
      announcements: { include: { player: true }, orderBy: { createdAt: 'desc' }, take: 5 },
      treasury: true,
      projects: { include: { startedBy: true }, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }] },
      bonuses: true,
      activityEntries: { include: { player: true }, orderBy: { createdAt: 'desc' }, take: 20 },
    };
  }

  private memberInclude() {
    return {
      alliance: { include: this.allianceInclude() },
      player: true,
    };
  }

  private invitationInclude() {
    return { alliance: true, invitee: true, invitedBy: true };
  }

  private toAllianceSummary(alliance: any) {
    return {
      id: alliance.id,
      name: alliance.name,
      tag: alliance.tag,
      description: alliance.description,
      status: alliance.status,
      memberCount: alliance.members?.length ?? 0,
      createdAt: alliance.createdAt.toISOString(),
    };
  }

  private toAllianceDetail(alliance: any, membership: any) {
    const cooperation = this.toCooperationParts(alliance);
    return {
      ...this.toAllianceSummary(alliance),
      myRole: membership?.role ?? null,
      members: (alliance.members ?? []).map((member: any) => ({
        id: member.id,
        playerId: member.playerId,
        playerName: member.player.name,
        role: member.role,
        contributionScore: member.contributionScore ?? 0,
        joinedAt: member.joinedAt.toISOString(),
      })),
      announcements: (alliance.announcements ?? []).map((announcement: any) => this.toAnnouncement(announcement)),
      ...cooperation,
    };
  }

  private toApplication(application: any) {
    return {
      id: application.id,
      allianceId: application.allianceId,
      allianceName: application.alliance.name,
      playerId: application.playerId,
      playerName: application.player.name,
      message: application.message,
      status: application.status,
      createdAt: application.createdAt.toISOString(),
    };
  }

  private toInvitation(invitation: any) {
    return {
      id: invitation.id,
      allianceId: invitation.allianceId,
      allianceName: invitation.alliance.name,
      allianceTag: invitation.alliance.tag,
      inviteePlayerId: invitation.inviteePlayerId,
      inviteePlayerName: invitation.invitee.name,
      invitedById: invitation.invitedById,
      invitedByName: invitation.invitedBy.name,
      message: invitation.message,
      status: invitation.status,
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  private toChatMessage(message: any) {
    return {
      id: message.id,
      playerId: message.playerId,
      playerName: message.player.name,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private toAnnouncement(announcement: any) {
    return {
      id: announcement.id,
      playerId: announcement.playerId,
      playerName: announcement.player.name,
      title: announcement.title,
      body: announcement.body,
      createdAt: announcement.createdAt.toISOString(),
    };
  }

  private async toCooperationOverview(alliance: any, worldId: string): Promise<AllianceCooperationOverviewResponse> {
    return {
      ...this.toCooperationParts(alliance),
      rankings: await this.getRankings(worldId),
    };
  }

  private toCooperationParts(alliance: any) {
    const members = alliance.members ?? [];
    return {
      treasury: this.toResourceBalance(alliance.treasury),
      activeProjects: (alliance.projects ?? []).map((project: any) => this.toProject(project)),
      bonuses: (alliance.bonuses ?? []).map((bonus: any) => this.toBonus(bonus)),
      activityFeed: (alliance.activityEntries ?? []).map((entry: any) => this.toActivity(entry)),
      contributionLeaderboard: [...members]
        .sort((a: any, b: any) => (b.contributionScore ?? 0) - (a.contributionScore ?? 0))
        .map((member: any) => ({
          playerId: member.playerId,
          playerName: member.player.name,
          role: member.role,
          contributionScore: member.contributionScore ?? 0,
        })),
    };
  }

  private toProject(project: any) {
    const definition = getAllianceProjectDefinition(project.projectType as AllianceProjectType);
    const cost = this.toProjectCost(project);
    const contributed = this.toProjectContribution(project);
    return {
      id: project.id,
      projectType: project.projectType,
      name: definition?.name ?? project.projectType,
      description: definition?.description ?? '',
      status: project.status,
      cost,
      contributed,
      progressPercent: calculateAllianceProjectProgressPercent({ cost, contributed }),
      bonus: {
        ...(definition?.bonus ?? {
          bonusType: 'unknown',
          label: 'Alliance Bonus',
          description: '',
          value: 0,
        }),
      },
      startedByName: project.startedBy?.name ?? 'Unknown',
      completedAt: project.completedAt?.toISOString() ?? null,
      createdAt: project.createdAt.toISOString(),
    };
  }

  private toBonus(bonus: any) {
    const definition = this.projectDefinitionForBonus(bonus.bonusType);
    return {
      bonusType: bonus.bonusType,
      label: definition?.bonus.label ?? bonus.bonusType,
      description: definition?.bonus.description ?? '',
      value: bonus.value,
      unlockedAt: bonus.unlockedAt.toISOString(),
    };
  }

  private toActivity(entry: any) {
    return {
      id: entry.id,
      type: entry.type,
      playerName: entry.player?.name ?? 'Unknown',
      message: entry.message,
      payload: entry.payload,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  private async getRankings(worldId: string) {
    const alliances = await (this.prisma as any).alliance.findMany({
      where: { worldId, status: 'active' },
      include: { members: true, projects: true },
    });
    return alliances
      .map((alliance: any) => ({
        allianceId: alliance.id,
        allianceName: alliance.name,
        allianceTag: alliance.tag,
        memberCount: alliance.members.length,
        completedProjects: alliance.projects.filter((project: any) => project.status === 'completed').length,
        contributionScore: alliance.members.reduce((total: number, member: any) => total + (member.contributionScore ?? 0), 0),
      }))
      .sort((a: any, b: any) => b.completedProjects - a.completedProjects || b.contributionScore - a.contributionScore || b.memberCount - a.memberCount)
      .map((ranking: any, index: number) => ({ ...ranking, rank: index + 1 }));
  }

  private normalizeResourceInput(input: Partial<AllianceResourceBalance>): AllianceResourceBalance {
    return RESOURCE_KEYS.reduce((resources, resourceType) => {
      resources[resourceType] = Math.max(0, Math.floor(Number(input[resourceType] ?? 0)));
      return resources;
    }, {} as AllianceResourceBalance);
  }

  private resourceIncrementData(resources: AllianceResourceBalance, direction: 1 | -1) {
    return RESOURCE_KEYS.reduce((data, resourceType) => {
      data[resourceType] = { increment: resources[resourceType] * direction };
      return data;
    }, {} as Record<string, { increment: number }>);
  }

  private projectContributionIncrementData(resources: AllianceResourceBalance) {
    const fieldByResource: Record<keyof AllianceResourceBalance, string> = {
      wood: 'woodContributed',
      gold: 'goldContributed',
      marble: 'marbleContributed',
      wine: 'wineContributed',
      crystal: 'crystalContributed',
      sulfur: 'sulfurContributed',
    };
    return RESOURCE_KEYS.reduce((data, resourceType) => {
      data[fieldByResource[resourceType]] = { increment: resources[resourceType] };
      return data;
    }, {} as Record<string, { increment: number }>);
  }

  private async completeProjectIfReady(tx: Db, project: any, playerId: string) {
    const definition = getAllianceProjectDefinition(project.projectType as AllianceProjectType);
    if (!definition || project.status === 'completed') {
      return;
    }
    const cost = this.toProjectCost(project);
    const contributed = this.toProjectContribution(project);
    if (!isAllianceProjectComplete({ cost, contributed })) {
      return;
    }
    await tx.allianceProject.update({
      where: { id: project.id },
      data: { status: 'completed', completedAt: new Date() },
    });
    await tx.allianceBonus.upsert({
      where: { allianceId_bonusType: { allianceId: project.allianceId, bonusType: definition.bonus.bonusType } },
      create: {
        worldId: project.worldId,
        allianceId: project.allianceId,
        projectId: project.id,
        bonusType: definition.bonus.bonusType,
        value: definition.bonus.value,
        unlockedById: playerId,
      },
      update: { value: definition.bonus.value },
    });
    await this.createActivity(tx, {
      worldId: project.worldId,
      allianceId: project.allianceId,
      playerId,
      type: 'project_completed',
      message: `${definition.name} completed. ${definition.bonus.description}`,
      payload: { projectId: project.id, projectType: project.projectType, bonus: definition.bonus },
    });
  }

  private async createActivity(tx: Db, input: {
    worldId: string;
    allianceId: string;
    playerId: string;
    type: string;
    message: string;
    payload?: unknown;
  }) {
    await tx.allianceActivityEntry.create({
      data: {
        worldId: input.worldId,
        allianceId: input.allianceId,
        playerId: input.playerId,
        type: input.type,
        message: input.message,
        payload: input.payload ?? undefined,
      },
    });
  }

  private toResourceBalance(row: any): AllianceResourceBalance {
    return this.normalizeResourceInput(row ?? {});
  }

  private toProjectCost(project: any): AllianceResourceBalance {
    return {
      wood: project.woodRequired,
      gold: project.goldRequired,
      marble: project.marbleRequired,
      wine: project.wineRequired,
      crystal: project.crystalRequired,
      sulfur: project.sulfurRequired,
    };
  }

  private toProjectContribution(project: any): AllianceResourceBalance {
    return {
      wood: project.woodContributed,
      gold: project.goldContributed,
      marble: project.marbleContributed,
      wine: project.wineContributed,
      crystal: project.crystalContributed,
      sulfur: project.sulfurContributed,
    };
  }

  private projectDefinitionForBonus(bonusType: string) {
    return (['trade_harbor', 'research_library', 'defensive_monument', 'island_festival'] as AllianceProjectType[])
      .map((projectType) => getAllianceProjectDefinition(projectType))
      .find((definition) => definition?.bonus.bonusType === bonusType) ?? null;
  }

  private projectName(projectType: string): string {
    return getAllianceProjectDefinition(projectType as AllianceProjectType)?.name ?? projectType;
  }

  private formatResources(resources: AllianceResourceBalance): string {
    return RESOURCE_KEYS
      .filter((resourceType) => resources[resourceType] > 0)
      .map((resourceType) => `${resources[resourceType]} ${resourceType}`)
      .join(', ');
  }

  private normalizeLimit(limitInput?: number): number {
    if (!Number.isFinite(limitInput) || !limitInput || limitInput < 1) {
      return DEFAULT_LIMIT;
    }
    return Math.min(Math.floor(limitInput), MAX_LIMIT);
  }

  private db(): Db {
    return this.prisma as any;
  }
}
