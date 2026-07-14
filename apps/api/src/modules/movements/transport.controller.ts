import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { StartResourceTransportDto } from './dto/start-resource-transport.dto';
import { MovementsService } from './movements.service';

@Controller('transport')
@UseGuards(AuthGuard)
export class TransportController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get('options')
  getTransportOptions(@Query('originCityId') originCityId: string) {
    return this.movementsService.getTransportOptions(originCityId);
  }

  @Post('start')
  startTransport(@Body() dto: StartResourceTransportDto) {
    return this.movementsService.startTransport(dto);
  }

  @Post(':movementId/cancel')
  cancelTransport(@Param('movementId') movementId: string) {
    return this.movementsService.cancelTransport(movementId);
  }
}
