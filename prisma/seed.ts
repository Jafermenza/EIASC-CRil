import { PrismaClient, RoleCode } from '@prisma/client';

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
}

main().catch(console.error).finally(() => prisma.$disconnect());
