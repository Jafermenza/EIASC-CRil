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

## System vision and authoritative MVP v2 baseline

### 1. SYSTEM VISION

The platform shall establish a single digital institutional registry connecting:

**Individual Members**

→ **Mosques / Madrasas / Islamic Institutions**

→ **District / Woreda**

→ **Sub-City / Town**

→ **City / Zone**

→ **Region**

→ **EIASC National Administration**

The MVP must establish the technical foundation for future:

- membership dues
- digital payments
- Waqf management
- welfare services
- Hajj/Umrah services
- education management
- institutional performance analytics
- GIS
- AI-assisted administration
- national resource allocation

The MVP therefore must be designed as a **platform**, not as a disposable registration website.

---

### 2. MVP SCOPE

#### 2.1 Mandatory MVP capabilities

The first production release shall contain:

1. Administrative hierarchy management
2. Individual registration
3. Institution/mosque/madrasa registration
4. Institution affiliation
5. Cascading geographic selection
6. Unique tracking codes
7. Stateful approval workflow
8. Administrative dashboard
9. Search and filtering
10. Digital membership card
11. Institutional operational certificate
12. QR-based public verification
13. Institution/member aggregation
14. Per-capita resource allocation calculation
15. Audit logging
16. Role-based access control
17. SMS-ready notification architecture
18. Responsive web interface
19. API architecture
20. Database backup and recovery
21. Basic reporting/export

---

### 3. LONG TERM SYSTEM (NON-GOALS FOR MVP)

The following should **NOT** delay the first deployment:

- full native Android/iOS applications
- Analytics AI
- complete Waqf management
- full Zakat management
- advanced accounting
- biometric authentication
- sophisticated payment wallet
- automated legal/property verification
- national identity integration before authorized APIs are available

These should be architecturally anticipated but implemented later.

---

### 4. RECOMMENDED MVP INFORMATION ARCHITECTURE

```text
PUBLIC
├── Home
├── Register
│   ├── Individual
│   └── Institution
├── Track Application
├── Verify Credential
├── Find Institution
└── Help

AUTHENTICATED MEMBER
├── Dashboard
├── My Profile
├── My Institution
├── Membership Card
├── Registration Status
└── Notifications

INSTITUTION ADMIN
├── Dashboard
├── Institution Profile
├── Members
├── License
├── Documents
├── Reports
└── Notifications

DISTRICT ADMIN
├── Dashboard
├── Registrations
├── Institutions
├── Members
├── Licensing
├── Reports
└── Audit

REGIONAL ADMIN
├── Dashboard
├── Districts
├── Institutions
├── Members
├── Reports
└── Analytics

NATIONAL ADMIN
├── National Dashboard
├── Regions
├── Institutions
├── Members
├── Licensing
├── Resource Allocation
├── Reports
├── Audit
└── System Administration
```

---

### 5. MVP USER JOURNEYS

#### Citizen

```text
Register
 ↓
Pay
 ↓
Receive tracking code
 ↓
Track application
 ↓
Approval
 ↓
Receive membership number
 ↓
View/print digital card
 ↓
Later access services
```

#### Institution

```text
Apply
 ↓
Pay
 ↓
Receive tracking code
 ↓
Administrative review
 ↓
Inspection if required
 ↓
Approval
 ↓
Digital operational certificate
 ↓
QR verification
 ↓
Become active institutional node
```

#### Administrator

```text
Login
 ↓
View jurisdiction dashboard
 ↓
Review applications
 ↓
Approve/reject
 ↓
Monitor institutions
 ↓
Monitor members
 ↓
Generate reports
```

#### National Leadership

```text
Login
 ↓
National dashboard
 ↓
View regional operations
 ↓
View institutions
 ↓
View membership
 ↓
View resource projections
 ↓
Make strategic decisions
```

---

### 6. DEFINITION OF MVP DONE

The MVP is considered production-ready only when:

- PostgreSQL schema is implemented
- Geographic hierarchy is seeded
- User authentication works
- RBAC works
- Hierarchical access control works
- Individual registration works
- Institution registration works
- Cascading location selection works
- Tracking codes are unique
- Approval workflow works
- Approval history is recorded
- Member records are created correctly
- Institution records are created correctly
- Digital membership cards work
- Institutional certificates work
- QR verification works
- Revoked credentials become invalid
- Search/filter/pagination work
- Audit logs work
- Resource allocation calculation works
- Allocation policy is configurable
- CSV/Excel export works
- Database backup works
- Security tests pass
- Critical E2E tests pass
- Production environment is configured
- Monitoring and error logging are enabled
- Administrator documentation exists
- User documentation exists

## Current MVP v2 implementation status

The current `main` branch contains the MVP v2 implementation work and the subsequent digital credential work. The latest credential changes include automatic member ID generation, automatic license certificate generation, member and institution credential profiles, configurable credential design settings, certificate review/publication workflow, and acceptance coverage for the automation and QR verification path. citeturn955file0turn956file0

The repository also contains a CI validation pipeline covering database initialization, geography import/verification, lint, typecheck, API tests, backup/restore, production build and Playwright E2E tests. citeturn945file0

**Important:** this README records the required production definition; it does not mark the entire MVP as production-ready merely because individual features exist. The implementation report records what is implemented, what has test evidence, and what remains before a production sign-off.

See [`docs/MVP-V2-IMPLEMENTATION-REPORT.md`](docs/MVP-V2-IMPLEMENTATION-REPORT.md) for the requirement-by-requirement comparison.

## Import and verification architecture

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

## Source attribution and update policy

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
npm run test:e2e
npm run ops:backup-restore
```

The security review remains a separate gate. It must not be described as passed unless its configured dependency threshold is actually satisfied.

The MVP deliberately excludes payment gateways, Fayda API integration, biometrics, native mobile apps, USSD, AI decision-making, blockchain, microservices and other post-MVP functionality listed in `PRD.md`.
