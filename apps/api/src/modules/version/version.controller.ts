import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('version')
export class VersionController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getVersion() {
    return {
      version: this.configService.get<string>('app.version', '0.0.1'),
      commitSha: this.configService.get<string>('app.commitSha', 'local'),
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
    } as const;
  }
}
