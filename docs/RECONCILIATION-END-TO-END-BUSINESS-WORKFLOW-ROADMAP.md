# EIASC-CRil — Reconciliation: End-to-End Business Workflow & Implementation Roadmap

Repository: Jafermenza/EIASC-CRil
Branch: reconciliation/phase-1-payment
Assessment date: 2026-10-03

Purpose: Reconcile the executable business workflows found in the current implementation with the intended end-to-end operating model, identify workflow gaps, and define the implementation sequence required to close them without weakening existing functionality.

> This is an implementation reconciliation, not a product vision document. A capability is marked implemented only when current code provides the required business transition and supporting controls. Planned items remain planned until code and acceptance tests prove them.

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