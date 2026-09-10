import { PrismaClient, RoleCode, JurisdictionLevel } from '@prisma/client';
import { hashPassword } from '../apps/api/src/auth/crypto';

const prisma = new PrismaClient();

const roles: Array<[RoleCode, string]> = [
  ['SUPER_ADMIN', 'Super Administrator'],
  ['NATIONAL_ADMIN', 'National Administrator'],
  ['REGIONAL_ADMIN', 'Regional Administrator'],
  ['ZONE_ADMIN', 'Zone/City Administrator'],
  ['DISTRICT_ADMIN', 'District Administrator'],
  ['REGISTRAR', 'Registrar'],
  ['INSPECTOR', 'Inspector'],
  ['FINANCE_OFFICER', 'Finance Officer'],
  ['INSTITUTION_ADMIN', 'Institution Administrator'],
  ['MEMBER', 'Member'],
];

const institutionTypes = [
  ['MOSQUE', 'Mosque'], ['MADRASA', 'Madrasa'], ['MOSQUE_MADRASA', 'Mosque/Madrasa'],
  ['ISLAMIC_CENTER', 'Islamic Center'], ['ISLAMIC_EDUCATIONAL', 'Islamic Educational Institution'],
  ['ISLAMIC_COMMUNITY_ORG', 'Islamic Community Organization'], ['YOUTH_ASSOCIATION', 'Youth Association/Council'],
  ['OTHER', 'Other EIASC-approved institution'],
];

async function main() {
  for (const [code, name] of roles) await prisma.role.upsert({ where: { code }, update: { name }, create: { code, name } });
  for (const [code, name] of institutionTypes) await prisma.institutionType.upsert({ where: { code }, update: { name }, create: { code, name } });

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 10) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 10 characters');

  const role = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUPER_ADMIN } });
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, status: 'ACTIVE', jurisdictionLevel: JurisdictionLevel.NATIONAL, jurisdictionId: null, institutionId: null },
    create: { email, passwordHash, status: 'ACTIVE', jurisdictionLevel: JurisdictionLevel.NATIONAL },
  });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
}

main().catch(console.error).finally(() => prisma.$disconnect());
