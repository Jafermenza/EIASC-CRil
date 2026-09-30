# EIASC CRil — Roadmap Progress Log

**Repository:** `EIASC-CRil`  
**Master roadmap:** `Master MVP PRD, Architecture & AI Agent Milestone Roadmap v2.1.md`  
**Purpose:** Permanent engineering progress record tied to commits and validation evidence.
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

## 2026-09-13 — Roadmap v2.1 reconciliation and M9-M12 integration on `main`

The roadmap's opening status and execution-priority sections still describe the pre-integration work order. The current repository state supersedes those labels:

- M3.5 registration configuration integration passed its CI gate.
- M5 through M8 passed their milestone-scoped release gates.
- M9 through M12 release branches are merged into `main` and their isolated local acceptance suites pass.
- M9 through M12 remain unreleased until the corresponding milestone-scoped GitHub CI, production verification, UAT/accessibility and recovery evidence is available.

The successful `main` CI runs `34764744913` and `34764744789` validate the documentation-upload commit only; they are not M9-M12 release-gate evidence.

**Current next action:** run the integrated M9-M12 CI workflow on the merged `main` head, record each scoped result, then complete the remaining M12 production/UAT and go-live evidence. No milestone is promoted from local implementation or local E2E results alone.

---

## 2026-09-13 — M9-M12 release branches integrated into `main`

Integrated the fork release branches in milestone order with merge commits:

- M9 `upstream/release/m9-notifications-services` -> `6d1b617`
- M10 `upstream/release/m10-platform-settings-final` -> `755afb2`
- M11 `upstream/release/m11-pwa-offline` -> `f1b31c9`
- M12 `upstream/release/m12-production-hardening` -> `25c5575`

The integrated CI workflow now runs the dedicated M9, M10 platform/security, M11 and M12 acceptance suites. Integration fixes were required for the Nest Express proxy configuration, nullable audit entity IDs, placeholder Resend readiness, the M10 notifications settings route, and the dispatcher Jest test import.

### Local acceptance evidence

The isolated release-gate runs passed against the merged `main` tree:

```text
M9 notifications                         1 passed
M10 settings + security                  4 passed
M11 PWA / offline                        3 passed
M12 production hardening                 4 passed
API unit tests                            52 passed
Typecheck                                 PASS
Production build                          PASS
Lint                                      PASS with existing any warnings
```

The all-suites-in-one Playwright invocation is intentionally not the release-gate command: M12's deliberate 11-request throttling test leaves the shared in-memory limiter active for a later M9 login when all files run in alphabetical order. The CI workflow isolates milestone suites in separate Playwright processes.

Local setup also exposed a bootstrap-script defect: `db:bootstrap` deploys migrations and then redundantly reapplies migration SQL. Migration deployment, seed, geography import and geography verification were completed separately; geography verification passed with 15 regions, 107 zones, 1,148 districts and zero orphan districts.

**Release status remains pending milestone-scoped CI and production evidence.** These local results validate the merged implementation and acceptance suites but do not promote M9-M12 to released status.

---

## 2026-09-13 — M3.5 Registration Configuration Integration

Commits: `69c275180be47dc14087de11ca22b0ee871ebcbb`, `e096a3a49b7bb752e635fe1ff5089e7ead0839b7`, `f6fff8a3a46af8235f6cbee8e8f7edcd22c6ab62`.

**Gate: PASSING in CI.** Registration uses authoritative PostgreSQL geography, institution types, fees, payment methods and banks; conditional geography is enforced server-side.

### Release-gate status

**M3.5 implementation gate: PASSING in CI.**

The conditional geography rule is now a permanent acceptance requirement, not a temporary workaround.

### Known follow-up

The Prisma schema/client representation of the institution-application district field must remain reconciled with the nullable database migration before production migration workflows are finalized.

---

## 2026-09-13 — M5 Digital Credentials & QR — Release Candidate
M6 preserves the institutional membership lifecycle `PENDING → ACTIVE → SUSPENDED → ENDED`, institution-scoped authorization, institutional listing, persisted `endedAt`, and lifecycle audit evidence. The dedicated M6 acceptance suite uses an isolated member fixture and verifies the complete workflow. CI run `34749820789` passed after fixture remediation.

### Roadmap binding

The v2.1 roadmap defines M5 as the next release after the M3.5 registration gate. This branch is the controlled M5 release-candidate stream. Existing M5 implementation was inspected before changes; completed functionality was preserved.

### Existing implementation verified in repository

