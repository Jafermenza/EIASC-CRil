# EIASC CRil Geography Reference Data

Geography is operational reference data. Applicant registration and administrative jurisdiction read from the CRil PostgreSQL database; they do not depend on a live external API.

## Authoritative source

The initial dataset is the EIASC fork of the Open Admin Data Ethiopia dataset:

- Repository: `Jafermenza/ethiopia-administrative-divisions`
- Data license: CC-BY-4.0
- Pinned source commit: `418739e33760bf79661f3914e2d8c9cf33248437`
- Source file: `data/hierarchy.json`
- Source shape: Region -> Zone/City -> Woreda

The source currently reports 15 regions, 107 zones and 1,148 woredas. It does not publish a fourth Sub-city/Town level. CRil therefore treats Sub-city/Town as optional and permits a District/Woreda to attach directly to its Zone/City. Existing sub-city data is preserved.

## Database import

After deploying the migration and generating Prisma:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run db:import-geography
npm run db:verify-geography
```

The importer uses a database transaction for the hierarchy rows and records an import history row in `GeographyImport`.

To use another reviewed source revision without changing code:

```bash
GEOGRAPHY_SOURCE_URL='https://raw.githubusercontent.com/Jafermenza/ethiopia-administrative-divisions/<commit>/data/hierarchy.json' \
GEOGRAPHY_SOURCE_VERSION='<commit>' \
npm run db:import-geography
```

Do not run an automatic production sync from an unreviewed source. Review and approve a new revision first.

## Excel format

Use `docs/geography-import-template.xlsx`.

Required columns:

```text
Region
Region Code
Zone/City
Zone Code
District/Woreda
District Code
```

Optional columns:

```text
Sub-city/Town
Sub-city Code
Latitude
Longitude
```

A Sub-city/Town name and code must be supplied together. Do not invent a Sub-city/Town when the authoritative source does not provide one.

The admin API validates the complete workbook before writing it. Import is restricted to `SUPER_ADMIN` and `NATIONAL_ADMIN`.

## Verification

The verification command checks the expected initial source counts and rejects orphan districts:

```bash
npm run db:verify-geography
```

Expected initial result:

```text
15 regions
107 zones
1148 districts/woredas
0 orphan districts
PASS
```

Manual additions after the initial source load can change counts; use the import history and reviewed source version when comparing later datasets.
