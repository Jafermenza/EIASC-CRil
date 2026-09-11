# EIASC-CRil

Community Registration & Institutional Licensing Platform for the Ethiopian Islamic Affairs Supreme Council (EIASC).

## MVP foundation

The repository follows the authoritative `PRD.md` and is being implemented sequentially against its MVP definition.

- `apps/web` — Next.js frontend
- `apps/api` — NestJS API
- `prisma` — PostgreSQL/Prisma data foundation
- `docker-compose.yml` — local PostgreSQL for development

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 16+ (or the included Docker service)

## Local setup

```bash
cp .env.example .env
npm install
npm run db:generate
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run db:bootstrap
npm run dev
```

Frontend: `http://localhost:3000`
API health: `http://localhost:4000/api/v1/health`

## Ethiopia geographic reference data

Registration, institutional applications and jurisdiction authorization use persistent PostgreSQL reference data for Ethiopia's administrative geography. The canonical source for this project is:

- **Repository:** `Jafermenza/ethiopia-administrative-divisions`
- **Source URL:** https://github.com/Jafermenza/ethiopia-administrative-divisions
- **Pinned source commit:** `418739e33760bf79661f3914e2d8c9cf33248437`
- **Canonical hierarchy file:** `data/hierarchy.json`
- **Last updated:** 2026-09-08
- **License:** CC-BY-4.0
- **Coverage:** 15 regions, 107 zones, 1,148 woredas

### Canonical hierarchy

The source defines exactly three administrative levels:

```text
Ethiopia
└── Region (15)
    └── Zone (107)
        └── Woreda (1,148)
```

The source record schema defines `id`, `level`, bilingual/local names, slug, parent/ancestor references, child counts, optional postal codes and WGS84 latitude/longitude coordinates. Levels are `1=region`, `2=zone`, `3=woreda`.

The published regional distribution is:

| Region | Zones | Woredas |
|---|---:|---:|
| Tigray | 6 | 75 |
| Afar | 6 | 49 |
| Amhara | 14 | 225 |
| Oromia | 22 | 349 |
| Somali | 11 | 100 |
| Benishangul-Gumuz | 4 | 26 |
| Central Ethiopia | 10 | 69 |
| South Ethiopia | 12 | 93 |
| South West Ethiopia | 6 | 59 |
| Gambela | 4 | 15 |
| Harari | 1 | 9 |
| Addis Ababa | 1 | 11 |
| Dire Dawa | 2 | 13 |
| Sidama | 5 | 37 |
| Contested | 3 | 18 |
| **Total** | **107** | **1,148** |

Source files available from the approved repository include `data/hierarchy.json`, `data/all-region.json`, `data/all-zone.json`, `data/all-woreda.json`, `data/all-flat.json`, `data/all-flat.ndjson`, `data/all-flat.csv` and `data/schema.json`.

### EIASC-CRil database mapping

The canonical source is imported into the existing application hierarchy as follows:

| Source level | Source identifier | EIASC-CRil table | Application meaning |
|---|---|---|---|
| Region | `ETxx` | `Region` | Regional jurisdiction |
| Zone | `ETxxxx` | `ZoneCity` | Zone/city jurisdiction |
| Woreda | `ETxxxxxx` | `District` | District/woreda jurisdiction |

The source's three-level hierarchy is authoritative. `SubcityTown` remains an optional application model for workflows that need a separate sub-city/town dataset; it is **not populated from the canonical three-level source** and must not be inferred from a woreda record.

The importer preserves the stable source identifiers as database codes and preserves the English display name used by registration and jurisdiction APIs. The source also provides local-language names and coordinates for downstream enrichment; these must not be replaced with guessed or manually invented geography values.

### Import and verification architecture

Geography is **database reference data**, not frontend/static data and not data downloaded on every application startup.

```text
Prisma migrations
  -> system/reference seed
  -> pinned Ethiopia geography import
  -> source hierarchy validation
  -> database verification
  -> application/public exposure
```

Run:

```bash
npm run db:bootstrap
```

The geography import:

1. Downloads only the explicitly pinned `data/hierarchy.json` source.
2. Validates that the payload has the expected nested region → zone → woreda hierarchy.
3. Rejects duplicate IDs and missing IDs/names.
4. Rejects source-count drift unless the approved source is deliberately updated.
5. Requires exactly **15 regions, 107 zones and 1,148 woredas**.
6. Upserts the hierarchy into PostgreSQL using the source IDs as stable codes.
7. Clears an old `subcityId` on canonical-source woredas so the three-level source cannot accidentally inherit an unrelated sub-city relationship.
8. Records source repository, source version, source URL, import status and counts in `GeographyImport`.
9. Runs geography verification before the system is considered ready for public registration.

After import, registration and jurisdiction APIs read the database through `/api/v1/locations/*`. The public application must never depend on GitHub being available at registration time.

### Source attribution and update policy

This project uses the `Jafermenza/ethiopia-administrative-divisions` fork of the Open Admin Data Ethiopia dataset. The dataset is published under **CC-BY-4.0** and attributes Open Admin Data. The approved source commit is pinned so production deployments are reproducible.

To update geography deliberately:

1. Review the new source commit and its hierarchy/schema.
2. Update `GEOGRAPHY_SOURCE_VERSION` and `GEOGRAPHY_SOURCE_URL` together.
3. Run `npm run db:import-geography`.
4. Run `npm run db:verify-geography`.
5. Confirm the new region/zone/woreda counts and hierarchy relationships.
6. Update the acceptance record with the new commit, date and evidence.
7. Only then expose the updated geography to production registration.

Do not silently switch to an unreviewed geography dataset or use a live external API as the registration database.

## M1 authentication configuration

Set `JWT_SECRET` to a random value of at least 32 characters. Never commit `.env` or real credentials.

For a local development administrator, set:

```bash
BOOTSTRAP_ADMIN_EMAIL="admin@example.test"
BOOTSTRAP_ADMIN_PASSWORD="use-a-long-development-password"
RESET_TOKEN_DEBUG="true"
```

`RESET_TOKEN_DEBUG` is only honored outside production and exists solely to exercise the password-reset API until notification delivery is implemented.

M1 exposes:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`

Access tokens are short-lived JWTs. Refresh tokens are rotated and stored only as SHA-256 hashes. Passwords use Node.js `scrypt` and are never stored in plaintext.

## Development gates

Run these after each major milestone:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:verify-geography
```

The MVP deliberately excludes payment gateways, Fayda API integration, biometrics, native mobile apps, USSD, AI decision-making, blockchain, microservices and other post-MVP functionality listed in `PRD.md`.