- Member, institution and license credential types exist.
- Credential numbers are generated automatically.
- Public verification API accepts credential number or verification token.
- Public verification UI renders the actual API result and a QR verification representation.
- Credential publication/review, history and audit records exist.
- Revocation and expiry state handling exist.
- Credential design configuration supports global and regional configuration with server-side role/jurisdiction checks.

### Release-candidate commits

| Commit | Work | Status |
|---|---|---|
| `2fe5d92b1513358f50904eb6655c4ebe5c97db40` | Add M5 public verification acceptance coverage for valid, expired, revoked and invalid credentials | Implemented |
| `e5700d5ec6865b2e5755039a454596771c505e39` | Make M5 verification fixtures unique and deterministic enough for CI | Implemented |
| `0cdabbdd4c59a84668abd4f50b0df69f47a4a3c1` | Enforce configured credential validity at the database boundary, including regional configuration fallback to global configuration | Implemented |
| `8e7a598dc52ae51d0d761df45555524bf5b1d889` | Assert newly generated credentials receive configured expiry and cover all public verification states | Implemented |
| `694614ddfd1ecb69632ddf5f055fca6d249f998c` | Replace fixture-creation M5 E2E with focused public verification-state coverage using an existing seeded credential and state restoration | Implemented |
| `f4c0a659c9c336a0e716306af357c1c113285200` | Retire legacy credential automation acceptance scenario from the M5 release gate | Implemented |
| `90371ddd5699dad6446661db1476edfd870465bd` | Retire already-complete M4 licensing E2E from the M5 release gate | Implemented |
| `13c5ba41b86ce915ea88f3564aae700d4bcdbce4` | Retire mixed M5/M6 E2E so M6 membership is not included in the M5 release gate | Implemented |
| `184d92715b248e28bd6c7376f83a7389f026957e` | Stabilize PostgreSQL M5 credential triggers by copying trigger records to local variables before SQL references | Implemented |

### M5 E2E release-gate scope

The M5 gate is now intentionally limited to behavior delivered by M5. Completed M4 licensing and future M6 membership workflows are not release blockers for M5. The focused M5 E2E verifies the public credential contract: valid, expired, revoked and invalid credentials. The fixture is read from the existing CI seed and its credential state is restored after the test.

### M5 database rule

Credential expiry is enforced at the PostgreSQL boundary rather than relying only on UI or a single issuance code path.

For a newly inserted credential:

```text
regional configuration for subject region
        ↓ if absent
global/default configuration
        ↓
validityYears
        ↓
Credential.expiresAt
```

Existing credentials with a null expiry are backfilled by the migration using the same regional → default fallback.

### M5 acceptance coverage

```text
[✓] Automatic credential number exists
[✓] Public verification endpoint exists
[✓] Public verification UI exists
[✓] QR verification representation exists
[✓] Credential history/audit exists
[✓] Regional/global credential configuration exists
[✓] Valid credential verification covered
[✓] Expired credential verification covered
[✓] Revoked credential verification covered
[✓] Invalid credential verification covered
[✓] Configured validity produces Credential.expiresAt
[✓] Legacy M4/M6 E2E removed from M5 gate
[✓] M5 E2E fixture no longer creates unrelated Member records
[ ] CI typecheck/lint/tests/build/E2E for this release candidate
[ ] Final M5 release-gate approval
```

### Current M5 status

**RELEASE CANDIDATE — CI VALIDATION PENDING.**

M5 must not be marked complete until CI proves the migration, typecheck, lint, API/unit tests, production build and focused Playwright acceptance suite all pass.

### Next action

Run the M5 release-candidate CI. If CI fails, fix only the failing gate, record the remediation commit here, and rerun CI. If all gates pass, mark M5 complete and open the M6 Institutional Membership release stream.
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

The previous CI run `34757267536`, job `103729764519`, was blocked before validation steps because GitHub Actions reported an account-level billing/spending-limit/runner availability block. The isolated local M9 gate passed (`1` test), but a real milestone-scoped runner execution remains required before release approval.

**M9 release gate: IMPLEMENTED / LOCAL ACCEPTANCE PASS / CI PENDING. Merged into `main`; not released.**

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

The release branch is merged into `main` as `755afb2`. The isolated local M10 settings/security gate passed (`4` tests), but no milestone-scoped GitHub CI result has been recorded for the integrated head.

