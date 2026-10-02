import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { IndividualRegistrationInput } from './registration.types';
import { RegistrationsService } from './registrations.service';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post('individual')
  individual(@Body() body: IndividualRegistrationInput) {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Registration payload is required');
    }
    return this.registrations.createIndividual(body);
  }

  @Post('individual/:trackingCode/payment')
  payment(@Param('trackingCode') trackingCode: string, @Body() body: { payment?: IndividualRegistrationInput['payment'] }) {
    return this.registrations.submitPayment(trackingCode, body?.payment);
  }

  @Get(':trackingCode/amend')
  amendment(@Param('trackingCode') trackingCode: string, @Query('phone') phone?: string, @Query('firstName') firstName?: string) {
    return this.registrations.amendment(trackingCode, phone, firstName);
  }

  @Post('individual/:trackingCode/resubmit')
  resubmit(@Param('trackingCode') trackingCode: string, @Body() body: IndividualRegistrationInput & { accessPhone?: string; accessFirstName?: string }) {
    if (!body || typeof body !== 'object') throw new BadRequestException('Registration payload is required');
    const { accessPhone, accessFirstName, ...application } = body;
    return this.registrations.resubmitIndividual(trackingCode, application, accessPhone, accessFirstName);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  @Get('admin/queue')
  queue(@Req() req: AuthenticatedRequest, @Query('status') status?: string) {
    return this.registrations.queue(req.user!, status);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  @Get('admin/members')
  members(@Req() req: AuthenticatedRequest, @Query() query: Record<string, string>) {
    return this.registrations.listMembers(req.user!, query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  @Get('admin/members/:id')
  memberDetail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.registrations.memberDetail(req.user!, id);
  }

  @Patch('admin/members/:id')
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  updateMember(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.registrations.updateMember(req.user!, id, body);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  @Get('admin/:id')
  detail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.registrations.detail(req.user!, id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  @Post('admin/:id/review')
  review(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.registrations.review(req.user!, id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  @Post('admin/:id/correction')
  correction(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { reason?: string }) {
    if (!body?.reason?.trim()) throw new BadRequestException('reason is required');
    return this.registrations.requestCorrection(req.user!, id, body.reason);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  @Post('admin/:id/reject')
  reject(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: { reason?: string }) {
    if (!body?.reason?.trim()) throw new BadRequestException('reason is required');
    return this.registrations.reject(req.user!, id, body.reason);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  @Post('admin/:id/approve')
  approve(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.registrations.approve(req.user!, id);
  }

  @Get(':trackingCode')
  track(
    @Param('trackingCode') trackingCode: string,
    @Query('phone') phone?: string,
    @Query('firstName') firstName?: string,
  ) {
    return this.registrations.track(trackingCode, phone, firstName);
  }
}
