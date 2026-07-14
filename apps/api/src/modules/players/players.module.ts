import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevelopmentStateService } from './development-state.service';
import { PlayersController } from './players.controller';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [PlayersController],
  providers: [DevelopmentStateService],
  exports: [DevelopmentStateService],
})
export class PlayersModule {}
