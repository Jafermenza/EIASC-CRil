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

### Release-gate status

**M3.5 implementation gate: PASSING in CI.**

The conditional geography rule is now a permanent acceptance requirement, not a temporary workaround.

### Known follow-up

The Prisma schema/client representation of the institution-application district field must remain reconciled with the nullable database migration before production migration workflows are finalized.

---

## 2026-09-13 — M5 Digital Credentials & QR — Release Candidate

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

### M5 database rule

Credential expiry is now enforced at the PostgreSQL boundary rather than relying only on UI or a single issuance code path.

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

### M5 acceptance coverage added

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
[ ] CI typecheck/lint/tests/build/E2E for this release candidate
[ ] Final M5 release-gate approval
```

### Current M5 status

**RELEASE CANDIDATE — CI VALIDATION PENDING.**

M5 must not be marked complete until CI proves the migration, typecheck, lint, API/unit tests, production build and Playwright acceptance suite all pass.

### Next action

Run the M5 release-candidate CI. If CI fails, fix only the failing gate, record the remediation commit here, and rerun CI. If all gates pass, mark M5 complete and open the M6 Institutional Membership release stream.

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

Previously completed work includes implementation work for later areas already present in the repository, but those areas remain subject to their current roadmap acceptance gates and are not retroactively marked production-complete without final evidence.

---

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
```

## Commit documentation rule

**Do not batch unrelated milestone progress into an undocumented series.** After each substantive implementation commit, add or update this log with the exact SHA and evidence available at that point. If a commit fails CI, record the failure and remediation commit rather than marking the work complete.
