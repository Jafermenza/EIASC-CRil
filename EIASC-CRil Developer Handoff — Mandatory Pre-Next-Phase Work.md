# EIASC-CRil — Developer Handoff / Mandatory Pre-Next-Phase Checklist

**Repository:** `Jafermenza/EIASC-CRil`  
**Master roadmap:** `Master MVP PRD, Architecture & AI Agent Milestone Roadmap v2.1.md`

## 1. STOP — Do not start the next feature yet

Before adding any new milestone or feature, first bring the repository into a known, tested and recoverable state.

The project has progressed through M8 implementation/release and has M9–M12 release candidates in various states. Several branches/PRs remain open. The first task is **release reconciliation and CI validation**, not additional feature development.

Do not assume that a branch is complete because its code exists.

**Implementation ≠ release.**

A milestone is released only when its required CI/release evidence has passed.

---

# 2. Current milestone truth

| Milestone | Current state |
|---|---|
| M5 Digital Credentials & QR | COMPLETE |
| M6 Institutional Membership | COMPLETE / merged |
| M7 Reporting & Dashboards | COMPLETE / merged |
| M8 Resource Allocation | COMPLETE / merged |
| M9 Notifications & Services | IMPLEMENTED — release gate blocked |
| M10 Platform Settings & Integrations | RELEASE CANDIDATE — CI pending |
| M11 PWA / Offline | RELEASE CANDIDATE — CI pending |
| M12 Production Hardening | SECURITY RELEASE CANDIDATE — CI/deployment/UAT pending |

Do **not** mark M9–M12 complete merely because their implementation branches exist.

---

# 3. Mandatory rule: CI ALL unmerged release branches

This is the most important immediate requirement.

Before any further milestone development:

### Run CI for every unmerged release branch that represents work intended for the final product.

At minimum this includes:

- `release/m9-notifications-services`
- `release/m10-platform-settings-final`
- `release/m11-pwa-offline`
- `release/m12-production-hardening`

The CI must execute against the **actual current head SHA of each branch**.

Do not use an old CI result from an earlier commit as evidence for the current branch head.

For each branch record:

```text
Branch:
Head SHA:
PR:
CI run:
CI job:
Migration:
Seed:
Geography validation:
Lint:
Typecheck:
Unit/API:
Security review:
Backup/restore:
Production build:
Milestone E2E:
Result:
Blocking issue:
Remediation commit:
```

### Required outcome

Every release branch must end in one of these states:

```text
PASS — eligible for merge
FAIL — code/test remediation required
BLOCKED — infrastructure/account/runner issue
SUPERSEDED — replaced by another branch
ABANDONED — intentionally closed
```

Never silently ignore a branch.

---

# 4. M9 — resolve first

PR #16:

`release/m9-notifications-services`

M9 implementation exists, including:

- in-app notifications
- email/SMS architecture
- Resend/AfroMessage adapters
- notification templates
- event toggles
- audit-event dispatcher
- duplicate protection
- M9 acceptance E2E

However, the previous GitHub Actions attempt was blocked by the GitHub Actions billing/spending-limit/runner problem.

Therefore:

**M9 is NOT released.**

Once Actions is available:

1. Run the complete M9 CI gate.
2. Run only the M9 acceptance suite for milestone E2E.
3. Fix actual code failures if any.
4. Rerun.
5. Record the final CI run in `docs/ROADMAP-PROGRESS.md`.
6. Merge only after green CI.

Do not weaken tests to make CI pass.

---

# 5. M10 — run its dedicated CI gate

PR #19:

`release/m10-platform-settings-final`

Head currently recorded by GitHub as:

`55cdafa2ef38c0aefb1e114fd424bc1d36b01342`

The branch contains the revised M10 release candidate and dedicated:

```text
e2e/m10-platform-settings.acceptance.spec.ts
e2e/m10-security.acceptance.spec.ts
```

The CI must validate:

- database migration
- seed
- geography validation
- lint
- typecheck
- unit/API tests
- security review
- backup/restore
- production build
- M10 platform-settings E2E
- M10 security E2E

**Do not merge M10 until this CI gate is green.**

Important: a previous inspection found no workflow run associated with the earlier M10 head. Check the **current head SHA again** and verify that Actions actually executed.

---

# 6. M11 — validate independently

PR #17:

`release/m11-pwa-offline`

M11 implementation includes:

- installable manifest
- 192/512 icons
- service worker
- root-scope control
- offline fallback
- runtime/static caching
- API network-only behavior
- push handling
- notification click routing
- mobile responsive acceptance
- dedicated M11 E2E

Dedicated suite:

```text
e2e/m11-pwa-offline.acceptance.spec.ts
```

Run M11 CI independently.

Do not let M9/M10/future suites contaminate the M11 milestone gate.

But also do not declare M11 released until the actual CI result exists.

---

# 7. M12 — SECURITY IS NON-NEGOTIABLE

PR #18:

`release/m12-production-hardening`

M12 is based on the M11 release candidate.

Implemented security controls include:

- API security headers
- web security headers
- production HSTS
- fail-closed CORS
- request-ID sanitization
- authentication throttling
- `Retry-After`
- reverse-proxy handling
- dependency security review
- backup/restore drill
- production smoke tooling
- dedicated M12 security E2E

Dedicated suite:

```text
e2e/m12-production-hardening.acceptance.spec.ts
```

Do not bypass or weaken any security test.

M12 cannot become Go-Live merely because CI passes.

It additionally requires:

```text
[ ] CI green
[ ] Production deployment verification
[ ] Production security verification
[ ] Accessibility acceptance
[ ] UAT
[ ] Rollback/recovery drill
[ ] Security review of deployed environment
[ ] Final Go-Live approval
```

