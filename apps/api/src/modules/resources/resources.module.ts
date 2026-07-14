import { Module } from '@nestjs/common';
import { LiveEventsModule } from '../live-events/live-events.module';
import { ResourcesService } from './resources.service';

@Module({
  imports: [LiveEventsModule],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
