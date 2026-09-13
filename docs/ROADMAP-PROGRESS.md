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

M6 preserves the institutional membership lifecycle: `PENDING` → `ACTIVE` → `SUSPENDED` → `ENDED`, institution-scoped authorization, institutional listing, persisted `endedAt`, and lifecycle audit evidence. The dedicated M6 acceptance suite uses an isolated member fixture and verifies the complete workflow. CI run `34749820789` passed after the fixture remediation.

**M6 release gate: PASS. PR #13 merged to `main` as `1e724c73790c117e026afcf6a1a297ed8edde2ef`.**

## 2026-09-13 — M7 Reporting & Dashboards — COMPLETE

Release commits: `4154474e179f56b51783c3e5abb8b2df55762ef5`, `04bb7eac2426fcd0c324bdc54fc5a27e70005d10`, `67e52899c8ca3d86fb0c08aae90e14c589fa55ab`, `5fb9651b870c06aa34e797fb7c2ca064d6d46e19`, `f5dd01069939b7bc0222e5a561e60c07b48f1813`, `53cde4f82f83fa6e17d55605409d98c3647c12b9`, `757865b61e6920e428f3f32ea0ab2d3c620a2acf`, `e5c1cb95d894230f1615b2c7d719cbc817d6a72f`.

M7 delivers credential/member/institution/license metrics, active/expired/revoked credential reporting, twelve-month trends, regional breakdown, date filtering, CSV export, authorization and the dedicated `e2e/m7-reporting.acceptance.spec.ts` suite. The suite was made self-contained with an isolated member fixture so milestone-scoped execution does not depend on M5/M6 E2E side effects.

**M7 release gate: PASS. CI run `34751874380`, job `103709685859` passed migration validation, seed, geography validation, lint, typecheck, unit/API tests, backup/restore, production build and the M7 reporting acceptance suite. PR #14 merged to `main` as `e63460ef9ac17b1022de68d8c34e84fbeea5d367`.**

## 2026-09-13 — M8 Resource Allocation Engine — COMPLETE

Release branch: `release/m8-resource-allocation`. M8 delivers versioned allocation policies, configurable eligibility rules, transparent formula inputs, jurisdiction-aware preview/review/finalize workflow, historical results, audit events, authorized history/export and the dedicated `e2e/m8-resource-allocation.acceptance.spec.ts` suite. The CSV contract was corrected to emit the required unescaped header/data representation while preserving valid `text/csv` output.

**M8 release gate: PASS and merged to `main` as merge commit `712158b649d3c2f125bde30044a821af141aa909`.**

## 2026-09-13 — M9 Notifications & Services — RELEASE CANDIDATE

### Roadmap binding

M9 is limited to the v2.1 notification architecture: shared in-app/email/SMS delivery, configurable event controls and templates, AfroMessage provider adapter, operational test delivery and domain-event notification wiring. It does not introduce a second notification mechanism and does not expand into M10 platform settings/integrations beyond the notification settings page required by M9.

### Implemented scope

- Shared `NotificationsService` remains the single notification mechanism.
- Provider adapters for Resend email and AfroMessage SMS.
- Provider readiness/status without exposing provider secrets.
- In-app notification listing, unread filtering and read state.
- Super Admin event enable/disable controls persisted in `PlatformSetting`.
- Configurable notification templates with supported variables.
- Test in-app, email and SMS delivery endpoints.
- Domain audit-event dispatcher for registration, licensing, membership, credential publication and license-expiry events.
- Source audit-event metadata prevents duplicate event dispatch.
- Dedicated milestone E2E: `e2e/m9-notifications.acceptance.spec.ts`.
- CI release gate changed from M8 E2E to the current M9-scoped suite; release branches are included in CI push triggers.

### M9 gate

```text
[ ] Provider adapter
[ ] Afro SMS configuration/readiness
[ ] Enable/disable
[ ] Event toggles
[ ] Templates
[ ] Variables
[ ] Test SMS
[ ] Error/status visibility
[ ] In-app notification tests
[ ] Email notification tests
[ ] SMS event tests
[ ] End-to-end notification workflow
[ ] Typecheck
[ ] Lint
[ ] Unit/API tests
[ ] Production build
[ ] CI release gate
[ ] Final M9 approval
```

**Current status: M9 RELEASE CANDIDATE — CI VALIDATION PENDING.**

Do not start M10 until M9 passes its release gate.

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
M9 Notifications / SMS / Afro SMS   ← CURRENT RELEASE CANDIDATE
M10 Platform Settings & Integrations
M11 PWA / Offline / App Experience
M12 Production Hardening / UAT / Go-Live
```

## Commit documentation rule

Do not batch unrelated milestone progress into an undocumented series. If CI fails, record the failure and remediation commit. Never mark a milestone complete from code alone.
