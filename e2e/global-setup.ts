import { PrismaClient, JurisdictionLevel, RoleCode } from '@prisma/client';
import { hashPassword } from '../apps/api/src/auth/crypto';

export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const region = await prisma.region.upsert({ where: { code: 'E2E-REGION' }, update: {}, create: { code: 'E2E-REGION', name: 'E2E Region' } });
    const zone = await prisma.zoneCity.upsert({ where: { code: 'E2E-ZONE' }, update: {}, create: { code: 'E2E-ZONE', name: 'E2E Zone', regionId: region.id } });
    const subcity = await prisma.subcityTown.upsert({ where: { code: 'E2E-SUBCITY' }, update: {}, create: { code: 'E2E-SUBCITY', name: 'E2E Subcity', zoneId: zone.id } });
    const district = await prisma.district.upsert({ where: { code: 'E2E-DISTRICT' }, update: {}, create: { code: 'E2E-DISTRICT', name: 'E2E District', zoneId: zone.id, subcityId: subcity.id } });
    const type = await prisma.institutionType.upsert({ where: { code: 'E2E-MOSQUE' }, update: { active: true }, create: { code: 'E2E-MOSQUE', name: 'E2E Mosque', description: 'Browser journey institution' } });
    const role = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUPER_ADMIN } });
    const admin = await prisma.user.upsert({
      where: { email: 'e2e-admin@example.test' },
      update: { passwordHash: await hashPassword('e2e-password-12345'), status: 'ACTIVE', jurisdictionLevel: JurisdictionLevel.NATIONAL, jurisdictionId: null, institutionId: null },
      create: { email: 'e2e-admin@example.test', passwordHash: await hashPassword('e2e-password-12345'), status: 'ACTIVE', jurisdictionLevel: JurisdictionLevel.NATIONAL },
    });
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: admin.id, roleId: role.id } }, update: {}, create: { userId: admin.id, roleId: role.id } });
    const institution = await prisma.institution.upsert({
      where: { institutionCode: 'E2E-INSTITUTION' },
      update: { status: 'ACTIVE', regionId: region.id, zoneId: zone.id, subcityId: subcity.id, districtId: district.id, institutionTypeId: type.id },
      create: { institutionCode: 'E2E-INSTITUTION', name: 'E2E Approved Mosque', institutionTypeId: type.id, establishmentDate: new Date('2020-01-01'), phone: '+251911000000', email: 'e2e-institution@example.test', address: 'E2E address', regionId: region.id, zoneId: zone.id, subcityId: subcity.id, districtId: district.id, status: 'ACTIVE' },
    });
    await prisma.license.deleteMany({ where: { institutionId: institution.id } });
    await prisma.auditLog.deleteMany({ where: { entityType: 'License' } });
  } finally {
    await prisma.$disconnect();
  }
}
