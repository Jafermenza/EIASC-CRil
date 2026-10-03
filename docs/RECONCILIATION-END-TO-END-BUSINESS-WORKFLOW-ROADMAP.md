# EIASC-CRil — Reconciliation: End-to-End Business Workflow & Implementation Roadmap

Repository: Jafermenza/EIASC-CRil
Branch: reconciliation/phase-4b-organization-inspection-certification
Assessment date: 2026-10-03

Purpose: Reconcile the executable business workflows found in the current implementation with the intended end-to-end operating model, identify workflow gaps, and define the implementation sequence required to close them without weakening existing functionality.

> This is an implementation reconciliation, not a product vision document. A capability is marked implemented only when current code provides the required business transition and supporting controls. Planned items remain planned until code and acceptance tests prove them.

## Phase 2 implementation status — current branch

Implemented on `reconciliation/phase-2-finance-registrar`:

- Finance/Registrar payment queue with status, method and applicant/reference search filters.
- Jurisdiction authorization is applied to queue visibility and individual payment detail.
- Payment detail retrieves the original individual/institution application data.
- Institution application attachments are retrieved with payment detail.
- Payment history and payment-specific audit history are exposed to the reviewer.
- Finance Officer and Registrar are the only roles allowed to record payment decisions.
- Verify, Reject and Request Clarification decisions are supported.
- Reject and Clarification require an explicit reason.
- Decisions are persisted together with reviewer identity and timestamp.
- Decision audit events are written transactionally with the payment status change.
- Applicant in-app notification is created when a linked applicant/institution account exists.
- Chapa remains provider-verified and cannot be manually overridden.
- The payment queue no longer grants payment-decision access to Inspector.

Phase 2 is still pending production validation and E2E evidence. Applicant accounts that do not yet exist cannot receive an in-app notification; the decision is nevertheless durably recorded in the payment audit trail.

## Phase 1 implementation status — current branch

Implemented in the current branch:
- application-linked Chapa initialization for individual and institution applications;
- server-side payment resolution during public application tracking;
- tracking-page Pay Now for Chapa;
- Telebirr/bank-transfer payment evidence submission for saved applications;
- Chapa return-to-tracking behavior and reusable active checkout links;
- duplicate-payment-reference protection and active-payment idempotency;
- provider-state reconciliation for verified, pending and terminal failed/expired/cancelled states;
- payment re-check/attachment on institution correction resubmission;
- existing server-side approval gates remain dependent on PAID payment state;
- automated unit coverage for required, pending and paid payment states.

Still required before Phase 1 exit: complete provider/duplicate/retry tests, verify all applicant entry points use the same resolver, run local lint/typecheck/tests/build/E2E, and prove the migration is applied in the target database. Finance/Registrar decision UI remains Phase 2.

## 1. Target operating principle

Every important business journey must be a closed loop:

~~~text
Applicant enters data
  ↓
System validates completeness
  ↓
System checks payment state
  ↓
If unpaid → clear Pay Now action
  ↓
Payment recorded/verified
  ↓
Application proceeds according to policy
  ↓
Jurisdiction officer reviews submitted data + attachments
  ↓
Correction / reject / approve
  ↓
Downstream record is created
  ↓
Credential/account/notification side effects complete
  ↓
Audit trail records the business decision
  ↓
Applicant can track the same state
  ↓
Public verification exposes only authoritative published data
~~~

Non-negotiable invariant: no workflow should display a successful business state when a required downstream prerequisite has failed.

## 2. Current executable workflow reconciliation

### 2.1 Individual/member registration

Current executable path:

~~~text
Registration → SUBMITTED/RESUBMITTED → review
  ├─ correction → CORRECTION
  ├─ reject → REJECTED
  └─ approve → payment assertion → Member ACTIVE → Registration APPROVED → credential provisioning attempt
~~~

Findings:
- Registration state transitions are substantially implemented.
- Individual approval checks payment before creating the active member.
- Member creation and registration approval are transactional.
- Credential provisioning is a downstream side effect whose failure must not be silently ignored.
- Review/correction/rejection transitions need consistent durable business events for notifications and audit.
- Jurisdiction queue authorization must be applied before pagination/limiting, not after a bounded fetch.

Target:

~~~text
Register → Track → Payment check
  ├─ unpaid → Pay Now → payment verification
  └─ verified → Submit
      ↓
