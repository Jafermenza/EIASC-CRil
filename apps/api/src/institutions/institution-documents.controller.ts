import { Controller, Get, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { RoleCode } from '@prisma/client';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { InstitutionDocumentsService } from './institution-documents.service';

@Controller('registrations/institution')
export class InstitutionDocumentsController {
  constructor(private readonly documents: InstitutionDocumentsService) {}

  @UseGuards(AuthGuard, RolesGuard)\n  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR, RoleCode.FINANCE_OFFICER)\n  @Get('documents/:id')\n  async download(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Res() response: Response) { const file = await this.documents.download(id, req.user!); response.setHeader('Content-Type', file.mimeType); response.setHeader('Content-Disposition', 'inline; filename="' + file.fileName.replace(/"/g, '') + '"'); return response.send(file.buffer); }\n\n  @Post(':trackingCode/documents/:documentType')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) }))
  upload(@Param('trackingCode') trackingCode: string, @Param('documentType') documentType: string, @Query('phone') phone: string | undefined, @Query('firstName') firstName: string | undefined, @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    return this.documents.upload(trackingCode, documentType, phone, firstName, file);
  }
}
