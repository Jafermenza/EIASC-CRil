# M10 CI Release Gate

M10 must pass the complete CI gate before merge to `main`.

Required checks: migration validation, seed, geography validation, lint, typecheck, unit/API tests, dependency security review, backup/restore, production build, dedicated M10 platform-settings acceptance, and dedicated M10 security acceptance.

Implementation is not considered a release PASS until CI completes successfully and the PR is approved.