Jurisdiction review
  ├─ correction → applicant fixes/resubmits → payment re-check
  ├─ reject
  └─ approve → member → user account → credential → notification
~~~

## 3. Applicant payment — required for BOTH individual and institution

Payment must be a first-class application prerequisite. Applicants must be able to pay after the initial form was saved or submitted.

~~~text
Application created
  ↓
Payment status evaluated
  ↓
NOT PAID / PAYMENT REQUIRED
  ↓
Applicant sees amount, purpose, status, reference and Pay Now
  ↓
Payment initiated
  ↓
Gateway/manual result
  ↓
Payment verification
  ↓
PAID / VERIFIED
  ↓
Application becomes eligible for the next permitted state
~~~

The system must automatically check payment when an applicant opens tracking, opens the dashboard, attempts submission/resubmission, returns from a payment gateway, refreshes a pending payment, or opens an application previously saved without payment.

Required payment lifecycle to reconcile with the existing Prisma model:

~~~text
NOT_REQUIRED → REQUIRED → INITIATED → PENDING_VERIFICATION → VERIFIED
                                      └→ REJECTED / EXPIRED
VERIFIED → REFUND_PENDING → REFUNDED where refunds apply
~~~

Server-side payment state is authoritative. A client-side success message is never sufficient for business approval.

## 4. Finance / Registrar payment approval workflow

Payment needs a durable operational queue and decision UI.

~~~text
Applicant pays / submits evidence
  ↓
Payment = PENDING_VERIFICATION
  ↓
Finance / Registrar queue
  ↓
Officer opens payment
  ↓
Officer sees applicant + application + attachments + payment evidence + history
  ↓
Decision
  ├─ VERIFY → payment VERIFIED → applicant notified → application eligible
  ├─ REJECT → mandatory reason → applicant notified → Pay Now/retry
  └─ REQUEST CLARIFICATION → applicant supplies evidence → re-review
~~~

Finance/Registrar UI must support jurisdiction/office filtering, payment status, date range, application type, payment purpose, applicant/application search, amount, method, transaction/reference number, pending age/SLA, attachment preview, original application data, submitted attachments, payment history, reviewer identity, decision timestamp, decision reason and audit history.

Decision actions:
- Verify payment
- Reject payment
- Request clarification
- Open application
- View attachments
- View payment history

Every decision stores actor, role, office/jurisdiction, decision, reason/comment, timestamp, payment reference/snapshot, evidence reviewed and resulting application eligibility.

## 5. Institution registration reconciliation

Target journey:

~~~text
Institution application → draft → required documents → payment check
  ├─ unpaid → Pay Now
  └─ verified → submit
        ↓
Finance verification where required
        ↓
Jurisdiction/document review
        ↓
Inspection when policy requires
        ↓
Correction / reject / approve
        ↓
ACTIVE institution → account/credential → certificate → publication → notification
~~~

Required fixes: institution submission and correction/resubmission must use the same authoritative payment model as individual registration; required documents must be visible to reviewers; inspection must be explicit where required; activation and account/credential provisioning must not silently diverge.

## 6. Membership reconciliation

Current implementation has two activation paths: request → PENDING → approval → ACTIVE, and institution-side direct add/activation.

Target rule:

~~~text
Member requests affiliation → PENDING → authorized approval → ACTIVE
~~~

If direct addition by an institution registrar is permitted, it must be an explicit role-specific action with audit, duplicate checks, primary-membership enforcement, effective date and member notification. The one active PRIMARY institution rule must be enforced consistently across every path.

## 7. Licensing reconciliation

The license service has a comparatively complete lifecycle: DRAFT → SUBMITTED → UNDER_REVIEW → CORRECTION_REQUIRED/RESUBMITTED or REJECTED or APPROVED → ISSUE → ACTIVE, with suspend/restore/revoke/renew operations.

Gaps to close:
- Complete institution self-service license application.
- License payment gate where licensing is fee-bearing.
- Required document checklist and reviewer workspace.
- First-class inspection assignment/findings/decision where required.
- Deliberate linkage between license activation, credential generation and publication.

Target:

~~~text
Institution dashboard → license application → documents → payment check
  → finance verification → registrar/jurisdiction review → inspection if required
  → decision → issue → credential generation → publication review → QR/public verification
~~~

## 8. Credential and account reconciliation

