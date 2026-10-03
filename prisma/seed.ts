import 'dotenv/config';
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

const institutionTypes: Array<[string, string, string]> = [
  ['MOSQUE', 'Mosque', 'Mosque'],
  ['MADRASA', 'Madrasa', 'Islamic religious school'],
  ['MOSQUE_MADRASA', 'Mosque/Madrasa', 'Combined mosque and madrasa'],
  ['ISLAMIC_CENTER', 'Islamic Center', 'Islamic community center'],
  ['ISLAMIC_EDUCATIONAL_INSTITUTION', 'Islamic Educational Institution', 'Islamic educational institution'],
  ['ISLAMIC_COMMUNITY_ORGANIZATION', 'Islamic Community Organization', 'Islamic community organization'],
  ['YOUTH_ASSOCIATION', 'Youth Association', 'Islamic youth association'],
  ['OTHER', 'Other', 'Other EIASC-approved institution'],
];

const checklistItems: Record<string, Array<{ code: string; label: string; required: boolean; type: 'BOOLEAN'|'TEXT'|'NUMBER' }>> = {
  MOSQUE: [
    { code: 'SITE_IDENTITY', label: 'Institution name, signage and registered location match the application', required: true, type: 'BOOLEAN' },
    { code: 'WORSHIP_FACILITY', label: 'Prayer/worship facility is present and operational', required: true, type: 'BOOLEAN' },
    { code: 'LEADERSHIP', label: 'Imam/leadership information is present and consistent with submitted records', required: true, type: 'BOOLEAN' },
    { code: 'SAFETY_ACCESS', label: 'Basic public access, safety and sanitation conditions are acceptable', required: true, type: 'BOOLEAN' },
    { code: 'COMMUNITY_ACTIVITY', label: 'Community/religious activities described in the application are evidenced', required: false, type: 'BOOLEAN' },
  ],
  MADRASA: [
    { code: 'SITE_IDENTITY', label: 'Institution name, signage and registered location match the application', required: true, type: 'BOOLEAN' },
    { code: 'EDUCATIONAL_FACILITY', label: 'Teaching/learning facilities are present and operational', required: true, type: 'BOOLEAN' },
    { code: 'LEADERSHIP', label: 'Head/leadership information is present and consistent with submitted records', required: true, type: 'BOOLEAN' },
    { code: 'STUDENT_CAPACITY', label: 'Student capacity and education information are reasonably evidenced', required: true, type: 'BOOLEAN' },
    { code: 'SAFETY_SANITATION', label: 'Basic safety, sanitation and learner welfare conditions are acceptable', required: true, type: 'BOOLEAN' },
  ],
  MOSQUE_MADRASA: [
    { code: 'SITE_IDENTITY', label: 'Institution name, signage and registered location match the application', required: true, type: 'BOOLEAN' },
    { code: 'WORSHIP_FACILITY', label: 'Prayer/worship facility is present and operational', required: true, type: 'BOOLEAN' },
    { code: 'EDUCATIONAL_FACILITY', label: 'Teaching/learning facilities are present and operational', required: true, type: 'BOOLEAN' },
    { code: 'LEADERSHIP', label: 'Leadership information is present and consistent with submitted records', required: true, type: 'BOOLEAN' },
    { code: 'SAFETY_SANITATION', label: 'Basic safety, sanitation and learner welfare conditions are acceptable', required: true, type: 'BOOLEAN' },
  ],
  ISLAMIC_CENTER: [
    { code: 'SITE_IDENTITY', label: 'Institution name, signage and registered location match the application', required: true, type: 'BOOLEAN' },
    { code: 'FACILITIES', label: 'Declared community facilities and services are present', required: true, type: 'BOOLEAN' },
    { code: 'LEADERSHIP', label: 'Leadership information is present and consistent with submitted records', required: true, type: 'BOOLEAN' },
    { code: 'SAFETY_ACCESS', label: 'Basic public access, safety and sanitation conditions are acceptable', required: true, type: 'BOOLEAN' },
  ],
  ISLAMIC_EDUCATIONAL_INSTITUTION: [
    { code: 'SITE_IDENTITY', label: 'Institution name, signage and registered location match the application', required: true, type: 'BOOLEAN' },
    { code: 'EDUCATIONAL_FACILITY', label: 'Educational facilities are present and operational', required: true, type: 'BOOLEAN' },
    { code: 'EDUCATION_LEVELS', label: 'Declared education levels and student/teacher information are evidenced', required: true, type: 'BOOLEAN' },
    { code: 'LEADERSHIP', label: 'Leadership information is present and consistent with submitted records', required: true, type: 'BOOLEAN' },
    { code: 'SAFETY_SANITATION', label: 'Basic safety, sanitation and learner welfare conditions are acceptable', required: true, type: 'BOOLEAN' },
  ],
  ISLAMIC_COMMUNITY_ORGANIZATION: [
    { code: 'SITE_IDENTITY', label: 'Organization identity and registered location match the application', required: true, type: 'BOOLEAN' },
    { code: 'GOVERNANCE', label: 'Leadership/governance information is evidenced', required: true, type: 'BOOLEAN' },
    { code: 'DECLARED_ACTIVITIES', label: 'Declared community activities and services are evidenced', required: true, type: 'BOOLEAN' },
    { code: 'SAFETY_ACCESS', label: 'Basic operating, safety and access conditions are acceptable', required: false, type: 'BOOLEAN' },
  ],
  YOUTH_ASSOCIATION: [
    { code: 'IDENTITY_GOVERNANCE', label: 'Organization identity and governance information are evidenced', required: true, type: 'BOOLEAN' },
    { code: 'DECLARED_PROGRAMS', label: 'Declared youth/community programs are evidenced', required: true, type: 'BOOLEAN' },
    { code: 'LEADERSHIP', label: 'Responsible leadership information is evidenced', required: true, type: 'BOOLEAN' },
  ],
  OTHER: [
    { code: 'IDENTITY', label: 'Organization identity and registered location match the application', required: true, type: 'BOOLEAN' },
    { code: 'PURPOSE', label: 'Declared Islamic purpose and activities are evidenced', required: true, type: 'BOOLEAN' },
    { code: 'LEADERSHIP', label: 'Responsible leadership information is evidenced', required: true, type: 'BOOLEAN' },
  ],
};

async function main() {
  for (const [code, name] of roles) await prisma.role.upsert({ where: { code }, update: { name }, create: { code, name } });
  for (const [code, name, description] of institutionTypes) {
    const type = await prisma.institutionType.upsert({ where: { code }, update: { name, description, active: true }, create: { code, name, description, active: true } });
    const existing = await prisma.inspectionChecklistTemplate.findFirst({ where: { institutionTypeId: type.id, active: true }, orderBy: { version: 'desc' } });
    if (!existing) {
      const inspectionRequired = !['ISLAMIC_COMMUNITY_ORGANIZATION', 'YOUTH_ASSOCIATION', 'OTHER'].includes(code);
      await prisma.inspectionChecklistTemplate.create({
        data: { institutionTypeId: type.id, version: 1, name: `${name} inspection checklist`, description: `Editable EIASC inspection checklist for ${name}.`, inspectionRequired, items: checklistItems[code] ?? checklistItems.OTHER },
      });
    }
  }

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
