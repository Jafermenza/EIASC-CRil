# Ethiopia Geography Exports

These exports are generated from the reviewed Open Admin Data Ethiopia hierarchy source used by CRil.

Source repository: `Jafermenza/ethiopia-administrative-divisions`

Pinned source commit: `418739e33760bf79661f3914e2d8c9cf33248437`

Source file: `data/hierarchy.json`

License: CC-BY-4.0

Expected source hierarchy:

- 15 regions
- 107 zones / city administrations
- 1,148 district / woreda records

The source is a three-level hierarchy: **Region → Zone/City → Woreda/District**. Some district/woreda names contain `town` or `Sub City`, but those labels are part of the source record name; they are not a separate fourth-level parent in the source. The source does **not** publish kebele records, so CRil must not invent kebeles from this dataset.

## Generate CSV and SQL

```bash
npm run db:export-geography
```

Outputs:

- `data/geography/ethiopia-administrative-divisions.csv`
- `data/geography/ethiopia-administrative-divisions.sql`

The SQL uses deterministic UUIDs derived from the source codes and upserts `Region`, `ZoneCity`, and `District` rows. This keeps the generated SQL repeatable and compatible with the current Prisma schema.

## Load the database

For the normal application bootstrap:

```bash
npm run db:bootstrap
```

This deploys migrations, seeds the application, imports the pinned geography source into PostgreSQL, generates the CSV/SQL exports, and verifies the expected geography counts.

Do not manually add a fake sub-city, town, or kebele relationship when the authoritative source does not provide it. A future reviewed source revision can be selected through `GEOGRAPHY_SOURCE_VERSION` and `GEOGRAPHY_SOURCE_URL` after validation.
