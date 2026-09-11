import { GeographyImportStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE = 'Jafermenza/ethiopia-administrative-divisions';
const SOURCE_COMMIT = '418739e33760bf79661f3914e2d8c9cf33248437';
const SOURCE_URL = process.env.GEOGRAPHY_SOURCE_URL ??
  `https://raw.githubusercontent.com/Jafermenza/ethiopia-administrative-divisions/${SOURCE_COMMIT}/data/hierarchy.json`;
const SOURCE_VERSION = process.env.GEOGRAPHY_SOURCE_VERSION ?? SOURCE_COMMIT;

type Name = { en?: string; local?: string };
type Woreda = { id: string; name?: Name };
type Zone = { id: string; name?: Name; woreda?: Woreda[] };
type Region = { id: string; name?: Name; zone?: Zone[] };
type Payload = { _attribution?: string; data?: Region[] };

function displayName(name?: Name, fallback?: string): string {
  return name?.en?.trim() || name?.local?.trim() || fallback || '';
}

function assertSource(payload: Payload): Region[] {
  if (!Array.isArray(payload.data) || payload.data.length === 0) throw new Error('Geography source does not contain a non-empty data array');
  return payload.data;
}

async function main() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Geography source returned HTTP ${response.status}`);
  const payload = (await response.json()) as Payload;
  const regions = assertSource(payload);

  const run = await prisma.geographyImport.create({
    data: { source: SOURCE, sourceVersion: SOURCE_VERSION, sourceUrl: SOURCE_URL, status: GeographyImportStatus.RUNNING },
  });

  let regionCount = 0;
  let zoneCount = 0;
  let districtCount = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const region of regions) {
        const regionName = displayName(region.name, region.id);
        if (!region.id || !regionName) throw new Error('Source contains a region without id/name');
        const savedRegion = await tx.region.upsert({
          where: { code: region.id },
          update: { name: regionName },
          create: { code: region.id, name: regionName },
        });
        regionCount += 1;

        for (const zone of region.zone ?? []) {
          const zoneName = displayName(zone.name, zone.id);
          if (!zone.id || !zoneName) throw new Error(`Source contains an invalid zone under ${region.id}`);
          const savedZone = await tx.zoneCity.upsert({
            where: { code: zone.id },
            update: { name: zoneName, regionId: savedRegion.id },
            create: { code: zone.id, name: zoneName, regionId: savedRegion.id },
          });
          zoneCount += 1;

          for (const woreda of zone.woreda ?? []) {
            const woredaName = displayName(woreda.name, woreda.id);
            if (!woreda.id || !woredaName) throw new Error(`Source contains an invalid woreda under ${zone.id}`);
            await tx.district.upsert({
              where: { code: woreda.id },
              update: { name: woredaName, zoneId: savedZone.id },
              create: { code: woreda.id, name: woredaName, zoneId: savedZone.id },
            });
            districtCount += 1;
          }
        }
      }
    }, { timeout: 120000 });

    await prisma.geographyImport.update({
      where: { id: run.id },
      data: {
        status: GeographyImportStatus.SUCCESS,
        completedAt: new Date(),
        regionCount,
        zoneCount,
        districtCount,
        createdCount: regionCount + zoneCount + districtCount,
        errors: payload._attribution ? { attribution: payload._attribution } : undefined,
      },
    });

    console.log(JSON.stringify({ status: 'SUCCESS', source: SOURCE, sourceVersion: SOURCE_VERSION, regionCount, zoneCount, districtCount }, null, 2));
  } catch (error) {
    await prisma.geographyImport.update({
      where: { id: run.id },
      data: {
        status: GeographyImportStatus.FAILED,
        completedAt: new Date(),
        regionCount,
        zoneCount,
        districtCount,
        errorCount: 1,
        errors: { message: error instanceof Error ? error.message : String(error) },
      },
    });
    throw error;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
