import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ADMIN_EMAIL = 'e2e-admin@example.test';

async function createMember(suffix: string, index: number) {
  const region = await prisma.region.findFirstOrThrow();
  const zone = await prisma.zoneCity.findFirstOrThrow({ where: { regionId: region.id } });
  const district = await prisma.district.findFirstOrThrow({ where: { zoneId: zone.id } });
  const unique = `${Date.now().toString().slice(-7)}${index}`;
  return prisma.member.create({
    data: {
      firstName: 'M5',
      lastName: `Verification-${suffix}`,
      birthDate: new Date('1990-01-01'),
      gender: 'OTHER',
      maritalStatus: 'SINGLE',
      phone: `+2519${unique}`,
      regionId: region.id,
      zoneId: zone.id,
      districtId: district.id,
      status: 'ACTIVE',
    },
  });
}

test.afterAll(async () => prisma.$disconnect());

test('M5 public verification contract covers valid, expired, revoked and invalid credentials', async ({ request }) => {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  const members = await Promise.all([
    createMember('VALID', 1),
    createMember('EXPIRED', 2),
    createMember('REVOKED', 3),
  ]);

  try {
    const credentials = await Promise.all(
      members.map((member) => prisma.credential.findFirstOrThrow({ where: { memberId: member.id, type: 'MEMBER' } })),
    );
    for (const credential of credentials) expect(credential.expiresAt).toBeTruthy();

    const valid = await request.get(`http://127.0.0.1:4000/api/v1/credentials/verify/${credentials[0].credentialNumber}`);
    expect(valid.ok()).toBeTruthy();
    expect((await valid.json()).verified).toBe(true);

    await prisma.credential.update({ where: { id: credentials[1].id }, data: { expiresAt: new Date(Date.now() - 86_400_000) } });
    const expired = await request.get(`http://127.0.0.1:4000/api/v1/credentials/verify/${credentials[1].credentialNumber}`);
    expect(expired.ok()).toBeTruthy();
    const expiredBody = await expired.json();
    expect(expiredBody.verified).toBe(false);
    expect(expiredBody.status).toBe('EXPIRED');

    await prisma.credential.update({ where: { id: credentials[2].id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedBy: admin.id, revocationReason: 'M5 acceptance test' } });
    const revoked = await request.get(`http://127.0.0.1:4000/api/v1/credentials/verify/${credentials[2].credentialNumber}`);
    expect(revoked.ok()).toBeTruthy();
    const revokedBody = await revoked.json();
    expect(revokedBody.verified).toBe(false);
    expect(revokedBody.status).toBe('REVOKED');

    const invalid = await request.get('http://127.0.0.1:4000/api/v1/credentials/verify/EIASC-INVALID-M5-000000');
    expect(invalid.status()).toBe(404);
  } finally {
    for (const member of members) {
      await prisma.credential.deleteMany({ where: { memberId: member.id } });
      await prisma.member.delete({ where: { id: member.id } }).catch(() => undefined);
    }
  }
});
