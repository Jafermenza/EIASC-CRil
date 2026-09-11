import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { MembershipService } from './membership.service';
import { MembershipCreateInput, MembershipStatusInput } from './membership.types';

@Controller('memberships')
@UseGuards(AuthGuard)
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get('institution/:institutionId')
  list(@Req() req: AuthenticatedRequest, @Param('institutionId') institutionId: string) {
    return this.membership.listForInstitution(req.user!, institutionId);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: MembershipCreateInput) {
    return this.membership.create(req.user!, body);
  }

  @Post(':id/status')
  updateStatus(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: MembershipStatusInput) {
    return this.membership.updateStatus(req.user!, id, body);
  }
}
