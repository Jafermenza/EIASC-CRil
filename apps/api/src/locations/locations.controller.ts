import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LocationsService } from './locations.service';

const MASTER_DATA_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN];

@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('regions') regions() { return this.locations.getRegions(); }
  @Get('zones') zones(@Query('regionId') regionId?: string) { return this.locations.getZones(regionId); }
  @Get('subcities') subcities(@Query('zoneId') zoneId?: string) { return this.locations.getSubcities(zoneId); }
  @Get('districts') districts(@Query('parentId') parentId?: string) { return this.locations.getDistricts(parentId); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MASTER_DATA_ROLES)
  @Post('regions') createRegion(@Req() req: AuthenticatedRequest, @Body() body: { code?: string; name?: string }, @Headers('x-request-id') requestId?: string) {
    if (!body?.code || !body?.name) throw new BadRequestException('code and name are required');
    return this.locations.createRegion(req.user!, body as { code: string; name: string }, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MASTER_DATA_ROLES)
  @Patch('regions/:id') updateRegion(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { code?: string; name?: string }, @Headers('x-request-id') requestId?: string) {
    if (!body?.code || !body?.name) throw new BadRequestException('code and name are required');
    return this.locations.updateRegion(req.user!, id, body as { code: string; name: string }, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MASTER_DATA_ROLES)
  @Post('zones') createZone(@Req() req: AuthenticatedRequest, @Body() body: { code?: string; name?: string; regionId?: string }, @Headers('x-request-id') requestId?: string) {
    if (!body?.code || !body?.name || !body?.regionId) throw new BadRequestException('code, name and regionId are required');
    return this.locations.createZone(req.user!, body as { code: string; name: string; regionId: string }, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MASTER_DATA_ROLES)
  @Post('subcities') createSubcity(@Req() req: AuthenticatedRequest, @Body() body: { code?: string; name?: string; zoneId?: string }, @Headers('x-request-id') requestId?: string) {
    if (!body?.code || !body?.name || !body?.zoneId) throw new BadRequestException('code, name and zoneId are required');
    return this.locations.createSubcity(req.user!, body as { code: string; name: string; zoneId: string }, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MASTER_DATA_ROLES)
  @Post('districts') createDistrict(@Req() req: AuthenticatedRequest, @Body() body: { code?: string; name?: string; subcityId?: string }, @Headers('x-request-id') requestId?: string) {
    if (!body?.code || !body?.name || !body?.subcityId) throw new BadRequestException('code, name and subcityId are required');
    return this.locations.createDistrict(req.user!, body as { code: string; name: string; subcityId: string }, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MASTER_DATA_ROLES)
  @Patch('zones/:id') updateZone(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { code?: string; name?: string; regionId?: string }, @Headers('x-request-id') requestId?: string) {
    if (!body?.code || !body?.name || !body?.regionId) throw new BadRequestException('code, name and regionId are required');
    return this.locations.updateZone(req.user!, id, body as { code: string; name: string; regionId: string }, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MASTER_DATA_ROLES)
  @Patch('subcities/:id') updateSubcity(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { code?: string; name?: string; zoneId?: string }, @Headers('x-request-id') requestId?: string) {
    if (!body?.code || !body?.name || !body?.zoneId) throw new BadRequestException('code, name and zoneId are required');
    return this.locations.updateSubcity(req.user!, id, body as { code: string; name: string; zoneId: string }, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...MASTER_DATA_ROLES)
  @Patch('districts/:id') updateDistrict(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { code?: string; name?: string; subcityId?: string }, @Headers('x-request-id') requestId?: string) {
    if (!body?.code || !body?.name || !body?.subcityId) throw new BadRequestException('code, name and subcityId are required');
    return this.locations.updateDistrict(req.user!, id, body as { code: string; name: string; subcityId: string }, requestId);
  }
}
