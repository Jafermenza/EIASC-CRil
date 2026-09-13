# EIASC CRil — Roadmap Progress Log

**Repository:** `Jafermenza/EIASC-CRil`  
**Master roadmap:** `Master MVP PRD, Architecture & AI Agent Milestone Roadmap v2.1.md`

## Progress policy

Every roadmap implementation commit records date, milestone, SHA, database/backend/UI impact, tests/CI evidence, remaining gaps and next action. A milestone is not complete without repository and CI evidence.

## E2E milestone-scoping rule

Playwright E2E is release-gate evidence only when it directly tests the milestone being released.

1. Each release candidate must have a dedicated `e2e/m< milestone>-*.acceptance.spec.ts` suite.
2. The suite must map directly to that milestone's roadmap acceptance criteria.
3. Reuse seeded/reference data where possible; do not create unrelated workflows just to prepare fixtures.
4. Completed-milestone tests do not block a later release unless explicitly declared a dependency.
5. Future-milestone tests never block the current release.
6. Legacy or cross-milestone suites must be split/renamed/excluded from the current release gate; this is scope correction, not bypassing a genuine current-milestone failure.
7. CI must report the milestone-scoped E2E result as release evidence.

---

## 2026-09-13 — M5 Digital Credentials & QR — COMPLETE

Release commits: `2fe5d92b1513358f50904eb6655c4ebe5c97db40`, `e5700d5ec6865b2e5755039a454596771c505e39`, `0cdabbdd4c59a84668abd4f50b0df69f47a4a3c1`, `8e7a598dc52ae51d0d761df45555524bf5b1d889`, `0d309345c974fd25fae7b7d11444cbe16b9ae2bb`.

M5 acceptance covers automatic credential numbers, public verification, QR, expiry/revocation, audit/history, configuration and valid/expired/revoked/invalid states. CI run `34749279496`, job `103702735914`, passed migration validation, seed, geography validation, lint, typecheck, unit/API tests, backup/restore, build and milestone-scoped Playwright E2E.

**M5 release gate: PASS.**

## 2026-09-13 — M6 Institutional Membership — COMPLETE

Release commits: `447e4c9b4b40a49132501d6482a93a19769ecde4`, `da3657efc4c55ea3d240f998ee011ab731abd035`, `6c074efc1421d4d5acfa7653b20a5e068cdd9486`.

M6 preserves the institutional membership lifecycle `PENDING → ACTIVE → SUSPENDED → ENDED`, institution-scoped authorization, institutional listing, persisted `endedAt`, and lifecycle audit evidence. The dedicated M6 acceptance suite uses an isolated member fixture and verifies the complete workflow. CI run `34749820789` passed after fixture remediation.

**M6 release gate: PASS. PR #13 merged to `main` as `1e724c73790c117e026afcf6a1a297ed8edde2ef`.**

## 2026-09-13 — M7 Reporting & Dashboards — COMPLETE

M7 implementation includes server-side dashboard metrics for members, institutions, applications and licenses; credential totals split by member/institution/license; active/expired/revoked credential reporting; twelve-month trends; authorized regional breakdown; period/date filtering; CSV export; API authentication/role/jurisdiction authorization; and the `/admin/reports` UI.

Dedicated suite: `e2e/m7-reporting.acceptance.spec.ts`.

The M7 E2E was made self-contained with its own E2E geography/member fixture. Future M10 security coverage was separated into `e2e/m10-security.acceptance.spec.ts` so it does not block M7.

CI run `34751874380`, job `103709685859`, passed migration validation, seed, geography validation, lint, typecheck, unit/API tests, backup/restore, production build and dedicated M7 E2E.

**M7 release gate: PASS. PR #14 merged to `main` as `e63460ef9ac17b1022de68d8c34e84fbeea5d367`.**

## 2026-09-13 — M8 Resource Allocation Engine — COMPLETE

Release branch: `release/m8-resource-allocation`. PR #15 merged to `main` as `712158b649d3c2f125bde30044a821af141aa909`.

M8 implements versioned allocation policies with draft/approved lifecycle, configurable eligibility rules for institution IDs/types/minimum active members, per-member multiplier and equalization formula, optional minimum/maximum institution bounds, eligibility derived from active institutions and active memberships/members, preview → under-review → finalized lifecycle, persisted historical policy/calculation inputs and results, audit events, authorized history/export, admin UI `/admin/allocations`, and dedicated `e2e/m8-resource-allocation.acceptance.spec.ts`.

Payment settlement remains explicitly outside M8 scope.

Remediations included lint/type/unit-fixture, E2E fixture isolation, production preview, unit mock and CSV export fixes. The schema-correct allocation field `eligibleMemberCount` is used.

**M8 release gate: PASS / merged.**

## 2026-09-13 — M9 Notifications & Services — IMPLEMENTED / GATE PENDING

Release branch: `release/m9-notifications-services`. Recorded head: `b483587ec837c7d03ce214523db151e6cb9da5f5`.

Implemented:

- Notification event catalog for registration, institution application, license, membership and credential events.
- Shared in-app, email and SMS notification service with event toggles and template resolution.
- Provider readiness/status and test email/SMS support for Resend and AfroMessage configuration.
- In-app test notification endpoint and admin notification settings UI.
- Audit-log-driven notification dispatcher with recipient resolution and duplicate protection.
- Credential-issued duplication protection because the credential service already dispatches its notification.
- Dedicated `e2e/m9-notifications.acceptance.spec.ts`.
- CI scope corrected to the dedicated M9 acceptance suite.

