import { BadRequestException, Controller, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { RoleCode } from '@prisma/client';
import { Req, UseGuards } from '@nestjs/common';
import { RegistrationDocumentsService } from './registration-documents.service';

@Controller('registrations/individual')
export class RegistrationDocumentsController {
  constructor(private readonly documents: RegistrationDocumentsService) {}

  @Post(':trackingCode/documents/:documentType')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) }))
  upload(@Param('trackingCode') trackingCode: string, @Param('documentType') documentType: string, @Query('phone') phone: string | undefined, @Query('firstName') firstName: string | undefined, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('A PDF or picture attachment is required');
    return this.documents.upload(trackingCode, phone, firstName, documentType, file);
  }

  @Get(':trackingCode/documents')
  list(@Param('trackingCode') trackingCode: string, @Query('phone') phone?: string, @Query('firstName') firstName?: string) { return this.documents.listForApplicant(trackingCode, phone, firstName); }

  @Get(':trackingCode/documents/:id/file')
  async applicantDownload(@Param('trackingCode') trackingCode: string, @Param('id') id: string, @Query('phone') phone: string | undefined, @Query('firstName') firstName: string | undefined, @Res() response: Response) { const file = await this.documents.downloadApplicant(id, trackingCode, phone, firstName); response.setHeader('Content-Type', file.mimeType); response.setHeader('Content-Disposition', 'inline; filename="' + file.fileName.replace(/"/g, '') + '"'); return response.send(file.buffer); }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR)
  @Get('admin/documents/:id')
  async reviewerDownload(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Res() response: Response) { const file = await this.documents.downloadForReviewer(id, req.user!); response.setHeader('Content-Type', file.mimeType); response.setHeader('Content-Disposition', 'inline; filename="' + file.fileName.replace(/"/g, '') + '"'); return response.send(file.buffer); }
}
