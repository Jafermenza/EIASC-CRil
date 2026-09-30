import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CredentialConfigurationService } from './credential-configuration.service';

@Controller('credentials/configuration')
export class CredentialConfigurationController {
  constructor(private readonly configuration: CredentialConfigurationService) {}
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN)
  get(@Req() req: AuthenticatedRequest) { return this.configuration.getForUser(req.user!); }
  @Put()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN)
  update(@Req() req: AuthenticatedRequest, @Body() body: Record<string, unknown>) { return this.configuration.update(req.user!, body); }
}