Applicants and administrators need separate visible states for Approved, Account Provisioning Pending, Account Active, Credential Generated, Credential Pending Publication, Credential Published and Credential Revoked/Expired.

If provisioning fails, preserve the historical approval but mark operational completion as pending action and provide retry/repair. Never silently swallow a provisioning failure.

## 9. Notification reconciliation

Notifications should be driven by durable business events, not a short polling window over recent audit records.

Required events include APPLICATION_CREATED, PAYMENT_REQUIRED, PAYMENT_INITIATED, PAYMENT_VERIFIED, PAYMENT_REJECTED, CORRECTION_REQUESTED, APPLICATION_RESUBMITTED, APPLICATION_APPROVED, APPLICATION_REJECTED, MEMBER_CREATED, INSTITUTION_CREATED, MEMBERSHIP_APPROVED, LICENSE_APPROVED, LICENSE_ISSUED, CREDENTIAL_READY and CREDENTIAL_PUBLISHED.

Each event needs a stable ID and processing/retry state so delivery is safely retryable.

## 10. Role-specific UI

Applicant/member UI: My applications, status, missing items, payment status, Pay Now, upload requested evidence, resubmit, tracking code, notifications and membership/card.

Institution administrator UI: institution status, required documents, members, membership requests, license, payment, required actions, certificate, reports and notifications.

Finance/Registrar UI: payment queue, payment detail, applicant/application data, attachments/evidence, payment history, decision controls, pending age/SLA, audit history and reports.

District/jurisdiction reviewer UI: jurisdiction applications, payment readiness, applicant/institution data, attachments, correction/reject/approve, inspection and audit history.

Regional/national UI: jurisdiction summaries, workflow queues, payment reconciliation, licensing, reports, allocation, audit and system settings according to role.

UI rule: every role should immediately answer What is my work? What needs my action? What happens next?

## 11. Jurisdiction and queue correctness

Authorization must be applied in the database query or through correctly paginated authorized queries. Do not fetch a fixed number of records and then filter authorization in application memory, because eligible records can be omitted when queues grow.

## 12. Audit and decision integrity

Every eligibility/authority-changing decision must identify actor, role, scope, timestamp, entity, action, reason and relevant reference. Minimum audited decisions include payment verify/reject, submission, correction, resubmission, approval/rejection, membership activation/deactivation, license decisions, credential generation/publication/revocation and account provisioning.

## 13. Implementation roadmap

### Phase 0 — Freeze and prove current behavior
- Run lint, typecheck, unit/API tests, build, critical E2E, geography verification and backup/restore.
- Record actual failures; do not mark a feature passed merely because code exists.

Exit: reproducible baseline.

### Phase 1 — Payment state unification
- Reconcile existing payment models/statuses.
- Define one authoritative payment state machine.
- Link payment to application/entity and purpose.
- Add server-side payment status resolver.
- Add payment checks to individual and institution workflows.
- Re-check payment on tracking/dashboard/submission/resubmission.
- Add Pay Now for unpaid obligations.
- Make payment-return handling idempotent.
- Prevent duplicate payment obligations.
- Add tests for unpaid, pending, verified, rejected and expired payment.

Exit: no applicant is blocked by an unclear missing-payment state.

### Phase 2 — Finance / Registrar payment operations
- Add payment verification queue API.
- Add role/jurisdiction authorization.
- Build finance/registrar dashboard and payment detail page.
- Fetch linked application data and all submitted attachments.
- Display transaction/reference information and payment history.
- Implement Verify / Reject / Request Clarification.
- Require rejection/clarification reason.
- Persist actor/role/time/reason.
- Add audit events and applicant notifications.
- Add payment reconciliation/reporting.
- Add complete finance E2E coverage.

Exit: finance can verify a payment from one screen without reconstructing the applicant submission.

### Phase 3 — Application workflow closure
- Reconcile individual approval with verified payment.
- Reconcile institution submit/resubmit with verified payment.
- Validate required documents before submission.
- Standardize correction/resubmission.
- Add durable application events.
- Add visible status timelines and applicant action prompts.
- Replace swallowed provisioning failures with explicit pending/retry states.
- Add complete individual and institution E2E journeys.

### Phase 4 — Reviewer and inspection workflow
- Unified review workspace.
- Submitted form snapshot.
- Attachment/document viewer.
- Payment evidence and history.
- Correction builder.
- Reject/approve controls.
- Inspection assignment/findings/decision where required.
- Audit every decision.

