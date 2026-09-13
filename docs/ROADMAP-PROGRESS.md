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
Release commits: `4154474e179f56b51783c3e5abb8b2df55762ef5`, `04bb7eac2426fcd0c324bdc54fc5a27e70005d10`, `67e52899c8ca3d86fb0c08aae90e14c589fa55ab`, `5fb9651b870c06aa34e797fb7c2ca064d6d46e19`, `f5dd01069939b7bc0222e5a561e60c07b48f1813`, `53cde4f82f83fa6e17d5560549d98c3647c12b9`, `757865b61e6920e428f3f32ea0ab2d3c620a2acf`, `e5c1cb95d894230f1615b2c7d719cbc817d6a72f`.

M7 delivers credential/member/institution/license metrics, active/expired/revoked credential reporting, twelve-month trends, regional breakdown, date filtering, CSV export, authorization and the dedicated `e2e/m7-reporting.acceptance.spec.ts` suite. The suite is self-contained with an isolated member fixture so milestone-scoped execution does not depend on M5/M6 E2E side effects.

**M7 release gate: PASS. CI run `34751874380`, job `103709685859` passed migration validation, seed, geography validation, lint, typecheck, unit/API tests, backup/restore, production build and the M7 reporting acceptance suite. PR #14 merged to `main` as `e63460ef9ac17b1022de68d8c34e84fbeea5d367`.**

## 2026-09-13 — M8 Resource Allocation Engine — COMPLETE

Release branch `release/m8-resource-allocation`, PR #15. Head `31ad8c52cb6cddc0b937bb3e72405bb21b307e7c`; merge commit `712158b649d3c2f125bde30044a821af141aa909`.

M8 implements policy-driven theoretical resource allocation: versioned draft/approved policies, configurable eligibility rules, transparent formula inputs, preview → under-review → finalized lifecycle, persisted historical inputs/results, audit events, authorized history/export, admin UI at `/admin/allocations`, and dedicated `e2e/m8-resource-allocation.acceptance.spec.ts`. Payment settlement remains out of scope.

The release stream included the required remediation for lint, unit fixtures, self-contained M8 E2E provisioning, application-side allocation aggregation, and CSV export formatting.

**M8 release gate: PASS / MERGED. PR #15 merged to `main` on 2026-09-13 as `712158b649d3c2f125bde30044a821af141aa909`.**

## 2026-09-13 — M9 Notifications & Services — IMPLEMENTED / RELEASE GATE BLOCKED

PR #16: `Release M9: Notifications & Services`. Branch `release/m9-notifications-services`. Current head `b483587ec837c7d03ce214523db151e6cb9da5f5`.

Implemented:
- Shared in-app/email/SMS notification architecture.
- Resend email adapter and AfroMessage SMS adapter with provider readiness/status that does not expose secrets.
- Configurable notification event toggles and templates with supported variables.
- Test delivery endpoints for in-app, email and SMS.
- Audit-event dispatcher for registration, licensing, membership, credential publication and license expiry events.
- Duplicate dispatch protection using source audit-log metadata.
- Dedicated `e2e/m9-notifications.acceptance.spec.ts`.
- CI gate was scoped to M9 rather than unrelated M8/future suites.

### M9 validation

CI run `34757267536`, job `103729764519`, was blocked before validation steps because GitHub Actions reported an account-level billing/spending-limit/runner availability block. This is **not evidence of a code/test failure**. A real runner execution remains required before release approval.

**M9 release gate: BLOCKED. Not merged / not released.**

## 2026-09-13 — M10 Platform Settings & Integrations — REVISED RELEASE CANDIDATE

PR #19: `Release M10: Platform Settings & Integrations`. Branch `release/m10-platform-settings-final`. Head `f0ee03196e44c0cba77c72a1ad5fe9e42cd71170`. Base `main`.

Revised M10 scope includes:

