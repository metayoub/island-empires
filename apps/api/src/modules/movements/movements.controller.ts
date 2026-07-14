import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { StartResourceTransportDto } from './dto/start-resource-transport.dto';
import { MovementsService } from './movements.service';

@Controller('movements')
@UseGuards(AuthGuard)
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get()
  getMovements() {
    return this.movementsService.getPlayerMovements();
  }

  @Post('resource-transport')
  startResourceTransport(@Body() dto: StartResourceTransportDto) {
    return this.movementsService.startResourceTransport(dto);
  }
}
