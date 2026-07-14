import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import type { AuthContext } from '../auth/auth-context.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentAuth } from '../auth/current-auth.decorator';
import { AccountService } from './account.service';
import { UpdateAccountSettingsDto } from './dto/account-settings.dto';

@Controller('account')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('settings')
  getSettings(@CurrentAuth() auth: AuthContext) {
    return this.accountService.getSettings(auth);
  }

  @Patch('settings')
  updateSettings(@CurrentAuth() auth: AuthContext, @Body() dto: UpdateAccountSettingsDto) {
    return this.accountService.updateSettings(auth, dto);
  }

  @Post('delete-request')
  requestDeletion(@CurrentAuth() auth: AuthContext) {
    return this.accountService.requestDeletion(auth);
  }
}
