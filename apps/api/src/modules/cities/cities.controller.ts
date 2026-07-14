import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CitiesService } from './cities.service';
import { AssignWorkersDto } from './dto/assign-workers.dto';

@Controller('cities')
@UseGuards(AuthGuard)
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  getPlayerCities() {
    return this.citiesService.getPlayerCities();
  }

  @Get(':cityId/overview')
  getCityOverview(@Param('cityId') cityId: string) {
    return this.citiesService.getCityOverview(cityId);
  }

  @Post(':cityId/select')
  selectCity(@Param('cityId') cityId: string) {
    return this.citiesService.selectCity(cityId);
  }

  @Get(':cityId/resources')
  getCityResources(@Param('cityId') cityId: string) {
    return this.citiesService.getCityResources(cityId);
  }

  @Get(':cityId/buildings')
  getCityBuildings(@Param('cityId') cityId: string) {
    return this.citiesService.getCityBuildings(cityId);
  }

  @Get(':cityId/production')
  getCityProduction(@Param('cityId') cityId: string) {
    return this.citiesService.getCityProduction(cityId);
  }

  @Get(':cityId/population')
  getCityPopulation(@Param('cityId') cityId: string) {
    return this.citiesService.getCityPopulation(cityId);
  }

  @Post(':cityId/workers/assign')
  assignWorkers(@Param('cityId') cityId: string, @Body() dto: AssignWorkersDto) {
    return this.citiesService.assignWorkers(cityId, dto);
  }

  @Post(':cityId/buildings/:buildingType/upgrade')
  startBuildingUpgrade(
    @Param('cityId') cityId: string,
    @Param('buildingType') buildingType: string,
  ) {
    return this.citiesService.startBuildingUpgrade(cityId, buildingType);
  }
}