---

# 8. MAIN must become the completed product baseline

The final objective of this reconciliation is:

```text
main
  ↓
M5
  ↓
M6
  ↓
M7
  ↓
M8
  ↓
M9
  ↓
M10
  ↓
M11
  ↓
M12
```

The final `main` branch must contain the approved release sequence.

Do not leave important completed work stranded permanently on feature/release branches.

However:

**Do not merge branches simply to make main look complete.**

Each branch must first pass its appropriate gate.

---

# 9. Inspect and classify every existing open PR

The live repository currently contains open PRs including:

- PR #19 — M10
- PR #18 — M12
- PR #17 — M11
- PR #16 — M9
- PR #12 — old M5 release candidate
- PR #11 — registration dynamic-data fix
- PR #9 — old M5 public-verification proxy fix
- PR #8 — M3 UI/UX/admin/geography fixes
- PR #6 — old M6–M10 gap-fill branch

Several of these are now historical, superseded or incorporated into later release work.

Do not merge old PRs blindly.

For every open PR determine:

```text
Still required?
Already incorporated into main?
Superseded by later milestone?
Contains unique fixes?
Conflicts with current architecture?
Needs CI?
Should merge?
Should close?
```

Particular attention is required for PRs #6, #8, #9, #11 and #12 because they predate the current milestone release sequence.

---

# 10. Branch cleanup

The repository also contains many historical branches.

Do not delete branches immediately.

First establish:

```text
branch → purpose → PR → current head → merged/superseded status
```

Only after confirming that a branch's work is safely represented in `main` should obsolete branches/PRs be closed or deleted.

Do not delete recovery branches before confirming their commits are preserved.

---

# 11. Check for divergence before merging

Before merging any release branch:

```bash
git fetch origin --prune
git checkout main
git pull --ff-only origin main
```

Then compare:

```bash
git log --oneline main..release/<branch>
git diff --stat main...release/<branch>
```

Verify that the branch contains exactly the intended milestone work.

Do not casually rebase or force-push release branches without preserving a recovery point.

---

# 12. Required repository checks

Before next-phase development, verify:

```bash
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run lint
npm run typecheck
npm test
npm run build
npm run security:review
npm run ops:backup-restore
```

Use the repository's actual scripts if names have changed.

Also verify the authoritative geography/reference-data pipeline.

The application must not depend on manually inserted geography data that is absent from a clean environment.

---

# 13. E2E discipline

Every milestone must have its own acceptance suite:

```text
e2e/m9-*.acceptance.spec.ts
e2e/m10-*.acceptance.spec.ts
e2e/m11-*.acceptance.spec.ts
e2e/m12-*.acceptance.spec.ts
```

Rules:

1. Test the milestone being released.
2. Do not make future milestones block the current milestone.
3. Do not allow old cross-milestone suites to accidentally become release gates.
4. Do not weaken a failing test merely to obtain green CI.
5. Fix the underlying implementation or fixture problem.
6. Record remediation in the roadmap progress document.

---

# 14. Security review before feature development

Before adding another feature, inspect:

- authentication
- authorization
- jurisdiction isolation
- institution isolation
- privilege boundaries
- administrative actions
- request validation
- rate limiting
- CORS
- security headers
- secrets handling
- logging
- audit trail
- database permissions
- file uploads, if applicable
- public endpoints
- credential verification
- notification provider configuration
- backup/recovery

Any security regression blocks the next phase.

---

# 15. Production readiness

M12 is specifically a production hardening gate.

Before calling the system production-ready, verify against the actual deployed environment:

```text
HTTPS
DNS/domain
reverse proxy
API routing
WEB_ORIGIN
CORS
authentication
authorization
database connectivity
geography/reference data
email
SMS
notifications
credential verification
QR
PWA/offline behavior
security headers
rate limiting
logging
backup
restore
rollback
monitoring
accessibility
UAT
```

Do not rely exclusively on localhost CI.

---

# 16. Documentation must remain truthful

Update:

```text
docs/ROADMAP-PROGRESS.md
```

after each meaningful release-gate event.

Every update should identify:

- date
- milestone
- branch
- commit SHA
- PR
- CI run/job
- tests
- failures
- remediation
- remaining gaps
- next action

Never write:

```text
COMPLETE
PASS
RELEASED
GO-LIVE
```

unless the corresponding evidence exists.

---

# 17. Do not start the next milestone until reconciliation is complete

The developer should NOT immediately begin M13/new functionality.

First complete:

### Phase A — Repository audit
- inspect main
- inspect every open PR
- inspect every relevant branch
- classify stale/superseded work
- identify unique fixes

### Phase B — CI
- execute CI on every unmerged release branch
- fix genuine failures
- resolve runner/billing problems
- record evidence

### Phase C — Release sequence
- merge only approved M9
- merge only approved M10
- merge only approved M11
- merge only approved M12

### Phase D — Production gate
- deployment verification
- security verification
- accessibility
- UAT
- backup/restore
- rollback/recovery
- Go-Live approval

### Phase E — Only then
Start the next roadmap phase.

---

# 18. Final acceptance condition

The handoff is complete only when the repository can truthfully state:

```text
main
 ├── M5 — PASS
 ├── M6 — PASS
 ├── M7 — PASS
 ├── M8 — PASS
 ├── M9 — PASS
 ├── M10 — PASS
 ├── M11 — PASS
 └── M12 — PASS / GO-LIVE APPROVED
```

Until then, the developer's job is **release reconciliation, testing, security hardening and evidence collection**, not adding another feature.

## Golden rule

**Never move forward by hiding a failing gate.**

Fix it, document it, rerun CI, and only then advance.