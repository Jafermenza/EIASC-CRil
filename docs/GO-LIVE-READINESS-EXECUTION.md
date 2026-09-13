# EIASC CRil Go-Live Readiness Execution Record

**Date:** 2026-09-13  
**Repository:** `EIASC-CRil`  
**Integrated branch:** `main`  
**Purpose:** Record the commands and evidence used to bring the merged M9-M12 implementation to local production-readiness stage.

## 1. Branch Integration

Refreshed all fork and upstream branch references:

```bash
git fetch --all --prune
git branch -a -vv
git log --all --oneline --decorate --graph --max-count=80
```

Confirmed the release branches were not represented in the local `main` tip and integrated them in milestone order:

```bash
git merge --no-ff --no-edit upstream/release/m9-notifications-services
# merge commit: 6d1b617

git merge --no-ff --no-edit upstream/release/m10-platform-settings-final
# merge commit: 755afb2

git merge --no-ff --no-edit upstream/release/m11-pwa-offline
# merge commit: f1b31c9

git merge --no-ff --no-edit upstream/release/m12-production-hardening
# merge commit: 25c5575
```

Shared CI and roadmap conflicts were resolved by retaining the current evidence ledger and combining the dedicated M9, M10, M11 and M12 acceptance steps.

## 2. Integration Fixes

The merged tree exposed the following issues during local startup and validation:

- Nest's abstract application type did not expose Express `set`; proxy configuration now uses `app.getHttpAdapter().getInstance().set(...)`.
- Notification audit events can have a null entity ID; the dispatcher now skips entity-less events before entity-scoped recipient resolution.
- Placeholder Resend values are treated as unconfigured instead of being reported as production-ready.
- `/admin/settings/notifications` now redirects to the implemented notification settings page at `/admin/settings/sms`.
- The notification dispatcher unit test now imports Jest globals for the ESM Jest configuration.
- `db:bootstrap` no longer replays migration SQL after `prisma migrate deploy`.
- Geography import and verification scripts explicitly load `.env`.
- Geography verification excludes isolated `E2E-*` fixtures from canonical reference-data counts.
- Root lint excludes Next's generated `apps/web/next-env.d.ts` declaration file.

## 3. Database Bootstrap

Started the local PostgreSQL service and initialized the database:

```bash
cp .env.example .env
docker compose up -d postgres
npm run db:bootstrap
```

The original bootstrap attempt exposed two tooling problems: redundant migration replay and geography scripts not loading `.env`. After the fixes, the command passed:

```text
17 migrations found; no pending migrations
geography import: SUCCESS
regions: 15
zones: 107
woredas/districts: 1,148
geography verification: PASS
orphan districts: 0
```

## 4. Browser and Acceptance Setup

Installed Playwright browser dependencies:

```bash
npx playwright install --with-deps chromium
```

The first browser run failed because Chromium system libraries were absent. The command above installed the required Linux dependencies.

The merged milestone suites were validated using isolated processes, matching the CI release-gate model:

```bash
npm run test:e2e -- e2e/m9-notifications.acceptance.spec.ts
npm run test:e2e -- e2e/m10-platform-settings.acceptance.spec.ts e2e/m10-security.acceptance.spec.ts
npm run test:e2e -- e2e/m11-pwa-offline.acceptance.spec.ts
npm run test:e2e -- e2e/m12-production-hardening.acceptance.spec.ts
```

Results:

```text
M9 notifications                         1 passed
M10 settings + security                  4 passed
M11 PWA / offline                        3 passed
M12 production hardening                 4 passed
```

Running all suites in one Playwright process is not used as release evidence because M12 intentionally sends repeated login attempts for throttling coverage. The in-memory limiter can affect a later M9 login when tests run in alphabetical order. The CI workflow runs each milestone suite separately.

## 5. Repository Validation

Executed the repository checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run security:review
```

Results:

```text
lint: PASS; existing explicit-any warnings remain
typecheck: PASS
API/unit tests: 52 passed across 14 suites
production build: PASS
security review: PASS; 0 high/critical vulnerabilities
```

## 6. Backup and Restore Drill

The repository script was attempted directly:

```bash
npm run ops:backup-restore
```

The dev container does not have host `pg_dump`, `psql` and `pg_restore` binaries. The equivalent drill was then completed with the PostgreSQL container tools:

```bash
BACKUP=/tmp/eiasc-cril-restore-drill.dump

