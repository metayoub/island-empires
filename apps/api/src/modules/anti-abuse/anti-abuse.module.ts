import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AntiAbuseService } from './anti-abuse.service';

@Module({
  imports: [PrismaModule],
  providers: [AntiAbuseService],
  exports: [AntiAbuseService],
})
export class AntiAbuseModule {}