### Phase 5 — Role-specific UI
- Applicant dashboard.
- Institution dashboard.
- Finance/Registrar dashboard.
- District reviewer dashboard.
- Regional dashboard.
- National dashboard.
- Role-specific navigation, needs-action cards, timelines, plain-language labels and responsive states.
- Role-specific E2E navigation tests.

### Phase 6 — Membership integrity
- Reconcile direct-add versus request/approval paths.
- Enforce primary institution rule.
- Add effective dates and history.
- Audit activation/deactivation.
- Notify both parties.
- Test duplicate/primary membership cases.

### Phase 7 — Licensing closure
- Institution self-service license application.
- License payment gate where required.
- Document checklist.
- Reviewer workspace.
- Inspection workflow.
- Approval → issue.
- Credential generation → publication review → public verification.
- Renewal/suspension/revocation tests.

### Phase 8 — Durable events and notifications
- Durable business events/outbox where appropriate.
- Stable event IDs.
- Processing/retry state.
- Idempotent notification delivery.
- Email/SMS/in-app retry.
- Notification history and monitoring.

### Phase 9 — Queue/reporting hardening
- Database-level jurisdiction filtering.
- Correct pagination/count semantics.
- Queue age/SLA indicators.
- Payment reconciliation reports.
- Application throughput and correction/rejection reports.
- Reviewer workload reporting.
- Authorized audit exports.

## 14. Acceptance test matrix

| Journey | Required acceptance |
|---|---|
| Individual unpaid | Applicant sees payment required and Pay Now |
| Individual paid | Verified payment allows permitted next step |
| Individual pending | Applicant sees pending, not false success |
| Individual rejected | Applicant sees reason and can retry |
| Individual correction | Exact requested correction is visible |
| Individual approval | Member/account/credential downstream states are visible |
| Institution unpaid | Institution sees Pay Now |
| Institution paid | Verified payment permits submission/review |
| Institution correction | Resubmission re-checks payment |
| Finance verify | Officer sees application + attachments + evidence |
| Finance reject | Reason is mandatory and applicant is notified |
| Finance clarification | Applicant can supply evidence and return to review |
| Reviewer approve | Decision is audited and downstream work starts |
| Reviewer reject | Reason and notification persist |
| Membership request | PENDING → ACTIVE only through authorized path |
| Primary membership | Second active primary affiliation is prevented |
| License application | Institution can track every stage |
| License inspection | Findings are stored and visible to authorized reviewers |
| License issue | Active license has authoritative number/dates |
| Credential publication | Public verification only after publication |
| Provisioning failure | State is pending/recoverable, not silent success |
| Jurisdiction queue | All authorized records are reachable through pagination |
| Notification failure | Event remains retryable |
| Role UI | User sees only actions appropriate to role |

## 15. Definition of reconciliation complete

The reconciliation is complete when payment state is authoritative; both individual and institution applicants can pay after initial creation; unpaid obligations automatically expose Pay Now; Finance/Registrar can verify/reject payments with complete context; decisions are audited and visible; reviewers can see submitted data and attachments; role-specific dashboards expose next actions; correction/payment rules are consistent; membership rules are consistent; licensing reaches public verification; credential/account failures are recoverable; notifications are durable; jurisdiction queues paginate correctly; and all critical journeys have automated E2E acceptance coverage.

## 16. Delivery rule

Implement in small, recoverable commits in this order: payment state reconciliation → applicant Pay Now and automatic checks → Finance/Registrar queue and decision UI → application review workspace → individual/institution workflow closure → role-specific UI → membership integrity → licensing closure → durable events/notifications → queue/reporting hardening → full E2E and production gates.

Do not remove an existing valid workflow merely to make a test pass. Preserve existing functionality, reconcile conflicting paths explicitly, add migrations for durable business rules, and add acceptance tests for every newly closed transition.

## Phase 3 — Application review and correction loop

Implemented on `reconciliation/phase-3-application-review` from the Phase 2 branch.

- Individual and institution applications have explicit reviewer detail/review workflows.
- Reviewers can start review, request correction with a reason, or reject with a reason.
- Individual reviewer detail includes payment state and amendment history.
- Institution reviewer detail includes payment state, amendment history and submitted documents.
- Individual approval is gated by verified payment through the existing approval path.
- Institution approval is now gated by verified payment and verified location.
- Institution review transitions now write status history and audit records with actor identity.
- Individual review start/correction/rejection transitions write audit records.
- Resubmitted applications remain distinct from the original review state and can re-enter review.
- The applicant amendment workflow from the previous increment feeds directly back into the Phase 3 reviewer queue.

