import { Controller, Get, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('regions')
  regions() {
    return this.locations.getRegions();
  }

  @Get('zones')
  zones(@Query('regionId') regionId?: string) {
    return this.locations.getZones(regionId);
  }

  @Get('subcities')
  subcities(@Query('zoneId') zoneId?: string) {
    return this.locations.getSubcities(zoneId);
  }

  @Get('districts')
  districts(@Query('parentId') parentId?: string) {
    return this.locations.getDistricts(parentId);
  }
}
