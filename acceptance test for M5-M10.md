# M5–M10 Acceptance Test Record

## Scope

This record evaluates the current `main` branch against the M5–M10 roadmap contracts in `Master MVP PRD, Architecture & AI Agent Milestone Roadmap v2.0.md`.

**Important:** presence of a module is not treated as acceptance. A milestone is complete only after its required workflow, authorization, audit, tests and CI evidence pass.

## M5 — Digital Credentials & QR

### Implemented

- Member, institution and license credential types exist in Prisma.
- Credential identifiers are generated as non-sequential random values.
- Credential tokens are stored as SHA-256 hashes.
- Public verification endpoint exists.
- Expiry/revocation status is reflected by verification.
- Public `/verify/[token]` credential page exists.
- QR rendering and print support were added to the credential verification page.
- Administrative credential issuance UI was added.
- Credential issuance now requires active subjects.

### Acceptance status

- [x] Member credential model/service
- [x] Institution credential model/service
- [x] License credential model/service
- [x] Unique credential identifiers
- [x] Secure token hashing
- [x] Public verification API
- [x] Public verification page
- [x] QR rendering
- [x] Print support
- [ ] Dedicated automated M5 E2E journey — **still required**

## M6 — Institutional Membership

### Implemented in this phase

- `MemberInstitution` is already part of the database foundation and is used by allocation.
- Added membership service with request/list/status lifecycle.
- Added server-side jurisdiction and role checks.
- Added audit events for membership requests and status changes.
- Added institution membership dashboard at `/institution/members`.

### Acceptance status

- [x] Member-institution relationship
- [x] Historical relationship fields supported by existing model
- [x] Institution member list API/UI
- [x] Membership status lifecycle
- [x] Authorization
- [x] Audit
- [ ] Dedicated automated M6 E2E journey — **still required**

## M7 — Reporting & Dashboards

### Existing implementation

- Reporting service and dashboard API exist.
- Admin dashboard consumes server-side reporting data.
- Counts cover members, active members, institutions, active institutions, applications and license states.
- Reporting was hardened in this phase so users are scoped to their jurisdiction when no explicit scope is supplied and cannot query an unrelated scope.

### Acceptance status

- [x] Server-side dashboard aggregation
- [x] Jurisdiction-scoped reporting
- [x] Admin dashboard UI
- [ ] Full roadmap reporting suite (trend/distribution/export requirements, if specified in the remaining M7 section) — **must be verified against the complete roadmap before marking complete**
- [ ] Dedicated automated M7 acceptance journey

## M8 — Resource Allocation Engine

### Existing implementation

- Allocation policy model and lifecycle exist.
- Policy approval requires privileged roles.
- Preview runs calculate eligible members and institutional allocations.
- Runs support preview → review → finalized lifecycle.
- Audit events exist for preview/finalization.
- Allocation API endpoints are now protected by explicit role metadata.

### Acceptance status

- [x] Policy persistence
- [x] Policy approval
- [x] Allocation preview
- [x] Review/finalize lifecycle
- [x] Audit
- [x] API role protection
- [ ] Full policy/formula/equalization acceptance suite — **requires dedicated tests**
- [ ] Dedicated M8 E2E journey

## M9 — Notifications & Services

### Existing implementation

- Notification model supports IN_APP, EMAIL, SMS, PUSH and USSD channel values.
- In-app notification creation, listing, unread filtering and read state exist.
- Authenticated notification UI/API is present.

### Acceptance status

- [x] Notification persistence
- [x] In-app listing
- [x] Read state
- [x] Authenticated access
- [ ] External EMAIL/SMS/PUSH/USSD provider delivery — not implemented and must not be falsely marked complete
- [ ] Event-triggered notification coverage
- [ ] Dedicated M9 E2E journey

## M10 — Production Hardening

### Implemented/hardened

- API health endpoint checks PostgreSQL.
- JWT secret length is validated at startup.
- Refresh tokens are hashed and rotated.
- Password reset tokens are hashed and expire.
- Security middleware adds request IDs and baseline security headers.
- Authentication endpoints have rate limiting.
- Allocation/reporting authorization was strengthened.
- CI runs database setup, seed, lint, typecheck, unit tests, build and Playwright.
- Security middleware tests were added.
- `.env.example` now matches the documented API port.

### Acceptance status

- [x] Health check
- [x] Authentication secret validation
- [x] Token rotation/storage hardening
- [x] Security headers
- [x] Authentication rate limiting
- [x] CI validation pipeline
- [x] Security middleware tests
- [ ] Production deployment smoke test against the actual deployment environment
- [ ] Backup/restore drill evidence
- [ ] Full M10 E2E/security acceptance suite
- [ ] Dependency/security review with actionable findings
- [ ] Operational monitoring/alerting evidence

## Current release decision

**M5–M10 are NOT yet accepted as complete.** The repository now contains substantial M5–M9 implementation and several M10 hardening controls, but the remaining acceptance tests and production evidence above are required before declaring the MVP fully complete.

## Required next gate

Run the CI workflow after the latest changes and fix every typecheck/test/build/E2E failure. Then add the missing M5/M6/M8/M9 acceptance journeys and production hardening evidence. Only after those pass should the master roadmap be updated to `M10 COMPLETE`.
