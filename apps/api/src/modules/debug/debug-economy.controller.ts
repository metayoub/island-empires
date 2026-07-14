import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiErrorException } from '../../common/errors/api-error.exception';
import { DebugEconomyService } from './debug-economy.service';

@Controller('debug/economy')
export class DebugEconomyController {
  constructor(
    private readonly debugEconomyService: DebugEconomyService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getDashboard() {
    this.assertDevelopmentMode();
    return this.debugEconomyService.getDashboard();
  }

  @Get('progression-blockers')
  async getProgressionBlockers() {
    this.assertDevelopmentMode();
    return { blockers: await this.debugEconomyService.getProgressionBlockers() };
  }

  private assertDevelopmentMode(): void {
    if (this.configService.get<string>('nodeEnv') === 'production') {
      throw new ApiErrorException(
        'Debug economy endpoints are only available in development mode.',
        'DEBUG_ENDPOINT_DISABLED',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
