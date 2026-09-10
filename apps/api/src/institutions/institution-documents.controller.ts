import { Controller, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InstitutionDocumentsService } from './institution-documents.service';

@Controller('registrations/institution')
export class InstitutionDocumentsController {
  constructor(private readonly documents: InstitutionDocumentsService) {}

  @Post(':trackingCode/documents/:documentType')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) }))
  upload(@Param('trackingCode') trackingCode: string, @Param('documentType') documentType: string, @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    return this.documents.upload(trackingCode, documentType, file);
  }
}