Validation is still pending because CI remains intentionally suspended; no claim of build/typecheck/E2E success is made until those checks are executed.
\n\n### Supporting-document increment (before next phase)\n\n- Individual and institution public application forms now provide an optional **Supporting document** field plus **Other attachments** (multiple files).\n- Accepted uploads are PDF, JPEG, PNG, or WebP, with a 10 MB per-file limit enforced server-side.\n- Institution applications reuse the existing `InstitutionDocument` workflow; individual applications now have `RegistrationDocument` records.\n- Each uploaded file is stored on the application document storage path with a generated server-side storage key; the database also records a secure application document URL, MIME type, original file name, size, and timestamp.\n- Applicant upload requests require the registered phone number or applicant first name/tracking-code combination; reviewers receive jurisdiction-protected document access.\n- Supporting documents remain editable in `DRAFT` and correction states, so a correction/resubmission can add missing evidence without replacing the original application record.\n- Reviewer application detail now exposes individual supporting-document metadata alongside payment and amendment history.\n- Database migration: `20261003000000_application_supporting_documents`.\n- Validation is still pending because CI is intentionally suspended; no claim of CI/build validation is made on this branch.\n

### Phase 4 — Reviewer and inspection workflow

Implemented on `reconciliation/phase-4-reviewer-inspection`:

- Unified reviewer queue for individual and institution applications.
- Reviewer detail combines submitted application data, amendment history, supporting documents, payment history/evidence, inspections and audit history.
- Immutable submitted-form snapshots are captured in `ApplicationReviewSnapshot`.
- Structured correction requests are stored in `ApplicationCorrection`, including field-level correction instructions.
- Existing review/reject/approve controls remain available and the unified workspace invokes the authoritative application workflow.
- Institution applications can explicitly require inspection before approval.
- Inspection assignment is restricted to users carrying the `INSPECTOR` role.
- Inspection lifecycle records assignment, schedule, start/completion, findings and PASS/FAIL/CONDITIONAL decision with decision reason.
- Institution approval now blocks when inspection is required but there is no completed acceptable inspection decision.
- Inspection and reviewer actions generate actor-attributed audit events.
- Amendment history models were added so the existing Phase 3 reviewer references are persisted rather than remaining an implicit workflow dependency.
- Migration: `20261003120000_phase4_reviewer_inspection`.

Validation remains pending because project CI is intentionally suspended; this branch has not been represented as CI/build validated.


### Phase 4B — Organization-type-aware inspection and certification

Phase 4 is retained as the reviewer-workspace foundation; **Phase 4B supersedes the earlier generic inspection assumption**.

- Inspection requirement is driven by the active inspection checklist/policy for the application's **InstitutionType**, not by a reviewer manually toggling an application-level flag.
- Every configured organization type has an editable checklist template. Templates are versioned; an inspection stores the exact checklist snapshot used for that inspection.
- Initial seeded organization types are MOSQUE, MADRASA, MOSQUE_MADRASA, ISLAMIC_CENTER, ISLAMIC_EDUCATIONAL_INSTITUTION, ISLAMIC_COMMUNITY_ORGANIZATION, YOUTH_ASSOCIATION and OTHER.
- Initial checklist requirements are editable policy defaults, not hard-coded permanent rules. The Super/National administration can publish a new checklist version and choose whether inspection is required for that organization type.
- An inspector is **not automatically authorized merely because the user has the INSPECTOR role**. An explicit InspectorAssignment is required and can be constrained by organization type and jurisdiction level/ID.
- Assignment supports NATIONAL, REGION, ZONE_CITY, SUBCITY_TOWN, DISTRICT and INSTITUTION scopes. The inspection service rejects an inspector whose active assignment does not match both the application's organization type and its jurisdiction.
- Inspection records persist organization type code/name, checklist template ID, immutable checklist snapshot, responses, findings, decision and a generated organization-type-aware report.
- Completion requires all required checklist items and a final PASS, FAIL or CONDITIONAL decision with a reason.
- Institution approval derives the inspection requirement from the active organization-type checklist and blocks approval when a required inspection is absent or is not COMPLETED with PASS/CONDITIONAL.
- Manual inspectionRequired on the application is no longer the business authority; the type-level policy is authoritative.
- Institution and license credentials now carry the institution type and certificate titles include the organization type. Public credential verification exposes the organization type so a certificate cannot appear detached from the institution's classification.
- Editable checklist administration is available under /admin/settings/inspection-checklists.
- New migration: 20261003140000_phase4b_organization_inspection_certification.
- Validation remains pending because CI is intentionally suspended; this branch must not be described as build/typecheck/E2E validated until those checks are executed.

