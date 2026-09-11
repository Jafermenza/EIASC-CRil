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

Registration and jurisdiction selection use persistent PostgreSQL reference data for Ethiopia's administrative geography. The approved source is the maintained project repository:

- **Source repository:** `Jafermenza/ethiopia-administrative-divisions`
- **Source:** urlJafermenza/ethiopia-administrative-divisionshttps://github.com/Jafermenza/ethiopia-administrative-divisions
- **Pinned source commit:** `418739e33760bf79661f3914e2d8c9cf33248437`
- **Source data:** `data/hierarchy.json`
- **Last updated:** 2026-09-08
- **License:** CC-BY-4.0
- **Coverage:** 15 regions, 107 zones, 1,148 woredas
- **Coordinates:** included by the source dataset for administrative levels; the EIASC-CRil registration model currently persists the administrative codes, names and hierarchy used for jurisdiction validation.

The source dataset provides machine-readable JSON, NDJSON and CSV formats and includes English/local names, stable IDs, parent/ancestor references and WGS84 latitude/longitude fields. citeturn0search0

EIASC-CRil imports the pinned hierarchy into PostgreSQL during `npm run db:bootstrap`. The application does **not** download geography on every startup. After import, registration and jurisdiction APIs read the database through `/api/v1/locations/*`.

The bootstrap sequence is:

```text
Prisma migrations
  -> system/reference seed
  -> pinned Ethiopia geography import
  -> geography verification
  -> application/public exposure
```

The importer records the source repository, source version, source URL, import status and imported counts in `GeographyImport`. Geography verification is a release gate and must confirm 15 regions, 107 zones, 1,148 woredas and no orphaned hierarchy records before production exposure.

The source repository's README identifies the dataset as CC-BY-4.0 and provides the complete region/zone/woreda hierarchy and schema. fileciteturn271file0

To deliberately update the approved geography version, change `GEOGRAPHY_SOURCE_VERSION` and `GEOGRAPHY_SOURCE_URL` together, run the import and verification gates, review the resulting counts, and record the new source commit in the acceptance record. Do not silently switch to an unreviewed geography dataset.

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
