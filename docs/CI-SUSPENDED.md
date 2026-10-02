# CI suspension

## Status: intentionally suspended

The repository currently has no `.github/workflows` workflow definitions exposed on `main`, so there is no active GitHub Actions workflow to delete from this branch.

CI/release automation is intentionally **not to be restored yet**. The reconciliation implementation is being developed and validated on dedicated branches first. Restore CI only after the owner explicitly requests it and the payment/reconciliation acceptance gates are ready.

This suspension is operational only; local validation remains required before merging:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- relevant Playwright E2E tests

Do not describe the current branch as CI-validated until those checks have actually been executed successfully.