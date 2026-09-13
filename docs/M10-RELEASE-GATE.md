# M10 Final Release Gate — Platform Settings & Integrations

M10 is eligible for release only when the implementation and all required automated release evidence pass. Code presence alone is not a PASS.

## Gate

- Platform settings/configuration are available through the intended admin surface.
- Geography and platform configuration remain authoritative from the database.
- Operational logging/request IDs do not expose secrets.
- Security review blocks high/critical dependency vulnerabilities.
- Backup/restore drill passes.
- Authentication, horizontal isolation and privilege-boundary tests pass.
- Dedicated M10 acceptance suite passes.
- Lint, typecheck, unit/API tests and production build pass.
- CI completes successfully on the M10 release PR.

## Release evidence

Current branch: `release/m10-platform-settings-final`.

CI is intentionally scoped to M10 acceptance suites; unrelated future milestone E2E suites are not release blockers.

## Status

**RELEASE CANDIDATE — CI execution pending.**

Do not merge to `main` until the M10 CI gate is green and the PR is reviewed/approved.
