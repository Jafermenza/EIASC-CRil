import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CredentialsService } from './credentials.service';

@Injectable()
export class CredentialReviewService {
  constructor(private readonly prisma: PrismaService, private readonly credentials: CredentialsService) {}
  async pending() { return this.prisma.$queryRaw<any[]>`SELECT c.*, p."publicationStatus", p."validForYears", p."issueDateHijri", p."expiryDateHijri", p."authorizedSigner", p."authorizedTitle", p."signatureImageUrl", p."sealImageUrl", p.title, p."locationLabel", p."designVersion" FROM "Credential" c JOIN "CredentialPublication" p ON p."credentialId"=c.id WHERE p."publicationStatus"='PENDING_REVIEW' AND c.status='ACTIVE' ORDER BY c."issuedAt" DESC`; }
  publish(user: any, id: string) { return this.credentials.publish(user, id); }
}
