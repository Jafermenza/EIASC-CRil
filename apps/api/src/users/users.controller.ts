import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JurisdictionLevel, RoleCode, UserStatus } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSPECTOR, RoleCode.FINANCE_OFFICER)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) { return this.users.list(request.user); }

  @Get(':id')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) { return this.users.get(request.user, id); }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: Record<string, unknown>, @Headers('x-request-id') requestId?: string) {
    return this.users.create(request.user, this.parseCreate(body), requestId);
  }

  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: Record<string, unknown>, @Headers('x-request-id') requestId?: string) {
    return this.users.update(request.user, id, this.parseUpdate(body), requestId);
  }

  private parseCreate(body: Record<string, unknown>) {
    return {
      email: this.optionalString(body.email),
      phone: this.optionalString(body.phone),
      password: this.optionalString(body.password),
      role: this.enumValue(body.role, RoleCode),
      jurisdictionLevel: this.enumValue(body.jurisdictionLevel, JurisdictionLevel),
      jurisdictionId: this.optionalString(body.jurisdictionId),
      institutionId: this.optionalString(body.institutionId),
    };
  }

  private parseUpdate(body: Record<string, unknown>) {
    return {
      status: this.enumValue(body.status, UserStatus),
      role: this.enumValue(body.role, RoleCode),
      jurisdictionLevel: this.enumValue(body.jurisdictionLevel, JurisdictionLevel),
      jurisdictionId: body.jurisdictionId === null ? null : this.optionalString(body.jurisdictionId),
      institutionId: body.institutionId === null ? null : this.optionalString(body.institutionId),
      password: this.optionalString(body.password),
    };
  }

  private optionalString(value: unknown): string | undefined { return value === undefined || value === null ? undefined : typeof value === 'string' ? value : (() => { throw new BadRequestException('Expected a string value'); })(); }

  private enumValue<T extends Record<string, string>>(value: unknown, enumObject: T): T[keyof T] | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string' || !Object.values(enumObject).includes(value)) throw new BadRequestException('Invalid enum value');
    return value as T[keyof T];
  }
}
