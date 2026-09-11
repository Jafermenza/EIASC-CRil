import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GeographyAdminService } from './geography-admin.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN)
@Controller('locations/admin')
export class GeographyAdminController {
  constructor(private readonly geography: GeographyAdminService) {}

  @Get('imports')
  imports() {
    return this.geography.imports();
  }

  @Post('import/preview')
  preview(@Body() body: Record<string, unknown>) {
    return this.geography.preview(this.fileBase64(body));
  }

  @Post('import')
  import(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>) {
    if (!request.user) throw new BadRequestException('Authenticated user is unavailable');
    return this.geography.importExcel(this.fileBase64(body), this.string(body.sourceVersion) ?? 'manual', request.user.id);
  }

  @Post('regions')
  region(@Body() body: Record<string, unknown>) {
    return this.geography.createRegion(this.required(body.code, 'code'), this.required(body.name, 'name'));
  }

  @Post('zones')
  zone(@Body() body: Record<string, unknown>) {
    return this.geography.createZone(this.required(body.code, 'code'), this.required(body.name, 'name'), this.required(body.regionId, 'regionId'));
  }

  @Post('subcities')
  subcity(@Body() body: Record<string, unknown>) {
    return this.geography.createSubcity(this.required(body.code, 'code'), this.required(body.name, 'name'), this.required(body.zoneId, 'zoneId'));
  }

  @Post('districts')
  district(@Body() body: Record<string, unknown>) {
    return this.geography.createDistrict(this.required(body.code, 'code'), this.required(body.name, 'name'), this.required(body.zoneId, 'zoneId'), this.string(body.subcityId));
  }

  private fileBase64(body: Record<string, unknown>): string {
    return this.required(body.fileBase64, 'fileBase64');
  }

  private string(value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') throw new BadRequestException('Expected a string value');
    return value.trim() || undefined;
  }

  private required(value: unknown, field: string): string {
    const result = this.string(value);
    if (!result) throw new BadRequestException(`${field} is required`);
    return result;
  }
}
