import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RegistrationStatus, RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuthorizationService } from '../auth/authorization.service';
import { AuthenticatedUser } from '../auth/auth.types';

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE = 10 * 1024 * 1024;
const EDITABLE_STATUSES: RegistrationStatus[] = [RegistrationStatus.DRAFT, RegistrationStatus.CORRECTION];
const REVIEW_ROLES = [RoleCode.SUPER_ADMIN, RoleCode.NATIONAL_ADMIN, RoleCode.REGIONAL_ADMIN, RoleCode.ZONE_ADMIN, RoleCode.DISTRICT_ADMIN, RoleCode.REGISTRAR];

@Injectable()
export class RegistrationDocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  private async getApplication(trackingCode: string, phone?: string, firstName?: string) {
    const application = await this.prisma.registration.findUnique({ where: { trackingCode: trackingCode.trim().toUpperCase() }, select: { id: true, trackingCode: true, type: true, status: true, phone: true, firstName: true, regionId: true, zoneId: true, subcityId: true, districtId: true } });
    if (!application || application.type !== 'INDIVIDUAL') throw new NotFoundException('Application not found');
    if (phone && application.phone !== phone.trim()) throw new NotFoundException('Application not found');
    if (firstName && application.firstName?.trim().toLowerCase() !== firstName.trim().toLowerCase()) throw new NotFoundException('Application not found');
    if (!phone && !firstName) throw new BadRequestException('Registered phone number or first name is required');
    return application;
  }

  async upload(trackingCode: string, phone: string | undefined, firstName: string | undefined, documentType: string, file: { originalname: string; mimetype: string; size: number; buffer: Buffer }) {
    const application = await this.getApplication(trackingCode, phone, firstName);
    if (!EDITABLE_STATUSES.includes(application.status)) throw new BadRequestException('Supporting documents can only be changed while the application is editable or correction is requested');
    if (!file?.buffer || file.size <= 0 || file.size > MAX_SIZE) throw new BadRequestException('File is missing or exceeds the 10 MB limit');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException('Only PDF and picture files (JPEG, PNG, WebP) are accepted');
    const root = process.env.APPLICATION_DOCUMENT_STORAGE_PATH?.trim() || process.env.INSTITUTION_DOCUMENT_STORAGE_PATH?.trim();
    if (!root) throw new BadRequestException('Application document storage is not configured');
    const extension = file.mimetype === 'application/pdf' ? '.pdf' : file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const storageKey = `individual/${new Date().getUTCFullYear()}/${randomBytes(24).toString('hex')}${extension}`;
    await mkdir(join(root, 'individual', String(new Date().getUTCFullYear())), { recursive: true });
    await writeFile(join(root, storageKey), file.buffer, { flag: 'wx' });
    const cleanType = (documentType || 'OTHER').trim().slice(0, 80) || 'OTHER';
    const created = await this.prisma.registrationDocument.create({ data: { registrationId: application.id, documentType: cleanType, fileName: file.originalname.replace(/[\\/]/g, '_').slice(0, 255), storageKey, storageUrl: `/api/v1/registrations/individual/${encodeURIComponent(application.trackingCode)}/documents/${encodeURIComponent(created.id)}/file`, mimeType: file.mimetype, size: file.size }, select: { id: true, documentType: true, fileName: true, storageUrl: true, mimeType: true, size: true, createdAt: true } });
    await this.prisma.auditLog.create({ data: { action: 'INDIVIDUAL_SUPPORTING_DOCUMENT_UPLOADED', entityType: 'Registration', entityId: application.id, metadata: { documentId: created.id, documentType: cleanType, fileName: created.fileName, mimeType: created.mimeType, size: created.size } } });
    return created;
  }

  async listForApplicant(trackingCode: string, phone?: string, firstName?: string) {
    const application = await this.getApplication(trackingCode, phone, firstName);
    return this.prisma.registrationDocument.findMany({ where: { registrationId: application.id }, orderBy: { createdAt: 'asc' }, select: { id: true, documentType: true, fileName: true, storageUrl: true, mimeType: true, size: true, createdAt: true } });
  }

  async downloadApplicant(id: string, trackingCode: string, phone?: string, firstName?: string) {
    const application = await this.getApplication(trackingCode, phone, firstName);
    const document = await this.prisma.registrationDocument.findFirst({ where: { id, registrationId: application.id } });
    if (!document) throw new NotFoundException('Document not found');
    const root = process.env.APPLICATION_DOCUMENT_STORAGE_PATH?.trim() || process.env.INSTITUTION_DOCUMENT_STORAGE_PATH?.trim();
    if (!root) throw new BadRequestException('Application document storage is not configured');
    const buffer = await readFile(join(root, document.storageKey)).catch(() => { throw new NotFoundException('Stored document file not found'); });
    return { buffer, fileName: document.fileName, mimeType: document.mimeType };
  }

  async downloadForReviewer(id: string, user: AuthenticatedUser) {
    if (!user.roles.some((role) => REVIEW_ROLES.includes(role))) throw new BadRequestException('Reviewer role is required');
    const document = await this.prisma.registrationDocument.findUnique({ where: { id }, include: { registration: { select: { regionId: true, zoneId: true, subcityId: true, districtId: true } } } });
    if (!document) throw new NotFoundException('Document not found');
    await this.authorization.assertCanAccess(user, document.registration);
    const root = process.env.APPLICATION_DOCUMENT_STORAGE_PATH?.trim() || process.env.INSTITUTION_DOCUMENT_STORAGE_PATH?.trim();
    if (!root) throw new BadRequestException('Application document storage is not configured');
    const buffer = await readFile(join(root, document.storageKey)).catch(() => { throw new NotFoundException('Stored document file not found'); });
    return { buffer, fileName: document.fileName, mimeType: document.mimeType };
  }
}
