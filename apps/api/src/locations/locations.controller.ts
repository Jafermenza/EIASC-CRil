import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
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
  districts(@Query('parentId') parentId?: string, @Query('zoneId') zoneId?: string) {
    if (!parentId && !zoneId) return this.locations.getDistricts();
    return this.locations.getDistricts(parentId, zoneId);
  }

  @Get('health')
  async health() {
    try {
      const [regions, zones] = await Promise.all([this.locations.getRegions(), this.locations.getZones()]);
      return { ready: regions.length > 0 && zones.length > 0, regions: regions.length, zones: zones.length };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Unable to read geography');
    }
  }
}
