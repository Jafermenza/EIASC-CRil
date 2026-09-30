# M5–M10 Acceptance Test Record

## Scope

This record evaluates `main` against `Master MVP PRD, Architecture & AI Agent Milestone Roadmap v2.0.md`. Implementation is separated from execution evidence; a milestone is not release-complete until its tests and production evidence pass.

## Cross-cutting authentication/workspace requirement

The previously missed product requirement is implemented:

- Administrative roles → `/admin/dashboard`
- Institution administrator → `/institution`
- Member → `/member`
- Admin navigation is role-aware and privilege-limited.
- Super Admin has a real `/admin/settings` page.
- Settings exposes geography readiness, geography administration, database bootstrap instructions and a protected live Resend test.

## M5 — Digital Credentials & QR

Implemented: member/institution/license credentials, unique identifiers, SHA-256 verification-token storage, public verification, expiry/revocation, QR rendering, print support, admin issuance UI, active-subject enforcement and dedicated credential E2E.

Acceptance: [x] implementation [x] automated journey [ ] final green CI execution.

## M6 — Institutional Membership

Implemented: member-institution relationship, lifecycle status, request/list/status APIs, authorization, audit events, institution members UI and dedicated request → approve → display → end E2E.

Acceptance: [x] implementation [x] automated journey [ ] final green CI execution.

## M7 — Reporting & Dashboards

Implemented: jurisdiction-safe dashboard aggregation, registration/application metrics, membership metrics, institution metrics, licensing metrics, 12-month trends, CSV export, reporting UI and role-aware navigation.

Acceptance: [x] implementation [x] trend [x] export [x] UI [ ] final green CI/E2E execution.

## M8 — Resource Allocation Engine

Implemented: versioned policies, approval lifecycle, policy-driven formula, per-member multiplier, equalization, min/max bounds, eligibility calculation, preview/review/finalize, historical policy version, audit and role protection. Dedicated formula/equalization acceptance test exists.

Acceptance: [x] implementation [x] formula/equalization test [ ] final green CI execution.

## M9 — Notifications & Services

Implemented: persistent in-app notifications, read state, Resend email provider, delivery failure persistence, credential event notifications, provider tests and event-trigger tests.

A protected `POST /api/v1/notifications/test-email` endpoint and Super Admin Settings button now provide an actual live-provider release test. It deliberately fails when `RESEND_API_KEY`/`RESEND_FROM_EMAIL` are absent instead of falsely reporting success.

Acceptance: [x] provider implementation [x] automated provider test [x] event test [ ] live Resend delivery against production credentials [ ] complete roadmap event coverage/UAT.

## M10 — Production Hardening

Implemented/automated: health endpoint, JWT validation, token rotation, password-reset hardening, security headers/request IDs, auth rate limiting, privilege/isolation E2E, backup/restore drill, dependency security gate and manual production smoke workflow.

### Geographic production bootstrap and canonical source

The accepted geographic source is `Jafermenza/ethiopia-administrative-divisions`, pinned to commit `418739e33760bf79661f3914e2d8c9cf33248437`, using `data/hierarchy.json`. The dataset is CC-BY-4.0 and was last updated 2026-09-08.

The source's authoritative hierarchy is exactly:

```text
Ethiopia
└── Region (15)
    └── Zone (107)
        └── Woreda (1,148)
```

The source record schema defines stable IDs, level (`1=region`, `2=zone`, `3=woreda`), English/local names, slugs, parent/ancestor references, child counts, optional postal codes and WGS84 latitude/longitude coordinates.

Regional acceptance counts are:

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

The EIASC-CRil database mapping is:

- Region source records → `Region` table.
- Zone source records → `ZoneCity` table.
- Woreda source records → `District` table.
- Source IDs are persisted as the stable database `code` values.
- Canonical-source woredas have no inferred `SubcityTown` relationship.
- `SubcityTown` remains optional for a separately approved sub-city/town dataset and is not treated as a fourth level of the canonical source.

