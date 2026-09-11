# EIASC CRil — Project Status

**Repository:** `Jafermenza/EIASC-CRil`
**Branch:** `main`
**Status date:** 2026-09-11

## Current milestone position

The repository has progressed through **M4 — Institutional Licensing**. The M4 acceptance record states that the licensing lifecycle, public verification, API/web validation, and database-backed Playwright journey are complete. The roadmap's next planned milestone is **M5 — Digital Credentials & QR**.

> Important: the top-level master roadmap still contains an older summary that says M0–M3 are complete and M4 is next. Treat the later M4 acceptance record and the actual repository implementation as the current engineering evidence; update the master roadmap summary during the next documentation pass.

## Completed foundation

- **M0 — Foundation:** Next.js web, NestJS API, PostgreSQL, Prisma, environment configuration, testing, linting and build foundation.
- **M1 — Identity & Security:** authentication/RBAC/jurisdiction foundations and audit-oriented authorization model.
- **M2 — Individual Registration:** individual registration and approval pathway.
- **M3 — Institution Registry:** institutional application, review, correction, approval/rejection, institution profile, documents, member-institution relationship foundations, jurisdiction enforcement and audit workflow.
- **M4 — Institutional Licensing:** licensing application lifecycle, correction/resubmission, approval/issuance, renewal, suspension/restoration/revocation, expiry behavior, audit coverage, jurisdiction/ownership authorization tests, public license verification and Playwright journey.

The M4 acceptance record reports 35 API tests, API/web typechecking, production builds, repository linting with existing warnings only, patch-integrity validation, and a successful GitHub Actions run against fresh PostgreSQL. See `acceptance test for M4.md` for the acceptance evidence.

## Recent product/UX work already merged

Recent main-branch commits include:

- Admin login returns to `/admin/dashboard` after successful authentication.
- E2E licensing workflow follows the admin dashboard before entering the licensing flow.
- Public verification success state was aligned with the M4 workflow.
- Institution application confirmation is connected to the tracking workflow.
- Institution application queue and review actions were polished, including reasoned correction/rejection actions.
- Admin and institution shells received accessibility/landmark fixes.
- Public mobile navigation and contextual not-found/dashboard recovery states were improved.
- The M3/M4 UI/UX system and workflow states were consolidated in the latest merge.

## Latest CI issue and fix

`npm run lint` reported **1 error and 44 warnings**.

The blocking error was:

```text
apps/web/app/admin/users/page.tsx:5:7
'levels' is assigned a value but never used
@typescript-eslint/no-unused-vars
```

The `levels` constant is actually used by the jurisdiction-level `<select>`, so the reported lint error was caused by the source state at the CI commit being inconsistent with the current page content. The file was refreshed and committed on `main` as:

```text
7d8dfb7aeaac99264ede6a00f5b7db35d179b377
fix(web): remove unused admin user jurisdiction declaration
```

The remaining 44 `no-explicit-any` findings are warnings, not the current lint-blocking error. They should be removed incrementally rather than hiding the rule globally.

**Next validation:** rerun the repository CI/lint workflow and confirm the blocking error is gone before starting feature work.

## Known functional hardening items to resolve before/alongside M5

These are implementation priorities from the current development track and must be verified against the repository before being marked complete:

1. **Admin Settings:** the admin settings page is not yet considered complete; inspect the page, API, persistence, authorization and save/load behavior end-to-end.
2. **Geographic hierarchy:** geography must be preloaded from a reliable seed/import source so registration/application forms have selectable Region → Zone/City → Subcity/Town → District/Woreda data on a fresh database. Do not rely on manually entered browser values.
3. **Super-admin user creation:** verify that an authorized super administrator can create users successfully, including role, jurisdiction scope, validation, password handling, and backend authorization. Test both successful creation and forbidden cross-jurisdiction cases.
4. **Home-page conversion:** add/verify a prominent **Apply Now** CTA and service-page CTA(s), while preserving the existing public registration/tracking workflow.
5. **Lint debt:** replace `any` with explicit DTO/API response types, `unknown` plus narrowing, or reusable shared types. Do not weaken ESLint rules just to make CI green.

## M5 — Digital Credentials & QR: next roadmap phase

M5 should build on the verified M4 licensing contract, not replace it. The expected direction is:

- digital credential model and lifecycle;
- credential issuance tied to an approved/licensed subject;
- secure public verification;
- QR representation of verification identifiers/URLs;
- revocation/expiry handling;
- authorization and jurisdiction checks;
- audit trail for issuance and status changes;
- public verification UX;
- API, database, unit/integration and Playwright acceptance coverage.

Before implementing M5, inspect the M5 section of the master roadmap and preserve all M4 contracts, especially `/api/v1/licenses/verify/:licenseNumber`, licensing lifecycle states, audit behavior and authorization boundaries.

## Engineering rules for the next phase

- Inspect existing implementation before changing it.
- Preserve completed milestone behavior and backward compatibility.
- Keep business rules in NestJS services, not duplicated in Next.js components.
- Enforce authentication + role + jurisdiction + ownership + workflow state on the server.
- Keep critical actions auditable.
- Prefer database/configuration-driven reference data over hard-coded UI lists.
- Add tests with each functional change.
- Run lint, typecheck, API tests, production builds and relevant Playwright journeys before declaring a milestone complete.
- Never mark a roadmap item complete without repository/CI evidence.

## Immediate execution order

```text
1. Confirm CI is green after lint-error fix
2. Fix/verify admin Settings end-to-end
3. Make geography seed/import deterministic on a fresh database
4. Fix and test Super Admin user creation + jurisdiction enforcement
5. Verify/add Apply Now CTAs and public registration journey
6. Reduce remaining TypeScript `any` warnings
7. Update master roadmap summary to M4 complete / M5 next
8. Implement M5 Digital Credentials & QR from the roadmap
9. Add M5 acceptance tests and CI evidence
```