- Platform settings and integration surface.
- Database-authoritative geography/configuration.
- Structured operational/request logging without secrets.
- Dependency security review gate.
- Backup/restore drill.
- Production smoke tooling.
- Authentication, horizontal-isolation and privilege-boundary security acceptance.
- Dedicated `e2e/m10-platform-settings.acceptance.spec.ts`.
- Dedicated `e2e/m10-security.acceptance.spec.ts`.
- M10-scoped CI including migration validation, seed/geography validation, lint, typecheck, unit/API tests, security review, backup/restore, production build and both M10 acceptance suites.
- Release-gate documentation in `docs/M10-RELEASE-GATE.md` and `docs/M10-CI-GATE.md`.

### M10 validation

The PR is open and is not merged. At the latest check, GitHub returned **no workflow run for head `f0ee03196e44c0cba77c72a1ad5fe9e42cd71170`**, so CI execution has not yet been evidenced.

**M10 release gate: PENDING CI. Not released.**

## 2026-09-13 — M11 PWA / Offline / App Experience — RELEASE CANDIDATE

Branch `release/m11-pwa-offline`. Latest recorded implementation/docs head before M12: `28ce97d3998dd99dd5246b447867a96646ab63b9`.

Implemented:
- Installable web app manifest with EIASC metadata and 192/512 icons.
- Service worker registration, activation, controller and root scope.
- Safe runtime caching of previously visited navigation pages and Next static assets.
- API requests excluded from service-worker caching.
- Offline fallback UX with retry and previously visited-page support.
- Push-event handling and notification-click routing.
- Responsive/mobile-first acceptance coverage.
- Dedicated `e2e/m11-pwa-offline.acceptance.spec.ts`.
- M11-scoped CI definition covering migrations, seed/geography, lint, typecheck, unit/API, backup/restore, build and M11 E2E.

### M11 gate checklist

```text
[done] Installable web app manifest
[done] Service worker
[done] Safe static-asset caching
[done] Offline/fallback experience
[done] Installability metadata/icons
[done] Responsive/mobile-first gate coverage
[done] Dedicated M11 acceptance suite
[done] M11-scoped CI workflow definition
[pending] Actual CI execution
[pending] Final release approval/merge
```

CI execution was deliberately deferred while progressing through later milestone implementation. Therefore M11 is **not marked released**.

## 2026-09-13 — M12 Production Hardening / UAT / Go-Live — SECURITY RELEASE CANDIDATE

Branch `release/m12-production-hardening`. Based on M11 head `28ce97d3998dd99dd5246b447867a96646ab63b9`. M12 PR #18 targets `release/m11-pwa-offline`; head `0759abf8e3b263fb0ea1fa9d0bb6b7d0cd32e1d0`.

### Security hardening implemented

