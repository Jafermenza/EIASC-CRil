import { Body, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('unreadOnly') unreadOnly?: string) { return this.notifications.list(req.user!, unreadOnly === 'true'); }
  @Patch(':id/read')
  read(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.notifications.markRead(req.user!, id); }
  @Post('test-email')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.INSTITUTION_ADMIN)
  testEmail(@Req() req: AuthenticatedRequest) { return this.notifications.testEmail(req.user!); }
  @Post('test-sms')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.INSTITUTION_ADMIN)
  testSms(@Req() req: AuthenticatedRequest) { return this.notifications.testSms(req.user!); }
  @Get('settings/admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN)
  settings(@Req() req: AuthenticatedRequest) { return this.notifications.getAdminSettings(req.user!.roles); }
  @Put('settings/admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN)
  updateSettings(@Req() req: AuthenticatedRequest, @Body() body: { smsEnabled?: boolean; templates?: Record<string, string> }) { return this.notifications.updateAdminSettings(req.user!.roles, body); }
}
