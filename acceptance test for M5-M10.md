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

### Geographic production bootstrap

Geography is **database reference data**, not frontend/static data. The repository contains the pinned Ethiopia hierarchy importer and verification scripts. The correct pre-public-port sequence is:

`npm run db:bootstrap`

This performs:

1. Prisma migration deployment.
2. System role/institution-type/admin seed.
3. Pinned Ethiopia geography import into PostgreSQL.
4. Geography verification: 15 regions, 107 zones and 1,148 districts/woredas, with no orphan districts.
5. Only after this succeeds should the API/web process be exposed publicly.

The source/version is pinned through `GEOGRAPHY_SOURCE_URL` and `GEOGRAPHY_SOURCE_VERSION`; the imported hierarchy becomes persistent PostgreSQL data and is then served by `/api/v1/locations/*` to registration forms. Geography is not downloaded on every application startup.

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

**M5–M10 are not yet RELEASE-COMPLETE.** Code-level gaps requested in this release-gate pass are implemented. The remaining release blockers are execution/evidence gates: green CI/security audit, live Resend delivery, production smoke, monitoring evidence and zero high/critical dependency findings.
