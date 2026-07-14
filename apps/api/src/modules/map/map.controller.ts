import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { MapService } from './map.service';

@Controller()
@UseGuards(AuthGuard)
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('worlds/:worldId/map')
  getWorldMap(@Param('worldId') worldId: string) {
    return this.mapService.getWorldMap(worldId);
  }

  @Get('islands/:islandId')
  getIslandDetail(@Param('islandId') islandId: string) {
    return this.mapService.getIslandDetail(islandId);
  }

  @Post('islands/:islandId/slots/:slotIndex/settle')
  settleCity(
    @Param('islandId') islandId: string,
    @Param('slotIndex') slotIndex: string,
  ) {
    return this.mapService.settleCity({ islandId, slotIndex: Number(slotIndex) });
  }
}
