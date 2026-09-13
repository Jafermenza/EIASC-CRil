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

## 2026-09-13 — M7 Reporting & Dashboards — RELEASE CANDIDATE

### Roadmap binding

M7 is the next v2.1 release after M6. The release is scoped to trustworthy operational and governance reporting and does not start M8 allocation work.

### Implemented scope

- Server-side dashboard metrics for members, institutions, applications and licenses.
- Credential issued totals split into member, institution and license credentials.
- Active, expired and revoked credential reporting.
- Twelve-month activity and credential issuance trends.
- Regional breakdown for authorized reporting scope.
- Period/date filtering on report metrics.
- CSV export using the same server-side report data.
- Authentication, role and jurisdiction authorization enforced by the API.
- Existing `/admin/reports` UI expanded to expose the M7 reporting data.

### M7 acceptance E2E

Dedicated suite: `e2e/m7-reporting.acceptance.spec.ts`.

It verifies credential reporting metrics, twelve-month trends, regional breakdown, date filtering, authorized reporting UI and CSV export.

### M7 gate

```text
[ ] Credential/member/institution/license reporting
[ ] Active/expired/revoked reporting
[ ] Twelve-month trend
[ ] Regional breakdown
[ ] Period/date filtering
[ ] Authorization/jurisdiction boundaries
[ ] CSV export
[ ] M7 acceptance E2E
[ ] Typecheck
[ ] Lint
[ ] Unit/API tests
[ ] Production build
[ ] CI release gate
[ ] Final M7 approval
```

**Current status: M7 RELEASE CANDIDATE — CI VALIDATION PENDING.**

Do not start M8 until M7 passes its release gate.

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
M7 Reporting & Dashboards           ← CURRENT RELEASE CANDIDATE
M8 Resource Allocation Engine
M9 Notifications / SMS / Afro SMS
M10 Platform Settings & Integrations
M11 PWA / Offline / App Experience
M12 Production Hardening / UAT / Go-Live
```

## Commit documentation rule

Do not batch unrelated milestone progress into an undocumented series. If CI fails, record the failure and remediation commit. Never mark a milestone complete from code alone.
