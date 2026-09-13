# EIASC CRil — Roadmap Progress Log

**Repository:** `Jafermenza/EIASC-CRil`  
**Master roadmap:** `Master MVP PRD, Architecture & AI Agent Milestone Roadmap v2.1.md`  
**Purpose:** Permanent engineering progress record tied to commits and validation evidence.

## Progress policy

Every implementation commit made against the master roadmap must be followed by a documentation update recording:

- date;
- milestone/workstream;
- commit SHA;
- what changed;
- database impact;
- backend impact;
- UI impact;
- tests/CI evidence;
- remaining gaps;
- next action.

A milestone is not marked complete merely because code was committed. The status is updated only after the applicable database, backend, UI and workflow tests provide evidence.

---

## 2026-09-13 — M3.5 Registration Configuration Integration

### Commit sequence

| Commit | Work | Status |
|---|---|---|
| `69c275180be47dc14087de11ca22b0ee871ebcbb` | Connect registration forms to authoritative geography, institution types, fees, payment methods and banks; make Subcity/Town and District/Woreda conditional | Implemented |
| `e096a3a49b7bb752e635fe1ff5089e7ead0839b7` | Allow institution applications without a configured district | Implemented |
| `f6fff8a3a46af8235f6cbee8e8f7edcd22c6ab62` | Align institution registration persistence with optional district | Implemented |

### Database

- Registration geography remains database-backed.
- `InstitutionApplication.districtId` is persisted as nullable when no district is configured.
- Geography hierarchy remains authoritative in PostgreSQL.
- Institution types, fees and receiving-bank configuration remain database-backed.

### Backend

- Registration validates the selected geography hierarchy server-side.
- Subcity/Town is required only when configured for the selected parent.
- District/Woreda is required only when configured for the selected parent.
- Cross-parent geography selections are rejected.
- Institution applications may be submitted without a district when the selected geography has no configured district.

### UI

- Individual registration consumes the Locations API and payment configuration.
- Institution registration consumes the Locations API and Institution Types API.
- Registration uses configured fees/payment methods/banks rather than an arbitrary hard-coded payment default.
- Geography selectors cascade from the selected parent.

### Validation

Full CI run associated with the registration release gate passed all of the following:

- database migration validation;
- seed;
- geography import;
- geography verification;
- lint;
- typecheck;
- unit/API tests;
- backup/restore drill;
- production build;
- Playwright E2E.

### Release-gate status

**M3.5 implementation gate: PASSING in CI.**

The conditional geography rule is now an explicit permanent acceptance requirement, not a temporary workaround.

### Known follow-up

The Prisma schema/client representation of the institution-application district field must remain reconciled with the nullable database migration before production migration workflows are finalized.

---

## Baseline before M3.5

Completed milestones carried forward from v2.0/v2.1:

```text
M0 Foundation                       COMPLETE
M1 Identity & Security              COMPLETE
M2 Individual Registration           IMPLEMENTED
M3 Institution Registry              IMPLEMENTED
M4 Institutional Licensing           COMPLETE
```

Previously completed work includes the M5/M6/M7/M8/M9 implementation work already present in the repository, but those areas remain subject to their current roadmap acceptance gates and are not retroactively marked production-complete without final evidence.

---

## Next planned commit stream

```text
M5 Digital Credentials & QR
  1. Verify public credential API/proxy contract
  2. Verify public verification UI
  3. Complete credential design configuration
  4. Complete regional credential configuration authorization
  5. Complete lifecycle/expiry/revocation acceptance
  6. Run CI
  7. Update this log immediately after each implementation commit

Then:
M6 Membership
M7 Reporting
M8 Allocation
M9 Notifications/SMS
M10 Platform Settings/Integrations
M11 PWA
M12 Production Hardening/UAT/Go-Live
```

## Commit documentation rule

**Do not batch unrelated milestone progress into an undocumented series.** After each substantive implementation commit, add or update this log with the exact SHA and evidence available at that point. If a commit fails CI, record the failure and remediation commit rather than marking the work complete.