docker exec cril-v2-postgres-1 pg_dump -U cril -d cril --format=custom > "$BACKUP"
docker exec cril-v2-postgres-1 psql -U cril -d postgres -v ON_ERROR_STOP=1 \
  -c 'DROP DATABASE IF EXISTS "eiasc_cril_restore_drill" WITH (FORCE);' \
  -c 'CREATE DATABASE "eiasc_cril_restore_drill";'
docker cp "$BACKUP" cril-v2-postgres-1:/tmp/eiasc-cril-restore-drill.dump
docker exec cril-v2-postgres-1 pg_restore -U cril --no-owner --no-privileges \
  --dbname=eiasc_cril_restore_drill /tmp/eiasc-cril-restore-drill.dump
docker exec cril-v2-postgres-1 psql -U cril -d eiasc_cril_restore_drill \
  -Atc 'SELECT COUNT(*) FROM "User";'
docker exec cril-v2-postgres-1 psql -U cril -d postgres -v ON_ERROR_STOP=1 \
  -c 'DROP DATABASE "eiasc_cril_restore_drill" WITH (FORCE);'
rm -f "$BACKUP"
```

Result: restore succeeded and returned `4` restored `User` rows.

## 7. Local Production Smoke

Started the merged web/API stack with local production-like values. Secrets are intentionally not recorded here:

```bash
DATABASE_URL=postgresql://... \
JWT_SECRET=<32-or-more-character-local-secret> \
WEB_ORIGIN=http://127.0.0.1:3000 \
API_PORT=4000 \
npm run dev
```

Validated the smoke endpoints:

```bash
curl -fsS -o /dev/null -w 'web:%{http_code}\n' http://127.0.0.1:3000/
curl -fsS -o /dev/null -w 'login:%{http_code}\n' http://127.0.0.1:3000/login
curl -fsS -o /dev/null -w 'api:%{http_code}\n' http://127.0.0.1:4000/api/v1/health
```

Result:

```text
web:200
login:200
api:200
```

## 8. Gate Closure Matrix

```text
Local CI-equivalent validation                 PASS
Local database/bootstrap/geography validation  PASS
Local security dependency review               PASS
Local backup/restore recovery drill             PASS
Local production smoke                         PASS
Local responsive/mobile acceptance              PASS
Remote milestone-scoped GitHub CI              PENDING
Real production deployment verification         PENDING
Operational accessibility/UAT                   PENDING
Deployed-environment security review            PENDING
Production rollback/recovery drill              PENDING
EIASC final Go-Live approval                    PENDING
```

## 9. Remaining External Go-Live Gates

These items cannot be honestly completed from the development container:

```text
[pending] Run milestone-scoped GitHub CI on the merged main head
[pending] Deploy the approved build to the real production environment
[pending] Verify production HTTPS, domain, secrets, migrations and health
[pending] Complete accessibility acceptance and operational UAT
[pending] Review security controls in the deployed environment
[pending] Execute rollback/recovery against the production deployment
[pending] Obtain EIASC final Go-Live approval
```

The local implementation is at **LOCAL READINESS PASS / GO-LIVE PENDING**. Local tests, smoke checks and recovery checks do not replace remote CI, production deployment evidence, UAT, or institutional approval.

## 10. Local Revalidation — 2026-09-13

The current worktree was revalidated after the integrated M9-M12 changes:

```text
dependency security review                 PASS (0 high/critical vulnerabilities)
lint                                       PASS (64 existing any warnings)
typecheck                                  PASS
API/unit tests                              PASS (14 suites, 52 tests)
production build                           PASS
container backup/restore drill             PASS (4 restored User rows)
M11 browser acceptance                      PASS (3 tests)
M12 hardening acceptance                   PASS (4 tests)
```

The repository recovery script remains unavailable directly in this dev container because host `pg_dump`, `psql` and `pg_restore` binaries are not installed. The equivalent commands executed through the running PostgreSQL container passed and removed the temporary restore database afterward.

No new evidence was produced for the external gates. The following remain pending: milestone-scoped GitHub CI, real production deployment verification, accessibility acceptance and EIASC operational UAT, deployed-environment security review, production rollback/recovery drill, and final EIASC go-live approval.