### Phase 5 — Role-specific UI

Implemented directly on the existing Phase 4B engine branch; no separate Phase 5 branch was created.

The role UI now follows the actual authorization model rather than presenting one generic administrator screen.

- Applicant/member dashboard:
  - personal account and jurisdiction summary;
  - notification count and recent messages;
  - digital ID, application tracking and credential verification shortcuts;
  - plain-language "Continue where you left off" actions;
  - responsive cards with Lucide icons and accessible labels.

- Institution dashboard:
  - institution identity and code;
  - member totals, active members, suspended members and pending relationships;
  - direct links to member management, licensing and notifications;
  - recent institutional member activity;
  - responsive role-focused layout.

- Finance dashboard:
  - finance-specific title and explanation;
  - payment queue surfaced as the primary "Needs action" workflow;
  - payment navigation without exposing unrelated review controls.

- Registrar dashboard:
  - registration/review workspace as the primary action;
  - payment and review navigation;
  - operational metrics scoped through the existing authorization-aware reporting API.

- District reviewer dashboard:
  - district-specific language;
  - review queue as the primary action;
  - reports and local operational metrics;
  - navigation remains constrained by the authenticated role.

- Regional dashboard:
  - regional operations language;
  - review queue, reports and regional-scoped metrics;
  - no manual jurisdiction override is introduced in the UI.

- National dashboard:
  - national operations language;
  - national review queue and cross-region reporting;
  - policy administration remains limited to the roles already authorized by the API.

- Role-specific navigation:
  - navigation sections now use Lucide icons and are filtered by role;
  - review, finance, directory, governance, inspection, reporting, policy and system sections are separated;
  - national policy users can reach inspection checklist administration without receiving Super Admin-only user/platform settings;
  - mobile navigation remains available with icon + label states.

- Modern visual system:
  - polished hero panels, action cards, status pills, live-state indicators and subtle glow/shimmer treatment;
  - responsive layouts for desktop, tablet and mobile;
  - consistent empty/loading/error states;
  - no business authorization is moved into the frontend: API guards remain authoritative.

- Navigation acceptance:
  - added e2e/m5-role-ui.acceptance.spec.ts;
  - covers National Admin, Regional Admin, District Admin, Registrar, Finance Officer, Institution Admin and Member login destinations and role-specific navigation/heading expectations.

- UI dependency:
  - added lucide-react to the web workspace and lockfile for consistent iconography.

Phase 5 validation status: implementation is committed on the current Phase 4B branch, but the repository has not been claimed as CI/typecheck/lint/E2E validated until those checks are actually executed.


### Phase 5 catalog extension — Hierarchy-oriented Members & Users

- Member directory now supports server-side filtering by:
  - Region
  - Zone / City
  - Subcity / Town
  - District
  - registration date range
  - member status
  - name / phone / email / membership number search
- Institution directory now supports server-side filtering by:
  - organization type
  - Region
  - Zone / City
  - Subcity / Town
  - District
  - registration date range
  - institution status
  - institution name / code search
- User/account catalog now supports authorized hierarchical viewing with:
  - role
  - account status
  - jurisdiction level
  - Region / Zone / Subcity / District
  - creation date range
  - email / phone search
- Authorization is enforced server-side before catalog rows or exports are returned. A user cannot widen their catalog by supplying another jurisdiction ID.
- User catalog resolves subordinate geographic scopes so a higher authorized level can see the users belonging to its hierarchy rather than only users sharing the same exact jurisdiction level.
- CSV exports are server-side and use the same filters and authorization boundary as the visible catalog.
- Catalog navigation is exposed only to roles already permitted to view user/account administration; institution users remain within the institution portal.
- Directory filters use the authoritative geography hierarchy and cascading Region → Zone/City → Subcity/Town → District selectors.


### Phase 6 — Membership integrity implementation progress