**M10 release gate: IMPLEMENTED / LOCAL ACCEPTANCE PASS / CI PENDING. Not released.**

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
[done] Local acceptance execution
[done] Release branch merged into `main`
[pending] Milestone-scoped GitHub CI execution
[pending] Final release approval
```

The isolated local M11 gate passed (`3` tests). CI execution and final release approval remain pending, so M11 is **not marked released**.

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

Local M12 readiness evidence: `db:bootstrap` passes migrations, seed and canonical geography verification; root lint, dependency security review, typecheck, 52 API tests and production build pass; the equivalent containerized backup/restore drill passes; and local production smoke passes web `200`, login `200` and API health `200`. These results are local evidence only and do not replace GitHub CI or deployed-environment evidence.
### M12 final evidence summary

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
[done] Local backup/restore drill
[done] Local production smoke: web, login and API health
[done] Dedicated M12 security acceptance suite
[done] M12-scoped CI definition
[done] Local CI-equivalent execution: lint, typecheck, unit/API, build and scoped E2E
[pending] Milestone-scoped GitHub CI execution on the integrated main head
[pending] Full production deployment verification against the real target environment
[done] Local responsive/mobile acceptance smoke
[pending] Accessibility acceptance/UAT with EIASC operational users
[pending] Security review of the deployed environment
[done] Local rollback/recovery procedure validated against a restored database
[pending] Rollback/recovery drill against the production deployment
[pending] Final go-live approval
```

Previously completed work includes implementation work for later areas already present in the repository, but those areas remain subject to their current roadmap acceptance gates and are not retroactively marked production-complete without final evidence.
**M12 status: LOCAL READINESS PASS / NOT GO-LIVE — hardening and local gates pass, but milestone-scoped CI, deployed-environment verification, UAT/accessibility, security review and recovery evidence remain required.**

## Final M9/M10/M11/M12 truth record

| Milestone | Implementation | Release-gate evidence | Release status |
|---|---|---|---|
| M9 Notifications & Services | Implemented + local acceptance pass | Milestone-scoped CI pending | **NOT RELEASED** |
| M10 Platform Settings & Integrations | Implemented + local acceptance pass | Milestone-scoped CI pending | **NOT RELEASED** |
| M11 PWA / Offline / App Experience | Implemented + local acceptance pass | Milestone-scoped CI pending | **NOT RELEASED** |
| M12 Production Hardening & Go-Live | Security hardening + local acceptance pass | CI/deployed-UAT/recovery evidence pending | **NOT RELEASED** |

## Next planned release order

```text
M5 Digital Credentials & QR         ← CURRENT RELEASE CANDIDATE
M6 Institutional Membership         ← NEXT after M5 gate passes
M7 Reporting & Dashboards
M8 Resource Allocation Engine
M9 Notifications / SMS / Afro SMS
M10 Platform Settings & Integrations
M11 PWA / Offline / App Experience
M12 Production Hardening / UAT / Go-Live
This record intentionally distinguishes **code implemented** from **milestone passed**. No milestone is marked complete without the required evidence.

### M12 gate checklist

```text
[done] Production security headers
[done] Production CORS fail-closed configuration
[done] Authentication throttling gate
[done] Request-ID input hardening
[done] High/critical dependency audit gate
[done] Local backup/restore drill
[done] Local production smoke: web, login and API health
[done] Dedicated M12 security acceptance suite
[done] M12-scoped CI definition
[done] Local CI-equivalent execution: lint, typecheck, unit/API, build and scoped E2E
[pending] Milestone-scoped GitHub CI execution on the integrated main head
[pending] Full production deployment verification against the real target environment
[done] Local responsive/mobile acceptance smoke
[pending] Accessibility acceptance/UAT with EIASC operational users
[pending] Security review of deployed environment
[done] Local rollback/recovery procedure validated against a restored database
[pending] Rollback/recovery drill against the production deployment
[pending] Final go-live approval


**M12 status: LOCAL READINESS PASS / NOT GO-LIVE.** No milestone is released without the required CI and production/UAT evidence.

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
M9 Notifications / SMS / Afro SMS   ← LOCAL PASS / CI PENDING
M10 Platform Settings & Integrations← LOCAL PASS / CI PENDING
M11 PWA / Offline / App Experience  ← LOCAL PASS / CI PENDING
M12 Production Hardening / UAT      ← LOCAL READINESS PASS / GO-LIVE PENDING
```

## Commit documentation rule

Do not batch unrelated milestone progress into an undocumented series. If CI fails, record the failure and remediation commit. Never mark a milestone complete from code alone.