The implementation gate was prepared, but GitHub Actions execution was blocked by the repository's GitHub billing/spending-limit restriction. No validation run was available from that blocked execution.

**M9 release gate: NOT PASS — implementation complete, CI evidence pending. Do not mark released until the scoped CI gate runs successfully.**

## 2026-09-13 — M10 Platform Settings & Integrations — RELEASE CANDIDATE

Release branch: `release/m10-platform-settings-final`. PR #19 targets `main`.

Head SHA: `f0ee03196e44c0cba77c72a1ad5fe9e42cd71170`.

Implemented/verified:

- Platform settings and integration surface.
- Database-authoritative geography/configuration.
- Operational/request logging with request IDs, status/duration and no secret logging.
- Dependency security review gate.
- Backup/restore drill.
- Production smoke tooling.
- Authentication, horizontal-isolation and privilege-boundary security acceptance.
- Dedicated `e2e/m10-platform-settings.acceptance.spec.ts`.
- Existing `e2e/m10-security.acceptance.spec.ts` retained as dedicated M10 security evidence.
- M10 CI gate scoped to migrations, seed/geography validation, lint, typecheck, unit/API tests, security review, backup/restore, production build and both M10 acceptance suites.

PR #19 is open and must not be merged until the M10 scoped CI gate is green. At the time of this update, GitHub reports no workflow run for head SHA `f0ee03196e44c0cba77c72a1ad5fe9e42cd71170`.

**M10 release gate: NOT PASS — PR open, CI execution pending.**

## 2026-09-13 — M11 PWA / Offline / App Experience — RELEASE CANDIDATE

Release branch: `release/m11-pwa-offline`. Latest documented head: `28ce97d3998dd99dd5246b447867a96646ab63b9`.

Implemented/verified:

- Installable web app manifest with EIASC metadata, standalone display and 192/512 icons.
- Client-side service worker registration.
- Service worker activation/control and root scope.
- Safe static-asset/runtime caching while excluding API requests from service-worker caching.
- Offline navigation fallback and retry UX.
- Previously visited navigation-page caching.
- Push-event handling and notification-click routing.
- Dedicated `e2e/m11-pwa-offline.acceptance.spec.ts` covering manifest, service worker/offline behavior and 390x844 mobile overflow.
- M11-scoped CI definition covering migrations, seed/geography, lint, typecheck, unit/API, backup/restore, build and dedicated M11 E2E.

Actual CI execution was deliberately deferred while progressing through the remaining milestone implementation work.

**M11 release gate: NOT PASS — implementation/evidence prepared, CI execution and final approval pending.**

## 2026-09-13 — M12 Production Hardening / UAT / Go-Live — SECURITY RELEASE CANDIDATE

Release branch: `release/m12-production-hardening`. M12 was based on the M11 head `28ce97d3998dd99dd5246b447867a96646ab63b9` to preserve the milestone sequence.

Security hardening implemented:

- API and web security headers including `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, restrictive `Permissions-Policy`, COOP/CORP, `Cache-Control: no-store` and production HSTS.
- Production CORS fails closed when `WEB_ORIGIN` is missing.
- Request-ID input is sanitized and invalid values are replaced with UUIDs.
- Authentication endpoints under `/api/v1/auth/` are throttled to 10 attempts/minute/IP/path with `429` and `Retry-After`.
- Reverse-proxy client IP handling configured with `trust proxy`.
- High/critical dependency security review retained as a release gate.
- Backup/restore drill retained in the CI gate.
- Production smoke tooling retained.
- Dedicated `e2e/m12-production-hardening.acceptance.spec.ts` covering API security headers, authentication throttling, invalid request-ID replacement and web security headers.
- M12-scoped CI definition covering migrations, seed/geography, lint, typecheck, unit/API, security review, backup/restore, build and M12 E2E.

M12 is intentionally not considered Go-Live complete from code alone. Required remaining evidence includes actual CI execution, full production deployment verification, accessibility acceptance/UAT, deployed-environment security review, rollback/recovery drill against the production deployment, and final go-live approval.

**M12 status: SECURITY RELEASE CANDIDATE — NOT GO-LIVE.**

## Release status M5 → M12

```text
M5  Digital Credentials & QR          PASS / COMPLETE
M6  Institutional Membership          PASS / MERGED
M7  Reporting & Dashboards             PASS / MERGED
M8  Resource Allocation Engine         PASS / MERGED
M9  Notifications & Services           IMPLEMENTED / CI GATE PENDING
M10 Platform Settings & Integrations   PR #19 / CI GATE PENDING
M11 PWA / Offline / App Experience     IMPLEMENTED / CI GATE PENDING
M12 Production Hardening / Go-Live    SECURITY RC / NOT GO-LIVE
```

## Current release discipline

- Never mark a milestone complete from implementation alone.
- Do not merge M9–M12 release candidates without the required milestone-scoped CI evidence.
- Future-milestone E2E suites must not block the current milestone unless explicitly declared a dependency.
- Security, backup/restore, production verification, accessibility/UAT and recovery evidence are non-negotiable for M12 Go-Live.
- Any CI failure must be recorded with the failure cause and remediation commit before release approval.

## Next action

1. Execute/restore GitHub Actions availability for M10 PR #19.
2. Fix any genuine M10 CI failures without weakening acceptance criteria.
3. After M10 evidence is green, process M9/M11/M12 gates according to the same release discipline.
4. Complete M12 production deployment verification, accessibility/UAT, security review and rollback/recovery evidence before Go-Live.
