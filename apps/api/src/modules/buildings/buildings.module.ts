import { Module } from '@nestjs/common';
import { ResourcesModule } from '../resources/resources.module';
import { BuildingsService } from './buildings.service';

@Module({
  imports: [ResourcesModule],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}
