import { BadRequestException, Body, Controller, Get, Headers, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleCode } from '@prisma/client';
import { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LocationsService } from './locations.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('regions')
  regions() {
    return this.locations.getRegions();
  }

  @Get('zones')
  zones(@Headers('x-request-id') _requestId?: string, @Req() _request?: AuthenticatedRequest, @Body() _body?: never, @Res({ passthrough: true }) _res?: Response) {
    return this.locations.getZones();
  }

  @Get('zones-by-region')
  zonesByRegion(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) _res: Response) {
    return this.locations.getZones((request as AuthenticatedRequest & { query?: { regionId?: string } }).query?.regionId);
  }

  @Get('subcities')
  subcities(@Req() request: AuthenticatedRequest) {
    const regionId = (request as AuthenticatedRequest & { query?: { zoneId?: string } }).query?.zoneId;
    return this.locations.getSubcities(regionId);
  }

  @Get('districts')
  districts(@Req() request: AuthenticatedRequest) {
    const parentId = (request as AuthenticatedRequest & { query?: { parentId?: string } }).query?.parentId;
    return this.locations.getDistricts(parentId);
  }

  @Post('regions')
  createRegion(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>, @Headers('x-request-id') requestId?: string) {
    return this.locations.createRegion({ code: this.requiredString(body.code), name: this.requiredString(body.name) }, request.user!, requestId);
  }

  @Post('zones')
  createZone(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>, @Headers('x-request-id') requestId?: string) {
    return this.locations.createZone({ code: this.requiredString(body.code), name: this.requiredString(body.name), regionId: this.requiredString(body.regionId) }, request.user!, requestId);
  }

  @Post('subcities')
  createSubcity(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>, @Headers('x-request-id') requestId?: string) {
    return this.locations.createSubcity({ code: this.requiredString(body.code), name: this.requiredString(body.name), zoneId: this.requiredString(body.zoneId) }, request.user!, requestId);
  }

  @Post('districts')
  createDistrict(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>, @Headers('x-request-id') requestId?: string) {
    return this.locations.createDistrict({ code: this.requiredString(body.code), name: this.requiredString(body.name), subcityId: this.requiredString(body.subcityId) }, request.user!, requestId);
  }

  @Get('import-template')
  async importTemplate(@Res() response: Response) {
    const workbook = await this.locations.createTemplate();
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', 'attachment; filename="EIASC-location-master-template.xlsx"');
    response.send(workbook);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importExcel(@Req() request: AuthenticatedRequest, @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number } | undefined, @Headers('x-request-id') requestId?: string) {
    if (!file) throw new BadRequestException('Excel file is required');
    const accepted = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    const extension = file.originalname.toLowerCase().endsWith('.xlsx') || file.originalname.toLowerCase().endsWith('.xls');
    if (!accepted.includes(file.mimetype) && !extension) throw new BadRequestException('Only Excel .xlsx or .xls files are accepted');
    return this.locations.importExcel(file.buffer, request.user!, requestId);
  }

  private requiredString(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('Required text value is missing');
    return value;
  }
}
