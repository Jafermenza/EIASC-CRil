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

## 2026-09-13 — M3.5 Registration Configuration Integration

Commits: `69c275180be47dc14087de11ca22b0ee871ebcbb`, `e096a3a49b7bb752e635fe1ff5089e7ead0839b7`, `f6fff8a3a46af8235f6cbee8e8f7edcd22c6ab62`.

**Gate: PASSING in CI.** Registration uses authoritative PostgreSQL geography, institution types, fees, payment methods and banks; conditional geography is enforced server-side.

## 2026-09-13 — M5 Digital Credentials & QR — COMPLETE

Release commits: `2fe5d92b1513358f50904eb6655c4ebe5c97db40`, `e5700d5ec6865b2e5755039a454596771c505e39`, `0cdabbdd4c59a84668abd4f50b0df69f47a4a3c1`, `8e7a598dc52ae51d0d761df45555524bf5b1d889`, `0d309345c974fd25fae7b7d11444cbe16b9ae2bb`.

M5 acceptance covers automatic credential numbers, public verification, QR, expiry/revocation, audit/history, configuration and valid/expired/revoked/invalid states. CI run `34749279496`, job `103702735914`, passed migration validation, seed, geography validation, lint, typecheck, unit/API tests, backup/restore, build and milestone-scoped Playwright E2E.

**M5 release gate: PASS.**

## 2026-09-13 — M6 Institutional Membership — COMPLETE

Release commits: `447e4c9b4b40a49132501d6482a93a19769ecde4`, `da3657efc4c55ea3d240f998ee011ab731abd035`, `6c074efc1421d4d5acfa7653b20a5e068cdd9486`.

M6 preserves the institutional membership lifecycle: `PENDING` → `ACTIVE` → `SUSPENDED` → `ENDED`, institution-scoped authorization, institutional listing, persisted `endedAt`, and lifecycle audit evidence. The dedicated M6 acceptance suite uses an isolated member fixture and verifies the complete workflow. CI run `34749820789` passed after fixture remediation.

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

## 2026-09-13 — M9 Notifications & Services — IMPLEMENTED / GATE DEFERRED

PR #16: `Release M9: Notifications & Services`. Branch `release/m9-notifications-services`. Current recorded head `b483587ec837c7d03ce214523db151e6cb9da5f5`.

Implemented:
- Shared in-app/email/SMS notification architecture.
- Resend email adapter and AfroMessage SMS adapter with provider readiness/status that does not expose secrets.
- Configurable notification event toggles and templates with supported variables.
- Test delivery endpoints for in-app, email and SMS.
- Audit-event dispatcher for registration, licensing, membership, credential publication and license expiry events.
- Duplicate dispatch protection using source audit-log metadata.
- Dedicated `e2e/m9-notifications.acceptance.spec.ts`.
- CI gate was scoped to M9 rather than unrelated M8/future suites.

The release-gate CI job was previously blocked before executing any validation steps by the GitHub Actions account billing/spending-limit condition. A rerun was queued as job `103732193278`, but CI execution is deliberately deferred by release decision. Therefore repository implementation is recorded, but **M9 is not release-gate PASS**.

**M9 status: IMPLEMENTED; CI RELEASE GATE DEFERRED.**

## 2026-09-13 — M10 Platform Settings & Integrations — IMPLEMENTATION PRESENT / GATE DEFERRED

M10 implementation/gap-closure work already present on `main` includes:
- structured operational/request logging with request ID, status and duration while avoiding secrets;
- dependency security review gate via `scripts/security-review.mjs`;
- backup/restore drill support;
- production smoke tooling targeting public web, login and API health;
- dedicated `e2e/m10-security.acceptance.spec.ts` with authentication, horizontal-isolation and privilege-boundary checks;
- production settings/geography/live-email documentation and prior M10 remediation commits.

The current main CI workflow had still been running the M8 acceptance suite at the time of this record, so no M10-specific CI result exists yet. Per the release decision, CI is deliberately deferred rather than represented as a pass.

**M10 status: IMPLEMENTATION PRESENT; CI RELEASE GATE DEFERRED. NOT RELEASED.**

## 2026-09-13 — M11 PWA / Offline / App Experience — RELEASE CANDIDATE

M11 was matched to the existing PWA implementation rather than rewritten unnecessarily.

Verified repository implementation:
- Next.js web manifest with install metadata, `standalone` display mode, portrait orientation and 192px/512px icons.
- Client-side service-worker registration from the root layout.
- Service worker activation/control and root scope.
- Offline navigation fallback at `/offline`.
- Runtime caching of previously visited navigation pages and Next.js static assets.
- API requests are deliberately excluded from service-worker caching, protecting live/authenticated API data from stale responses.
- Push-event handling and notification click routing are present for future Web Push delivery.
- Existing offline UX explains that previously visited pages may remain available and provides a retry action.

Added M11 release-gate evidence:
- `e2e/m11-pwa-offline.acceptance.spec.ts` covering manifest metadata/installability, service-worker registration/control, offline fallback and 390px mobile-width no-horizontal-overflow behavior.
- CI workflow on the M11 release branch is scoped to the M11 acceptance suite while retaining migration, seed/geography, lint, typecheck, unit/API, backup/restore and production build gates.
- Branch: `release/m11-pwa-offline`.
- PR #17: `Release M11: PWA / Offline / App Experience`.
- Current head: `90c8749810e8b7f4e7444a226c40f6df6ba7bb01`.

### M11 roadmap checklist status

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

**M11 status: RELEASE CANDIDATE — implementation/evidence prepared; CI deliberately deferred. Not release-gate PASS until CI executes.**

## Final M9/M10/M11 truth record

The repository currently supports the following accurate interpretation:

| Milestone | Implementation | Release-gate CI | Release status |
|---|---|---|---|
| M9 Notifications & Services | Implemented | Deferred/not executed to completion | **NOT PASS** |
| M10 Platform Settings & Integrations | Implementation/gap-closure present | Deferred/not executed to completion | **NOT PASS** |
| M11 PWA / Offline / App Experience | Implemented + dedicated acceptance/CI gate prepared | Deferred/not executed | **NOT PASS** |

This record intentionally distinguishes **code implemented** from **milestone passed**. No M9, M10 or M11 milestone is marked complete without the required CI/release evidence.

## Planned release order

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
M9 Notifications / SMS / Afro SMS   IMPLEMENTED — CI DEFERRED
M10 Platform Settings & Integrations IMPLEMENTATION PRESENT — CI DEFERRED
M11 PWA / Offline / App Experience  RELEASE CANDIDATE — CI DEFERRED
M12 Production Hardening / UAT / Go-Live
```

## Commit documentation rule

Do not batch unrelated milestone progress into an undocumented series. If CI fails, record the failure and remediation commit. Never mark a milestone complete from code alone.
