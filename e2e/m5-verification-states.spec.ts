import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.afterAll(async () => prisma.$disconnect());

test('M5 public verification contract covers valid, expired, revoked and invalid credentials', async ({ request }) => {
  // M5 release-gate coverage must exercise the shipped verification contract,
  // not recreate M4/M3.5 fixtures through unrelated database automation.
  // Use an existing seeded/approved member credential and restore its state.
  const credential = await prisma.credential.findFirst({
    where: {
      type: 'MEMBER',
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
      memberId: { not: null },
    },
    orderBy: { issuedAt: 'asc' },
  });

  test.skip(!credential, 'M5 E2E requires a seeded active member credential');
  const original = credential!;
  expect(original.expiresAt).toBeTruthy();

  try {
    const valid = await request.get(`http://127.0.0.1:4000/api/v1/credentials/verify/${original.credentialNumber}`);
    expect(valid.ok()).toBeTruthy();
    expect((await valid.json()).verified).toBe(true);

    await prisma.credential.update({
      where: { id: original.id },
      data: { expiresAt: new Date(Date.now() - 86_400_000), status: 'ACTIVE' },
    });
    const expired = await request.get(`http://127.0.0.1:4000/api/v1/credentials/verify/${original.credentialNumber}`);
    expect(expired.ok()).toBeTruthy();
    const expiredBody = await expired.json();
    expect(expiredBody.verified).toBe(false);
    expect(expiredBody.status).toBe('EXPIRED');

    const admin = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    expect(admin).toBeTruthy();
    await prisma.credential.update({
      where: { id: original.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy: admin!.id,
        revocationReason: 'M5 acceptance test',
      },
    });
    const revoked = await request.get(`http://127.0.0.1:4000/api/v1/credentials/verify/${original.credentialNumber}`);
    expect(revoked.ok()).toBeTruthy();
    const revokedBody = await revoked.json();
    expect(revokedBody.verified).toBe(false);
    expect(revokedBody.status).toBe('REVOKED');

    const invalid = await request.get('http://127.0.0.1:4000/api/v1/credentials/verify/EIASC-INVALID-M5-000000');
    expect(invalid.status()).toBe(404);
  } finally {
    await prisma.credential.update({
      where: { id: original.id },
      data: {
        status: original.status,
        expiresAt: original.expiresAt,
        revokedAt: original.revokedAt,
        revokedBy: original.revokedBy,
        revocationReason: original.revocationReason,
      },
    });
  }
});