Started directly on the existing Phase 4B engine branch; no separate Phase 6 branch was created.

Implemented:
- **One active PRIMARY institution invariant** is now enforced at the database layer with a partial unique index on `MemberInstitution(memberId)` for `status = ACTIVE` and `relationshipType = PRIMARY`.
- **Request/approval path** is explicit: `POST /memberships` creates a PENDING relationship and can only be approved through the authorized status-transition endpoint.
- **Direct-add path** is explicit: `POST /memberships/direct` is a separately authorized action and activates the relationship immediately. Institution member management is routed through this centralized membership service rather than maintaining a second mutation implementation.
- **Status transitions are constrained**: PENDING → ACTIVE; ACTIVE → SUSPENDED/ENDED; SUSPENDED → ACTIVE/ENDED; ENDED is terminal.
- **Reasons are mandatory** for suspension and ending.
- **Effective lifecycle dates** are recorded on each membership episode: activation sets `startedAt`, ending records `endedAt`; historical transition records additionally carry `effectiveFrom` / `effectiveTo`.
- **Membership history** is now first-class in `MemberInstitutionHistory`, recording previous/new status, relationship type, effective dates, actor, reason and timestamp. Ended episodes remain historical records; a later re-affiliation creates a new episode rather than reopening the ended record.
- **Audit coverage** records request, direct activation, approval, suspension and ending actions with actor identity and relationship context.
- **Notifications** use the existing notification event system for MEMBERSHIP_REQUESTED, MEMBERSHIP_APPROVED, MEMBERSHIP_SUSPENDED and MEMBERSHIP_ENDED. Where a member has a matching active user account, both the member account and institution users are notified.
- **Institution and membership UIs** now distinguish request/approval from explicit direct addition and collect a reason for suspension/ending.
- **Unit acceptance coverage** was expanded for primary-relationship conflicts, direct activation, lifecycle reasons, effective history and notifications.
- **M6 E2E coverage** now exercises the request → approve → display → suspend → end lifecycle and an explicit direct-add path.

Migration:
- `prisma/migrations/20261003160000_phase6_membership_integrity/migration.sql`

Validation status:
- Code and migration changes are recorded on the current engine branch.
- Prisma validation/generation, migration deployment, typecheck, lint, build and Playwright execution have **not** been run in this environment after the Phase 6 changes, so Phase 6 is not marked CI/build/E2E validated yet.
- The migration intentionally does not auto-select a winner if pre-existing duplicate active PRIMARY relationships exist; the unique index will expose such data as a migration/data-integrity issue rather than silently changing affiliation records.


### Phase 7 — Licensing closure implementation progress

Implemented on the existing engine branch; no separate branch created.

Completed in this increment:
- **Institution self-service license application**: institution administrators can create a licensing application for their own institution from the institution portal. Cross-institution creation is rejected.
- **Licensing inspection linkage**: `Inspection` now supports a first-class `licenseId` relationship, preserving inspection reports directly against the license rather than only against registration/application records.
- **Organization-type inspection reuse**: licensing inspection assignment uses the institution's active organization-type checklist and the same inspector-role/jurisdiction assignment model established in Phase 4B.
- **Inspection assignment endpoint**: `POST /licenses/:id/inspection` assigns an authorized inspector while the license application is under review.
- **Approval gate**: when the active organization-type checklist requires inspection, license approval is blocked until there is a completed inspection using the current checklist template with a PASS or CONDITIONAL decision.
- **Lifecycle remains explicit**: issue, suspend, restore, revoke and renew retain their existing transition guards and audit records.
- **Institution UI** now provides an explicit “Apply for institutional license” entry when no license record exists.
- **Unit coverage** added for self-service licensing and the inspection-required approval gate.

Migration:
- `prisma/migrations/20261003170000_phase7_license_inspection/migration.sql`

Remaining Phase 7 gap:
- **Licensing-specific payment collection/gating** is not yet wired. The current payment subsystem is registration-oriented (`RegistrationPayment`), so this increment does not falsely reuse a registration payment record as a license payment. A dedicated license-payment flow remains for the next licensing/payment increment.
- Required licensing document checklists and a richer license-specific reviewer workspace also remain to be expanded beyond the existing institution document viewer.
- Prisma validation/generation, migration deployment, typecheck, lint, build and Playwright execution have not been run after this increment; Phase 7 is therefore implementation-recorded but not build/CI validated.
