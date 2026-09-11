# M4 Acceptance Test Record

## Acceptance basis

This record evaluates M4 against section 11.8, **Licensing Acceptance**, in `Master MVP PRD, Architecture & AI Agent Milestone Roadmap v2.0.md`.

## Gaps found before the change

The initial implementation had the core licensing service and database model, but the following acceptance gaps remained:

- No licensing application creation flow in the admin UI.
- No licensing rejection endpoint or UI action, despite `REJECTED` being part of the application state model.
- No licensing application resubmission endpoint or UI action after correction.
- The institution license page could display a record but could not resubmit a corrected application.
- Institution documents were not exposed on the license detail view.
- Successful lifecycle behavior was not covered; tests mainly covered invalid input and rejected transitions.
- Authorization tests did not cover jurisdiction boundaries or institution ownership.
- Audit creation and automatic expiry behavior were not asserted.
- No HTTP-level licensing workflow test was present.

## Changes made

- Added `POST /licenses/:id/reject` with required reason validation and audit logging.
- Added `POST /licenses/:id/resubmit` with correction-state validation and audit logging.
- Added admin UI controls to create applications, reject applications, request corrections, resubmit applications, issue licenses, renew, suspend, restore, and revoke.
- Added institution-user resubmission support on `/institution/license`.
- Included institution documents in the license detail API response and UI.
- Added successful lifecycle coverage for review, correction, resubmission, approval, issuance, suspension, restoration, renewal, and revocation.
- Added license-number format coverage, expiry transition coverage, audit assertions, and authorization boundary tests.
- Added an HTTP-level licensing approval test.
- Added public `GET /api/v1/licenses/verify/:licenseNumber` verification and the `/verify` page.
- Added a PostgreSQL-backed Playwright journey covering login, application creation, review, approval, issuance, and public verification.
- Marked the M4 acceptance checklist complete in the master roadmap.

## Validation result

The completed M4 implementation passes:

- 35 API tests, including the licensing lifecycle and HTTP workflow test.
- API and web typechecking.
- API and web production build.
- Repository linting with existing warnings only.
- Git patch integrity validation.

## Next action

The database-backed browser journey is now implemented in `e2e/m4-licensing.spec.ts` and runs with `npm run test:e2e`. Proceed to M5, **Digital Credentials & QR**, while preserving the M4 licensing and public verification contracts. Before production release, run this journey against the CI PostgreSQL service and retain its trace/report artifacts for release evidence.