The source repository also publishes `all-region.json`, `all-zone.json`, `all-woreda.json`, `all-flat.json`, `all-flat.ndjson`, `all-flat.csv` and `schema.json`. The importer intentionally uses the nested `hierarchy.json` as the source of truth so parent/child relationships are explicit.

### Geography acceptance gates

Geography is **database reference data**, not frontend/static data. It must be loaded before public registration is exposed.

The required sequence is:

`npm run db:bootstrap`

which performs:

1. Prisma migration deployment.
2. System role/institution-type/admin seed.
3. Pinned Ethiopia geography import into PostgreSQL.
4. Source hierarchy validation.
5. Exact-count validation: 15 regions, 107 zones, 1,148 woredas.
6. Duplicate ID and missing ID/name rejection.
7. Parent-child persistence: every zone belongs to a region and every canonical woreda belongs to its source zone.
8. Geography verification before application/public exposure.

The importer records source repository, source version, source URL, status, attribution and imported counts in `GeographyImport`.

After import, registration and jurisdiction APIs read persistent PostgreSQL data through `/api/v1/locations/*`. The application does not download geography on every startup and does not require GitHub availability during registration.

### Geography acceptance checklist

- [x] Approved source repository identified.
- [x] Source commit pinned.
- [x] Canonical `Region → Zone → Woreda` hierarchy documented.
- [x] Expected totals documented: 15 / 107 / 1,148.
- [x] Regional distribution documented.
- [x] Source schema documented, including IDs, names, hierarchy and coordinates.
- [x] Database mapping documented.
- [x] Bootstrap/import command documented.
- [x] Importer validates exact source totals.
- [x] Importer rejects duplicate/missing hierarchy identifiers.
- [x] Imported hierarchy is persistent PostgreSQL reference data.
- [x] Registration consumes database geography rather than an external live source.
- [x] Source attribution and CC-BY-4.0 requirement documented.
- [x] Geography verification remains a release gate.
- [ ] Successful production bootstrap execution evidence.
- [ ] Production registration test using all required geography levels.

### Geographic source update policy

A source update is a controlled data release. Change `GEOGRAPHY_SOURCE_VERSION` and `GEOGRAPHY_SOURCE_URL` together, review the new hierarchy/schema, run import and verification, record the new source commit/counts here, and only then release the updated geography. No unreviewed external geography source may replace the pinned source.

### Acceptance

- [x] Security middleware tests
- [x] Authentication negative tests
- [x] Invalid-token test
- [x] Horizontal isolation test
- [x] Vertical privilege boundary test
- [x] Credential-token guessing negative test
- [x] Repeatable PostgreSQL backup/restore drill
- [x] Backup/restore CI gate
- [x] Production smoke workflow
- [x] Dependency security review gate
- [x] Geography bootstrap/import/verification gate
- [x] Super Admin Settings page
- [x] Live Resend verification action
- [ ] CI green after all latest changes
- [ ] Live production smoke execution
- [ ] Live Resend delivery evidence
- [ ] Production monitoring/alerting evidence
- [ ] Zero high/critical dependency findings

## Dependency security release gate

The previous CI audit reported **26 vulnerabilities: 3 low, 10 moderate, 12 high and 1 critical**. A repository workflow now runs `npm audit fix` and commits safe generated dependency/lockfile updates automatically. CI's `security:review` remains a hard gate and fails on any high/critical findings. No vulnerability is being marked “accepted” merely to make CI green.

If safe audit fixes leave high/critical findings, the next step is to upgrade the direct dependency responsible for each remaining advisory rather than using `npm audit fix --force` blindly, because force-upgrading the framework could introduce breaking runtime changes.

## Current release decision

**M5–M10 are not yet RELEASE-COMPLETE.** Code-level gaps requested in this release-gate pass are implemented. The remaining release blockers are execution/evidence gates: green CI/security audit, live Resend delivery, production smoke, monitoring evidence, zero high/critical dependency findings and the final production geography bootstrap/registration evidence.
