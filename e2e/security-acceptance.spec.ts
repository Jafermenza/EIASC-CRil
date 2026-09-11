import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../apps/api/src/auth/crypto';

const prisma = new PrismaClient();
const MEMBER_ADMIN_EMAIL = 'e2e-institution-admin@example.test';
const MEMBER_ADMIN_PASSWORD = 'e2e-institution-admin-12345';

test.beforeAll(async () => {
  const institution = await prisma.institution.findUniqueOrThrow({ where: { institutionCode: 'E2E-INSTITUTION-2' } });
  const role = await prisma.role.findUniqueOrThrow({ where: { code: 'INSTITUTION_ADMIN' } });
  const user = await prisma.user.upsert({ where: { email: MEMBER_ADMIN_EMAIL }, update: { passwordHash: await hashPassword(MEMBER_ADMIN_PASSWORD), status: 'ACTIVE', institutionId: institution.id }, create: { email: MEMBER_ADMIN_EMAIL, passwordHash: await hashPassword(MEMBER_ADMIN_PASSWORD), status: 'ACTIVE', institutionId: institution.id, jurisdictionLevel: 'INSTITUTION' } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
});

test.afterAll(async () => { await prisma.$disconnect(); });

test('M10 security acceptance: authentication, horizontal isolation and vertical privilege boundaries', async ({ request }) => {
  const unauthenticated = await request.get('http://127.0.0.1:4000/api/v1/reports/dashboard');
  expect(unauthenticated.status()).toBe(401);
  const invalidToken = await request.get('http://127.0.0.1:4000/api/v1/reports/dashboard', { headers: { authorization: 'Bearer definitely-not-a-jwt' } });
  expect(invalidToken.status()).toBe(401);
  const login = await request.post('http://127.0.0.1:4000/api/v1/auth/login', { data: { identifier: MEMBER_ADMIN_EMAIL, password: MEMBER_ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json() as { accessToken: string };
  const crossInstitution = await request.get('http://127.0.0.1:4000/api/v1/memberships/institution/00000000-0000-0000-0000-000000000001', { headers: { authorization: `Bearer ${accessToken}` } });
  expect([403, 404]).toContain(crossInstitution.status());
  const credentialEscalation = await request.post('http://127.0.0.1:4000/api/v1/credentials', { headers: { authorization: `Bearer ${accessToken}` }, data: { type: 'INSTITUTION', subjectId: '00000000-0000-0000-0000-000000000001' } });
  expect(credentialEscalation.status()).toBe(409);
  const tokenGuess = await request.get('http://127.0.0.1:4000/api/v1/credentials/verify/guess-that-is-not-a-real-token');
  expect(tokenGuess.status()).toBe(404);
});
