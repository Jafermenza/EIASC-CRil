# Dependency Security Record

## 2026-09-12 — MVP v2 dependency audit remediation

### Initial finding

A local `npm run security:review` reported:

- 0 informational
- 1 low
- 1 moderate
- 7 high
- 0 critical
- 9 total

The review therefore failed because high/critical findings were present.

### Investigation

The repository's committed `package-lock.json` was stale relative to the approved workspace manifests. In particular, the lockfile still contained a root `xlsx@0.18.5` dependency even though the current root `package.json` no longer declares `xlsx`. The source tree search also found no current application import of `xlsx`.

`xlsx@0.18.5` is known to carry high-severity prototype-pollution and ReDoS advisories, and the npm registry does not provide a patched upstream `xlsx` release. The appropriate remediation for an unused dependency is removal, not suppression or an audit exception.

The application manifests have already been upgraded to the approved framework versions, including NestJS 12.0.1 and Next.js 15.5.24. The dependency lockfile must therefore be regenerated from those manifests before the security result can be considered authoritative.

### Remediation

1. Regenerate `package-lock.json` from the current approved manifests with `npm install`.
2. Run `npm audit --audit-level=low` against the regenerated dependency tree.
3. Run typecheck, build and API tests after dependency regeneration.
4. Do not use `npm audit fix --force` or suppress high/critical findings without a documented security decision.
5. Record the final post-remediation audit counts and CI evidence here.

### Status

**In remediation.** The initial 7 high findings are not marked resolved until the regenerated lockfile has been audited and the complete CI/security gate passes.
