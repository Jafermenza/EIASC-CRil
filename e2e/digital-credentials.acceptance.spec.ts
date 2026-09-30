import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'e2e-admin@example.test';
const ADMIN_PASSWORD = 'e2e-password-12345';

test.afterAll(async () => prisma.$disconnect());

test('MVP v2 credential automation: approval creates member ID and license certificate review item', async ({ request }) => {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  const region = await prisma.region.findFirstOrThrow();
  const zone = await prisma.zoneCity.findFirstOrThrow({ where: { regionId: region.id } });
  const district = await prisma.district.findFirstOrThrow({ where: { zoneId: zone.id } });
  const suffix = Date.now().toString(36).toUpperCase();
  const member = await prisma.member.create({ data: { firstName: 'Automation', lastName: `Member-${suffix}`, birthDate: new Date('1990-01-01'), gender: 'OTHER', maritalStatus: 'SINGLE', phone: `+2519${suffix.slice(-8).padStart(8,'0')}`, regionId: region.id, zoneId: zone.id, districtId: district.id, status: 'ACTIVE' } });
  let licenseId: string | undefined;
  try {
    const memberCredential = await prisma.credential.findFirst({ where: { memberId: member.id, type: 'MEMBER' } });
    expect(memberCredential?.credentialNumber).toBe(member.membershipNumber);
    expect(memberCredential?.status).toBe('ACTIVE');

    const institution = await prisma.institution.findFirstOrThrow({ where: { status: 'ACTIVE' } });
    const license = await prisma.license.create({ data: { institutionId: institution.id, licenseType: 'STANDARD', applicationStatus: 'SUBMITTED', status: 'PENDING', createdBy: admin.id } });
    licenseId = license.id;
    await prisma.license.update({ where: { id: license.id }, data: { applicationStatus: 'APPROVED', approvedBy: admin.id, approvedAt: new Date() } });
    const certificate = await prisma.credential.findFirst({ where: { licenseId: license.id, type: 'LICENSE' } });
    expect(certificate).toBeTruthy();

    // CredentialPublication is intentionally maintained by SQL migrations rather than
    // the Prisma schema. Cast the bound UUID explicitly so PostgreSQL compares uuid=uuid.
    const publication = await prisma.$queryRaw<Array<{ publicationStatus: string }>>`
      SELECT "publicationStatus"
      FROM "CredentialPublication"
      WHERE "credentialId"=${certificate!.id}::uuid
    `;
    expect(publication[0]?.publicationStatus).toBe('PENDING_REVIEW');

    const login = await request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    expect(login.ok()).toBeTruthy();
    const { accessToken } = await login.json();
    const publish = await request.post(`http://127.0.0.1:4000/api/v1/credentials/${certificate!.id}/publish`, { headers: { authorization: `Bearer ${accessToken}` } });
    expect(publish.ok()).toBeTruthy();
    const verify = await request.get(`http://127.0.0.1:4000/api/v1/credentials/verify/${certificate!.credentialNumber}`);
    expect(verify.ok()).toBeTruthy();
    expect((await verify.json()).verified).toBe(true);
  } finally {
    if (licenseId) await prisma.credential.deleteMany({ where: { licenseId } });
    if (licenseId) await prisma.license.delete({ where: { id: licenseId } }).catch(() => undefined);
    await prisma.credential.deleteMany({ where: { memberId: member.id } });
    await prisma.member.delete({ where: { id: member.id } }).catch(() => undefined);
  }
});
