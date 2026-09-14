import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const canonical = { code: { not: { startsWith: 'E2E-' } } };
  const [regions, zones, districts, orphanDistricts] = await Promise.all([
    prisma.region.count({ where: canonical }),
    prisma.zoneCity.count({ where: canonical }),
    prisma.district.count({ where: canonical }),
    prisma.district.count({ where: { ...canonical, zoneId: null, subcityId: null } }),
  ]);

  const expected = { regions: 15, zones: 107, districts: 1148 };
  const result = {
    expected,
    actual: { regions, zones, districts },
    orphanDistricts,
    status: regions === expected.regions && zones === expected.zones && districts === expected.districts && orphanDistricts === 0 ? 'PASS' : 'FAIL',
  };

  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'PASS') process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
