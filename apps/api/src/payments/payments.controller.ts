import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ChapaInitializeInput, PaymentInput, RegistrationKind } from './payment.types';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Get('fees') fees() { return this.payments.fees(); }
  @Post('chapa/initialize') initializeChapa(@Body() body: ChapaInitializeInput) { return this.payments.initializeChapa(body); }
  @Post('chapa/initialize-for-application')
  initializeForApplication(@Body() body: { kind?: RegistrationKind; trackingCode?: string }) {
    if (!body?.kind || !body.trackingCode) throw new BadRequestException('kind and trackingCode are required');
    return this.payments.initializeForApplication(body.kind, body.trackingCode);
  }
  @Get('chapa/callback') async callback(@Query('trx_ref') trxRef: string, @Query('tx_ref') txRef: string, @Res() response: Response) { const reference = (trxRef || txRef || '').trim(); if (!reference) throw new BadRequestException('Chapa transaction reference is required'); const result = await this.payments.callback(reference); const base = (process.env.WEB_PUBLIC_URL ?? process.env.FRONTEND_URL ?? '').replace(/\/$/, ''); return response.redirect(`${base}${result.returnPath ?? '/register'}?payment_ref=${encodeURIComponent(reference)}`); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.FINANCE_OFFICER, RoleCode.INSPECTOR)
  @Get('admin/queue') queue(@Req() req: AuthenticatedRequest, @Query('status') status?: string, @Query('method') method?: string, @Query('search') search?: string) { return this.payments.queue(req.user!, { status, method, search }); }
  @Get('admin/detail') detail(@Req() req: AuthenticatedRequest, @Query('id') queryId?: string) { if (!queryId) throw new BadRequestException('id is required'); return this.payments.detail(queryId, req.user!); }
  @Post('admin/review') review(@Req() req: AuthenticatedRequest, @Body() body: { id?: string; decision?: 'VERIFY'|'REJECT'|'CLARIFICATION'; reason?: string }) { if (!body?.id || !body.decision) throw new BadRequestException('id and decision are required'); return this.payments.review(body.id, req.user!, body.decision, body.reason); }
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.REGISTRAR, RoleCode.FINANCE_OFFICER)
  @Post('admin/verify') verify(@Req() req: AuthenticatedRequest, @Body() body: { id?: string; approve?: boolean; reason?: string }) { if (!body?.id || typeof body.approve !== 'boolean') throw new BadRequestException('id and approve are required'); return this.payments.review(body.id, req.user!, body.approve ? 'VERIFY' : 'REJECT', body.reason); }
  @Post('validate') validate(@Body() body: { kind?: RegistrationKind; payment?: PaymentInput }) { if (!body?.kind || !body.payment) throw new BadRequestException('kind and payment are required'); return this.payments.validateForSubmission(body.kind, body.payment); }
}