- API security headers: `X-Content-Type-Options`, `X-Frame-Options`, restrictive `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, `Cache-Control: no-store`, and production HSTS.
- Web security headers and production HSTS in Next.js configuration.
- Production CORS fails closed when `WEB_ORIGIN` is missing.
- Request-ID input validation/sanitization with safe replacement for invalid values.
- Authentication endpoint throttling: 10 attempts/minute/IP/path with `429` and `Retry-After`.
- Reverse-proxy client IP handling.
- Existing high/critical dependency security review retained.
- Backup/restore drill retained in the release gate.
- Production smoke tooling retained.
- Dedicated `e2e/m12-production-hardening.acceptance.spec.ts` for API/web headers, auth throttling and request-ID hardening.
- M12-scoped CI definition covering migrations, seed/geography, lint, typecheck, unit/API tests, security review, backup/restore, build and M12 E2E.
## 2026-09-13 — M12 Production Hardening & Go-Live — SECURITY RELEASE CANDIDATE

M12 is being treated as a hard release gate. No production approval is implied by implementation alone. The roadmap explicitly requires automated/manual evidence before production, including security testing, backup/restore, production deployment testing, accessibility and UAT. fileciteturn553file0L8-L34

### Implemented hardening

- API security headers: `nosniff`, frame denial, strict referrer policy, restrictive permissions policy, cross-origin isolation headers and production HSTS.
- Web security headers applied globally, including production HSTS.
- Production API CORS now fails closed when `WEB_ORIGIN` is absent instead of starting permissively.
- Request IDs are accepted only when bounded to a safe character/length pattern; invalid values are replaced with a generated UUID.
- Authentication endpoints retain a bounded rate limit with `Retry-After` response handling.
- API responses from the security middleware are marked `no-store` to reduce accidental caching of authenticated/error responses.
- Express proxy trust is explicitly configured for the deployment reverse-proxy topology so authentication throttling can use the originating client address.
- Existing dependency audit gate remains mandatory through `npm run security:review`, blocking high/critical dependency vulnerabilities.
- Existing production smoke test and backup/restore drill remain part of the operational gate.

### M12 release-gate evidence added

- Dedicated `e2e/m12-production-hardening.acceptance.spec.ts` covering API security headers, authentication throttling, request-ID sanitization and web security headers.
- CI is scoped to M12 acceptance while retaining migration validation, seed/geography validation, lint, typecheck, unit/API tests, dependency security review, backup/restore and production build.
- Branch: `release/m12-production-hardening`.

### M12 checklist status

```text
[done] Production security headers
[done] Production CORS fail-closed configuration
[done] Authentication throttling gate
[done] Request-ID input hardening
[done] High/critical dependency audit gate
[done] Backup/restore drill remains in CI gate
[done] Production smoke tooling available
[done] Dedicated M12 security acceptance suite
[done] M12-scoped CI definition
[pending] CI execution
[pending] Full production deployment verification
[pending] Accessibility acceptance/UAT
[pending] Security review of deployed environment
[pending] Rollback/recovery drill against production deployment
[pending] Final go-live approval
```

**M12 status: SECURITY RELEASE CANDIDATE — hardening implemented, but NOT PASS / NOT GO-LIVE until CI, deployed-environment verification, UAT/accessibility, security review and recovery evidence are completed.**

## Final M9/M10/M11/M12 truth record

| Milestone | Implementation | Release-gate evidence | Release status |
|---|---|---|---|
| M9 Notifications & Services | Implemented | CI deferred/not executed to completion | **NOT PASS** |
| M10 Platform Settings & Integrations | Implementation/gap-closure present | CI deferred/not executed to completion | **NOT PASS** |
| M11 PWA / Offline / App Experience | Implemented + dedicated acceptance/CI gate prepared | CI deferred/not executed | **NOT PASS** |
| M12 Production Hardening & Go-Live | Security hardening + dedicated gate implemented | CI/deployed-UAT/recovery evidence pending | **NOT PASS** |

This record intentionally distinguishes **code implemented** from **milestone passed**. No milestone is marked complete without the required evidence.

### M12 gate checklist

```text
[done] Production security headers
[done] Production CORS fail-closed configuration
[done] Authentication throttling gate
[done] Request-ID input hardening
[done] High/critical dependency audit gate
[done] Backup/restore drill remains in CI gate
[done] Production smoke tooling available
[done] Dedicated M12 security acceptance suite
[done] M12-scoped CI definition
[pending] CI execution
[pending] Full production deployment verification
[pending] Accessibility acceptance/UAT
[pending] Security review of deployed environment
[pending] Rollback/recovery drill against production deployment
[pending] Final go-live approval
```

**M12 status: SECURITY RELEASE CANDIDATE — NOT GO-LIVE.** Security hardening is implemented, but no milestone is released without the required CI and production/UAT evidence.

## Current release position

```text
M0 Foundation                       COMPLETE
M1 Identity & Security              COMPLETE
M2 Individual Registration          IMPLEMENTED
M3 Institution Registry             IMPLEMENTED
M3.5 Registration Configuration     PASSING
M4 Institutional Licensing          COMPLETE
M5 Digital Credentials & QR         COMPLETE
M6 Institutional Membership         COMPLETE
M7 Reporting & Dashboards           COMPLETE
M8 Resource Allocation Engine       COMPLETE
M9 Notifications / SMS / Afro SMS   ← GATE BLOCKED
M10 Platform Settings & Integrations← CI PENDING
M11 PWA / Offline / App Experience  ← CI PENDING
M12 Production Hardening / UAT      ← SECURITY RC / GO-LIVE PENDING
```

## Commit documentation rule

Do not batch unrelated milestone progress into an undocumented series. If CI fails, record the failure and remediation commit. Never mark a milestone complete from code alone.
