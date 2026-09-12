import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CredentialType, RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CredentialsService } from './credentials.service';

@Controller('credentials')
@UseGuards(AuthGuard, RolesGuard)
export class CredentialsController {
  constructor(private readonly credentials: CredentialsService) {}
  @Get('mine') mine(@Req() req: AuthenticatedRequest) { return this.credentials.listMine(req.user!); }
  @Get(':id') get(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.credentials.get(id, req.user!); }
  @Post()
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  issue(@Req() req: AuthenticatedRequest, @Body() body: { type?: CredentialType; subjectId?: string }) { if (!body?.type || !body.subjectId?.trim()) throw new BadRequestException('type and subjectId are required'); return this.credentials.issue(req.user!, body.type, body.subjectId); }
  @Post(':id/publish')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_CITY as any, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSPECTOR)
  publish(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.credentials.publish(req.user!, id); }
  @Post(':id/revoke')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  revoke(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.credentials.revoke(req.user!, id); }
}
