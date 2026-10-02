import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { InstitutionApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { DOCUMENT_TYPES } from './institution.types';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_SIZE = 10 * 1024 * 1024;
const DOCUMENT_EDITABLE_STATUSES: InstitutionApplicationStatus[] = [
  InstitutionApplicationStatus.DRAFT,
  InstitutionApplicationStatus.CORRECTION_REQUIRED,
  InstitutionApplicationStatus.UNDER_REVIEW,
];

@Injectable()
export class InstitutionDocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  async upload(trackingCode: string, documentType: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    if (!DOCUMENT_TYPES.includes(documentType as any)) throw new BadRequestException('Invalid document type');
    if (!file || !file.buffer || file.size <= 0 || file.size > MAX_SIZE) throw new BadRequestException('File is missing or exceeds the 10 MB limit');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException('Unsupported document MIME type');
    const application = await this.prisma.institutionApplication.findUnique({ where: { trackingCode: trackingCode.trim().toUpperCase() }, select: { id: true, status: true } });
    if (!application) throw new NotFoundException('Application not found');
    if (!DOCUMENT_EDITABLE_STATUSES.includes(application.status)) throw new BadRequestException('Documents cannot be changed in the current application status');
    const root = process.env.INSTITUTION_DOCUMENT_STORAGE_PATH?.trim();
    if (!root) throw new BadRequestException('Institution document storage is not configured');
    const extension = file.mimetype === 'application/pdf' ? '.pdf' : file.mimetype === 'image/png' ? '.png' : '.jpg';
    const storageKey = `${new Date().getUTCFullYear()}/${randomBytes(24).toString('hex')}${extension}`;
    const path = join(root, storageKey);
    await mkdir(join(root, String(new Date().getUTCFullYear())), { recursive: true });
    await writeFile(path, file.buffer, { flag: 'wx' });
    return this.prisma.institutionDocument.create({ data: { institutionApplicationId: application.id, documentType, fileName: file.originalname.replace(/[\\/]/g, '_').slice(0, 255), storageKey, mimeType: file.mimetype, size: file.size }, select: { id: true, documentType: true, fileName: true, mimeType: true, size: true, createdAt: true } });
  }
}

  async download(id: string, user: AuthenticatedUser) {
    const document = await this.prisma.institutionDocument.findUnique({
      where: { id },
      include: { application: { select: { regionId: true, zoneId: true, subcityId: true, districtId: true } } },
    });
    if (!document) throw new NotFoundException('Document not found');
    if (!document.application) throw new NotFoundException('Application document is no longer available');
    await this.authorization.assertCanAccess(user, {
      regionId: document.application.regionId,
      zoneId: document.application.zoneId,
      subcityId: document.application.subcityId,
      districtId: document.application.districtId,
    });
    const root = process.env.INSTITUTION_DOCUMENT_STORAGE_PATH?.trim();
    if (!root) throw new BadRequestException('Institution document storage is not configured');
    const path = join(root, document.storageKey);
    const buffer = await readFile(path).catch(() => { throw new NotFoundException('Stored document file not found'); });
    return { buffer, fileName: document.fileName, mimeType: document.mimeType };
  }
}
