# M5–M10 Acceptance Test Record

## Scope

This record evaluates `main` against the M5–M10 contracts in `Master MVP PRD, Architecture & AI Agent Milestone Roadmap v2.0.md`. Implementation is recorded separately from executable/production evidence; a milestone is not released until its mandatory tests and operational evidence pass.

## Cross-cutting UI / authentication requirement

The previously missed product gap was corrected: successful authentication now routes every defined role to a real authorized workspace instead of leaving the user at a generic/public page.

- Administrative roles: `/admin/dashboard`
- Institution administrator: `/institution`
- Member: `/member`
- Admin navigation is role-aware and only displays permitted functions.
- Admin dashboard displays role-specific actions and jurisdiction-scoped reporting.
- Member dashboard provides authenticated account, notification and member-service UI.

This is a release-critical requirement in addition to the milestone-specific checklists below.

## M5 — Digital Credentials & QR

### Implemented

- Member, institution and license credentials.
- Random, unique credential identifiers.
- SHA-256 token storage; raw verification token is not stored.
- Public verification with expiry/revocation state.
- `/verify/[token]` public verification page.
- QR rendering and print support.
- Administrative issuance UI.
- Issuance restricted to active member/institution/license subjects.
- Dedicated Playwright journey now covers issuing and publicly verifying member, institution and license credentials.

### Acceptance status

- [x] Member credential
- [x] Institution credential
- [x] License credential
- [x] Unique identifiers
- [x] Secure token hashing
- [x] Public verification API/page
- [x] QR generation
- [x] Print support
- [x] Dedicated automated M5 E2E journey implemented
- [ ] Final CI execution of the new journey must pass before release gate is marked green

## M6 — Institutional Membership

### Implemented

- Membership request/list/status service and controller.
- Correct use of the existing `relationshipType` + `MembershipStatus` Prisma fields.
- Jurisdiction and role enforcement on the server.
- Audit events for requests and status changes.
- Institution member dashboard at `/institution/members`.
- Dedicated Playwright/API journey covers request → approve → display → end.

### Acceptance status

- [x] Member-institution relationship
- [x] Historical status fields (`startedAt` / `endedAt`)
- [x] Institution member list
- [x] Membership lifecycle
- [x] Authorization
- [x] Audit
- [x] Dedicated automated M6 E2E journey implemented
- [ ] Final CI execution must pass before release gate is marked green

## M7 — Reporting & Dashboards

The complete master roadmap requires national/regional/district/institution reporting across registration, membership, institution, licensing, geography and trend dimensions, with server-side filtering/pagination/aggregation. Export was also added to close the requested reporting gap.

### Implemented

- Jurisdiction-safe server-side dashboard aggregation.
- Role-aware administrator dashboard.
- 12-month server-side trend endpoint.
- CSV export endpoint containing dashboard metrics and trend rows.
- `/admin/reports` UI with trend table and CSV export.
- Role-aware reporting navigation.

### Acceptance status

- [x] National/jurisdiction-scoped dashboard foundation
- [x] Membership analytics
- [x] Institution analytics
- [x] Registration/application analytics
- [x] Licensing analytics
- [x] Geographic/jurisdiction isolation
- [x] Trend analytics
- [x] CSV export
- [x] Dedicated reporting UI
- [ ] Final CI/E2E execution must pass before release gate is marked green

## M8 — Resource Allocation Engine

### Implemented

- Versioned allocation policy.
- Policy approval authorization.
- Policy formula validation.
- Configurable `perMemberMultiplier`.
- Configurable `equalizationPerInstitution`.
- Optional minimum/maximum institution amounts.
- Eligible active-member calculation.
- Preview → review → finalize lifecycle.
- Historical policy version preserved on each run.
- Audit events.
- Explicit role protection on allocation endpoints.
- Dedicated acceptance unit test for formula/equalization behavior.

### Acceptance status

- [x] Allocation policy
- [x] Policy version
- [x] Eligibility calculation
- [x] Formula definition is read from the approved policy
- [x] Equalization calculation is policy-driven
- [x] Preview
- [x] Review
- [x] Approval/finalization
- [x] Historical policy version preservation
- [x] Audit
- [x] Authorization
- [x] Dedicated formula/equalization acceptance test implemented
- [ ] Final CI execution must pass before release gate is marked green

## M9 — Notifications & Services

### Implemented

- Notification persistence and authenticated inbox.
- Read/unread lifecycle.
- Provider abstraction inside notification service.
- Production Email adapter using Resend when `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured.
- Provider failure is persisted as `FAILED` rather than silently reported as sent.
- Credential issuance triggers in-app and email notification events for active users attached to the institution.
- Provider delivery test and credential event-trigger test added.

### Important limitation

The repository now contains a real external-provider integration, but actual delivery against a live Resend account cannot be claimed from CI without the production provider credentials. CI tests the adapter contract with a controlled provider response. Live delivery remains a deployment/UAT evidence step.

### Acceptance status

- [x] In-app notifications
- [x] Email adapter
- [x] Delivery success/failure persistence
- [x] Credential event trigger
- [x] Notification history/read state
- [x] Provider adapter automated test
- [x] Event-trigger automated test
- [ ] Live external-provider delivery evidence using configured production credentials
- [ ] Full roadmap event coverage for registration/correction/approval/rejection/license expiry still requires event wiring/UAT before release

## M10 — Production Hardening

### Implemented / automated

- Health endpoint.
- JWT secret validation.
- Refresh-token rotation/storage hardening.
- Password-reset token hashing/expiry.
- Request IDs/security headers.
- Authentication rate limiting.
- Server-side role/jurisdiction enforcement on M5–M9 APIs.
- Authentication/privilege escalation E2E acceptance suite added.
- Repeatable PostgreSQL backup/restore drill script added.
- CI now runs dependency security review and backup/restore drill.
- Manual production smoke workflow added for a real deployment URL/API URL.
- Dependency review script fails on high/critical vulnerabilities.

### Acceptance status

- [x] Security middleware tests
- [x] Authentication negative tests
- [x] Invalid-token test
- [x] Horizontal isolation test
- [x] Vertical privilege boundary test
- [x] Credential-token guessing negative test
- [x] Repeatable backup/restore drill implemented
- [x] Backup/restore drill wired into CI
- [x] Production smoke test automation implemented
- [x] Dependency/security review automation implemented
- [ ] Latest CI run must pass the security review and restore drill
- [ ] Live production smoke execution against the deployed environment
- [ ] Production monitoring/alerting evidence
- [ ] Resolve or explicitly disposition all high/critical dependency findings before release

## Current release decision

**M5–M10 are not yet marked RELEASE-COMPLETE.** The requested implementation gaps have been substantially closed in code and automated acceptance coverage. The remaining blockers are evidence/configuration gates that cannot honestly be claimed without execution: live production smoke, live external email delivery, production monitoring evidence, and successful CI/security review.

## Next release gate

1. Let the latest CI run complete.
2. Fix every typecheck/test/build/E2E/security-review failure.
3. Run the manual production smoke workflow against the real deployment.
4. Configure and execute live Resend delivery in the target environment.
5. Record monitoring/alerting evidence.
6. Only then mark M10 and the MVP release gate complete.
