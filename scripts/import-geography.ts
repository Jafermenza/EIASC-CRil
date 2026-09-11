import { GeographyImportStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE = 'Jafermenza/ethiopia-administrative-divisions';
const SOURCE_COMMIT = '418739e33760bf79661f3914e2d8c9cf33248437';
const SOURCE_URL = process.env.GEOGRAPHY_SOURCE_URL ??
  `https://raw.githubusercontent.com/Jafermenza/ethiopia-administrative-divisions/${SOURCE_COMMIT}/data/hierarchy.json`;
const SOURCE_VERSION = process.env.GEOGRAPHY_SOURCE_VERSION ?? SOURCE_COMMIT;
const EXPECTED = { regions: 15, zones: 107, woredas: 1148 };

type Name = { en?: string; local?: string; slug?: string };
type Woreda = { id: string; name?: Name };
type Zone = { id: string; name?: Name; woreda?: Woreda[] };
type Region = { id: string; name?: Name; zone?: Zone[] };
type Payload = { _attribution?: string; data?: Region[] };

function displayName(name?: Name, fallback?: string): string {
  return name?.en?.trim() || name?.local?.trim() || fallback || '';
}

function assertSource(payload: Payload): Region[] {
  if (!Array.isArray(payload.data) || payload.data.length === 0) {
    throw new Error('Geography source does not contain a non-empty data array');
  }
  return payload.data;
}

function validateHierarchy(regions: Region[]) {
  const regionIds = new Set<string>();
  const zoneIds = new Set<string>();
  const woredaIds = new Set<string>();
  let zoneCount = 0;
  let woredaCount = 0;

  for (const region of regions) {
    if (!region.id || !displayName(region.name)) throw new Error('Source contains a region without id/name');
    if (regionIds.has(region.id)) throw new Error(`Duplicate region id: ${region.id}`);
    regionIds.add(region.id);

    for (const zone of region.zone ?? []) {
      if (!zone.id || !displayName(zone.name)) throw new Error(`Invalid zone under ${region.id}`);
      if (zoneIds.has(zone.id)) throw new Error(`Duplicate zone id: ${zone.id}`);
      zoneIds.add(zone.id);
      zoneCount += 1;

      for (const woreda of zone.woreda ?? []) {
        if (!woreda.id || !displayName(woreda.name)) throw new Error(`Invalid woreda under ${zone.id}`);
        if (woredaIds.has(woreda.id)) throw new Error(`Duplicate woreda id: ${woreda.id}`);
        woredaIds.add(woreda.id);
        woredaCount += 1;
      }
    }
  }

  if (regionIds.size !== EXPECTED.regions || zoneCount !== EXPECTED.zones || woredaCount !== EXPECTED.woredas) {
    throw new Error(
      `Geography source count mismatch: expected ${EXPECTED.regions} regions, ${EXPECTED.zones} zones, ${EXPECTED.woredas} woredas; ` +
      `received ${regionIds.size}, ${zoneCount}, ${woredaCount}`,
    );
  }

  return { regionCount: regionIds.size, zoneCount, woredaCount };
}

async function main() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(SOURCE_URL, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Geography source returned HTTP ${response.status}`);

  const payload = (await response.json()) as Payload;
  const regions = assertSource(payload);
  const counts = validateHierarchy(regions);

  const run = await prisma.geographyImport.create({
    data: {
      source: SOURCE,
      sourceVersion: SOURCE_VERSION,
      sourceUrl: SOURCE_URL,
      status: GeographyImportStatus.RUNNING,
    },
  });

  let regionCount = 0;
  let zoneCount = 0;
  let districtCount = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const region of regions) {
        const regionName = displayName(region.name, region.id);
        const savedRegion = await tx.region.upsert({
          where: { code: region.id },
          update: { name: regionName },
          create: { code: region.id, name: regionName },
        });
        regionCount += 1;

        for (const zone of region.zone ?? []) {
          const zoneName = displayName(zone.name, zone.id);
          const savedZone = await tx.zoneCity.upsert({
            where: { code: zone.id },
            update: { name: zoneName, regionId: savedRegion.id },
            create: { code: zone.id, name: zoneName, regionId: savedRegion.id },
          });
          zoneCount += 1;

          for (const woreda of zone.woreda ?? []) {
            const woredaName = displayName(woreda.name, woreda.id);
            await tx.district.upsert({
              where: { code: woreda.id },
              update: { name: woredaName, zoneId: savedZone.id, subcityId: null },
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
        errors: payload._attribution
          ? { attribution: payload._attribution, expected: EXPECTED, sourceCounts: counts }
          : { expected: EXPECTED, sourceCounts: counts },
      },
    });

    console.log(JSON.stringify({ status: 'SUCCESS', source: SOURCE, sourceVersion: SOURCE_VERSION, sourceUrl: SOURCE_URL, ...counts }, null, 2));
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
