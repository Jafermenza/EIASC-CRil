import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InstitutionStatus, RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PaymentsService } from '../payments/payments.service';
import { InstitutionsService } from './institutions.service';
import { InstitutionApplicationInput, InstitutionApplicationUpdateInput, InstitutionListQuery, InstitutionProfileUpdateInput } from './institution.types';

const ADMIN_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.INSPECTOR];
const DECISION_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR];

@Controller()
export class InstitutionsController {
  constructor(private readonly institutions: InstitutionsService, private readonly payments: PaymentsService) {}
  @Get('institution-types') types() { return this.institutions.listTypes(); }

  @Post('registrations/institution')
  async create(@Body() body: InstitutionApplicationInput) {
    if (!body?.payment) throw new BadRequestException('Registration payment is required before submission');
    await this.payments.validateForSubmission('INSTITUTION', body.payment);
    const application = await this.institutions.createApplication(body);
    await this.payments.attachToApplication('INSTITUTION', application.id, body.payment);
    return { ...application, payment: await this.payments.getForApplication('INSTITUTION', application.id) };
  }

  @Get('registrations/institution/:trackingCode') track(@Param('trackingCode') code: string, @Query('phone') phone?: string) { return this.institutions.trackApplication(code, phone); }
  @Patch('registrations/institution/:id') updateApplication(@Param('id') id: string, @Body() body: InstitutionApplicationUpdateInput) { return this.institutions.updateApplication(id, body); }
  @Post('registrations/institution/:id/resubmit') resubmit(@Param('id') id: string) { return this.institutions.resubmit(id); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @Get('admin/institutions/applications') queue(@Req() req: AuthenticatedRequest, @Query() query: InstitutionListQuery) { return this.institutions.queue(req.user!, query); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @Get('admin/institutions/applications/:id') async detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) { const application = await this.institutions.detail(req.user!, id); return { ...application, payment: await this.payments.getForApplication('INSTITUTION', id) }; }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @Post('admin/institutions/applications/:id/review') review(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.institutions.review(req.user!, id); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...DECISION_ROLES)
  @Post('admin/institutions/applications/:id/request-correction') correction(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { reason?: string }) { if (!body?.reason?.trim()) throw new BadRequestException('reason is required'); return this.institutions.requestCorrection(req.user!, id, body.reason); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...DECISION_ROLES)
  @Post('admin/institutions/applications/:id/approve') async approve(@Req() req: AuthenticatedRequest, @Param('id') id: string) { await this.payments.assertPaid('INSTITUTION', id); return this.institutions.approve(req.user!, id); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...DECISION_ROLES)
  @Post('admin/institutions/applications/:id/reject') reject(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { reason?: string }) { if (!body?.reason?.trim()) throw new BadRequestException('reason is required'); return this.institutions.reject(req.user!, id, body.reason); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES, RoleCode.INSTITUTION_ADMIN)
  @Get('institutions') list(@Req() req: AuthenticatedRequest, @Query() query: InstitutionListQuery) { return this.institutions.listInstitutions(req.user!, query); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES, RoleCode.INSTITUTION_ADMIN)
  @Get('institutions/:id') get(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.institutions.getInstitution(req.user!, id); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @Get('institutions/:id/admin-user') adminUser(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.institutions.adminUser(req.user!, id); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES, RoleCode.INSTITUTION_ADMIN)
  @Patch('institutions/:id') update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: InstitutionProfileUpdateInput) { return this.institutions.updateInstitution(req.user!, id, body); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES)
  @Post('institutions/:id/status') status(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { status?: InstitutionStatus; reason?: string }) { if (!body?.status || !body?.reason?.trim()) throw new BadRequestException('status and reason are required'); return this.institutions.changeStatus(req.user!, id, body.status, body.reason); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES, RoleCode.INSTITUTION_ADMIN)
  @Get('institutions/:id/members') members(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.institutions.members(req.user!, id); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES, RoleCode.INSTITUTION_ADMIN)
  @Post('institutions/:id/members/:memberId') addMember(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('memberId') memberId: string, @Body() body: { relationshipType?: any }) { return this.institutions.addMember(req.user!, id, memberId, body ?? {}); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...ADMIN_ROLES, RoleCode.INSTITUTION_ADMIN)
  @Delete('institutions/:id/members/:memberId') removeMember(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Param('memberId') memberId: string) { return this.institutions.removeMember(req.user!, id, memberId); }
}
