import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContactSupportDto } from './dto/contact-support.dto';

@Injectable()
export class SupportService {
  constructor(private readonly configService: ConfigService) {}

  contact(input: ContactSupportDto) {
    const supportEmail = this.configService.get<string>(
      'support.email',
      'support@islandempires.local',
    );
    const requestId = `support_${Date.now()}`;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'api',
        message: 'Support request received',
        metadata: {
          requestId,
          supportEmail,
          category: input.category,
          subject: input.subject,
          playerId: input.playerId || undefined,
          userEmail: input.userEmail || undefined,
        },
      }),
    );

    return { success: true, requestId } as const;
  }
}
