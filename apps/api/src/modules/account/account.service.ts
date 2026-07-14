import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuthContext } from '../auth/auth-context.service';
import type { UpdateAccountSettingsDto } from './dto/account-settings.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(auth: AuthContext) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    return {
      email: user.email,
      displayName: user.displayName,
      emailVerified: Boolean(user.emailVerifiedAt),
      privacy: {
        showProfile: user.showProfile,
      },
      accountStatus: user.accountStatus,
    };
  }

  async updateSettings(auth: AuthContext, dto: UpdateAccountSettingsDto) {
    await this.prisma.user.update({
      where: { id: auth.userId },
      data: {
        ...(dto.displayName ? { displayName: dto.displayName.trim() } : {}),
        ...(dto.privacy?.showProfile == null ? {} : { showProfile: dto.privacy.showProfile }),
      },
    });
    if (dto.displayName) {
      await this.prisma.player.update({
        where: { id: auth.playerId },
        data: { name: dto.displayName.trim() },
      });
    }
    return { success: true };
  }

  async requestDeletion(auth: AuthContext) {
    const user = await this.prisma.user.update({
      where: { id: auth.userId },
      data: {
        accountStatus: 'pending_deletion',
        deletionRequestedAt: new Date(),
      },
    });

    return { success: true, accountStatus: user.accountStatus };
  }
}
