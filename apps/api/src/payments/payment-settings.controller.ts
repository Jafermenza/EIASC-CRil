import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RoleCode } from '@prisma/client';
import { PaymentSettingsService } from './payment-settings.service';

@Controller('payments/settings')
export class PaymentSettingsController {
  constructor(private readonly settings: PaymentSettingsService) {}

  @Get()
  getPublic() { return this.settings.getPublic(); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN)
  @Get('admin')
  getAdmin(@Req() req: AuthenticatedRequest) { return this.settings.getAdmin(req.user!.roles); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN)
  @Put('admin')
  update(@Req() req: AuthenticatedRequest, @Body() body: { individualFee?: number | null; institutionFee?: number | null; banks?: Array<{ id?: string; bankName: string; accountName: string; accountNumber: string; branch?: string; active?: boolean }> }) {
    return this.settings.update(req.user!.roles, body);
  }
}
