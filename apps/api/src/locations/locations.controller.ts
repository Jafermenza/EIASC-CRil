import { BadRequestException, Body, Controller, Get, Headers, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleCode } from '@prisma/client';
import { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  // Public reads are required by public registration forms.
  @Get('regions')
  regions() { return this.locations.getRegions(); }

  @Get('zones')
  zones(@Query('regionId') regionId?: string) { return this.locations.getZones(regionId); }

  @Get('subcities')
  subcities(@Query('zoneId') zoneId?: string) { return this.locations.getSubcities(zoneId); }

  @Get('districts')
  districts(@Query('parentId') parentId?: string) { return this.locations.getDistricts(parentId); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN)
  @Post('regions')
  createRegion(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>, @Headers('x-request-id') requestId?: string) {
    return this.locations.createRegion({ code: this.requiredString(body.code), name: this.requiredString(body.name) }, request.user!, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN)
  @Post('zones')
  createZone(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>, @Headers('x-request-id') requestId?: string) {
    return this.locations.createZone({ code: this.requiredString(body.code), name: this.requiredString(body.name), regionId: this.requiredString(body.regionId) }, request.user!, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN)
  @Post('subcities')
  createSubcity(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>, @Headers('x-request-id') requestId?: string) {
    return this.locations.createSubcity({ code: this.requiredString(body.code), name: this.requiredString(body.name), zoneId: this.requiredString(body.zoneId) }, request.user!, requestId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN)
  @Get('import-template')
  async importTemplate(@Res() response: Response) {
    const workbook = await this.locations.createTemplate();
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename="EIASC-location-master-template.xlsx"');
    response.send(workbook);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN)
  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importExcel(@Req() request: AuthenticatedRequest, @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number } | undefined, @Headers('x-request-id') requestId?: string) {
    if (!file) throw new BadRequestException('Excel file is required');
    const accepted = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (file.mimetype !== accepted || !file.originalname.toLowerCase().endsWith('.xlsx')) throw new BadRequestException('Only Excel .xlsx files are accepted');
    return this.locations.importExcel(file.buffer, request.user!, requestId);
  }

  private requiredString(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('Required text value is missing');
    return value;
  }
}
