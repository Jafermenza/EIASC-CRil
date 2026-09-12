# EIASC-CRil Production Registration & Go-Live Workflow

## 1. Purpose

This document defines the operational sequence for taking EIASC-CRil from a validated production build to controlled registration launch and normal operations.

The platform is an institutional registry and approval system. Production launch must therefore establish the administrative hierarchy, geography, users, approval responsibilities, payment configuration, credential rules, audit controls, backup, and public verification flow **before public registration is opened**.

This is an operational workflow, not a software-development checklist.

---

## 2. Golden rule: sequence before public registration

Do not open public registration immediately after deployment.

The required order is:

1. Validate the release and database migrations.
2. Configure production environment and secrets.
3. Seed/verify the complete geographic hierarchy.
4. Configure institution types and system settings.
5. Create the first Super Admin securely.
6. Create the national administrative users and assign responsibilities.
7. Create regional/zone/district administrators according to the real EIASC structure.
8. Configure registration fees and payment channels.
9. Configure credential/member-card/certificate settings.
10. Verify the complete administrator approval workflow.
11. Run backup/restore and security checks.
12. Run controlled end-to-end registration tests.
13. Approve the production readiness gate.
14. Open registration gradually.
15. Monitor the first registrations and approvals.
16. Move to normal operating procedures.

**No public registration should be opened while a required administrative level, geographic data, payment method, approval responsibility, or recovery mechanism is missing.**

---

## 3. Who does what

### A. Super Admin

The Super Admin is the initial system owner/operator and should be a very small number of trusted people.

Responsibilities:

- system configuration
- create/manage administrative users
- assign roles and jurisdiction
- create/manage geography where operational policy permits
- configure institution types
- configure registration fees
- configure payment methods/bank accounts
- configure credential/member-card/certificate settings
- manage system-wide settings
- review audit logs
- manage security-sensitive configuration
- verify backups and operational readiness

The Super Admin should **not** be used for routine registration processing when a more limited role can perform the work.

### B. National Admin

Responsibilities:

- national-level monitoring
- regional administration
- national reports
- national institution/member oversight
- licensing oversight
- national credential decisions where assigned
- resource-allocation planning
- escalation and exception handling

### C. Regional Admin

Responsibilities:

- manage the assigned region
- review regional registrations
- supervise zones/districts
- monitor institutions and members in the region
- regional reports
- licensing and approval actions within jurisdiction

### D. Zone/City Admin

Responsibilities:

- manage assigned zone/city
- review registrations in jurisdiction
- monitor institutions and members
- licensing and operational workflows within jurisdiction
- reports

### E. District/Woreda Admin

Responsibilities:

- first-line administrative review where assigned
- registration review
- institution/member monitoring
- district reports
- escalation of cases requiring inspection or higher approval

### F. Registrar

Responsibilities:

- registration/application processing
- document/data review
- approval/rejection actions where authorized
- credential issuance/review where authorized
- applicant support

Registrar permissions should be jurisdiction-scoped.

### G. Inspector

Responsibilities:

- inspection-related review where required
- record inspection outcome
- participate in certificate/license publication workflow where authorized

Inspector access must not automatically grant unrestricted system administration.

### H. Institution Admin

Responsibilities:

- manage the institution profile
- manage institution members where authorized
- view institution credentials/license
- manage institution documents and reports
- receive institution notifications

Institution Admin must only access its own institution.

### I. Member / Citizen

Responsibilities:

- submit registration
- provide accurate information
- complete required payment
- retain tracking code
- track application status
- view membership credential after approval
- use public verification when required

Members do not approve their own registration.

---

## 4. Minimum production administrative users

At the beginning of registration, create at least:

| User | Minimum purpose | Jurisdiction |
|---|---|---|
| 1 Super Admin | System ownership/configuration | National/system-wide |
| 1 National Admin | National operations | National |
| 1 Registrar | Registration/application processing | National or assigned jurisdiction |
| 1 Inspector | Inspection workflow if inspections are required | Assigned jurisdiction |
| Regional Admins | Regional operations | One per operational region as needed |
| Zone/City Admins | Zone/city operations | One per active operational area as needed |
| District/Woreda Admins | Local review | One per active operational area as needed |
| Institution Admins | Institution self-service | Created as institutions become active |

### Recommended initial arrangement

For a first controlled launch, do not create hundreds of administrators manually on day one.

Start with:

- 1 primary Super Admin
- 1 backup Super Admin
- 1 National Admin
- 1 Registrar
- 1 Inspector if inspection is part of the approval process
- the minimum regional/zone/district administrators required for the pilot geography

Then add lower-level administrators as the operational rollout expands.

### Security rule

Every human administrator should have an individual account. Do not share one administrator password among multiple staff members.

Use the least-privilege role necessary. Disable or revoke accounts immediately when staff leave or change responsibility.

---

## 5. Production setup sequence

### Phase 0 — Release gate

**Owner:** Technical/Deployment team

Before production deployment:

- confirm the target Git commit/tag
- confirm CI is green
- confirm critical E2E tests are green
- confirm build is successful
- confirm database migrations are reviewed
- confirm security checks are acceptable
- confirm production environment variables are prepared
- confirm backup destination and restore procedure
- confirm monitoring/error logging

Do not treat a failed critical E2E as a production-ready release.

---

### Phase 1 — Production infrastructure

**Owner:** Technical/Deployment team

1. Create production PostgreSQL database.
2. Create restricted production database credentials.
3. Configure `DATABASE_URL`.
4. Configure JWT/authentication secrets.
5. Configure production application URL.
6. Configure email provider if enabled.
7. Configure SMS provider when enabled.
8. Configure payment credentials/secrets.
9. Configure secure cookie/session settings.
10. Configure logging and monitoring.
11. Deploy the exact approved application release.
12. Run database migrations.
13. Confirm health endpoint and application startup.

Never copy development passwords or test secrets into production.

---

### Phase 2 — Geography bootstrap

**Owner:** Super Admin + Technical team

The complete geographic hierarchy must exist before public registration.

Required hierarchy:

`Region → Zone/City → Woreda/District`

Where applicable, subcity/town data is used by the application model.

Verify:

- regions exist
- zones/cities belong to the correct regions
- woredas/districts belong to the correct zone/city
- no orphan geographic records exist
- registration forms can load geography
- cascading selection works
- administrators can see the correct jurisdiction

**Critical rule:** an empty geography dropdown is a launch blocker because citizens cannot complete registration without valid location data.

---

### Phase 3 — Institution types and system configuration

**Owner:** Super Admin

Before registration opens:

- configure approved institution types
- activate/deactivate institution types as policy changes
- confirm institution type labels are understandable to the public
- configure required registration fields
- configure credential titles
- configure certificate/member-card validity
- configure issuing authority
- configure authorized signer/title
- configure seal/signature assets where applicable
- configure location labels

Institution types should be managed as configuration/data, not hard-coded into the public form.

---

### Phase 4 — Create administrators

**Owner:** Super Admin

Create users in this order:

1. backup Super Admin
2. National Admin
3. Registrar
4. Inspector, if required
5. Regional Admins
6. Zone/City Admins
7. District/Woreda Admins
8. Institution Admins as institutions become approved

For every user verify:

- correct role
- correct jurisdiction level
- correct jurisdiction ID
- correct institution ID when applicable
- active account status
- login works
- user cannot access data outside jurisdiction

Run a privilege-boundary test for at least one account at every operational level.

---

## 6. Registration workflow

### Individual registration

`Citizen → Registration form → Geographic selection → Personal information → Payment → Declaration → Submission → Tracking code`

Then:

`Registrar/Admin → Review → Approve/Reject → Approval history → Member record → Membership number → Digital membership credential`

After approval:

`Member → Member portal → Membership card → Print/download`

Public verification:

`Credential number / QR → Public verification → Current validity/status`

### Institution registration

`Institution representative → Institution form → Geographic selection → Institution type → Institution information → Payment → Declaration → Submission → Tracking code`

Then:

`Registrar/Admin → Review → Inspection if required → Approval → License/operational status → Institutional certificate → Authorized publication → QR verification`

A rejected application must retain its decision history and reason.

---

## 7. Payment responsibility

Registration payment must be completed before an application is treated as financially complete.

Supported channels may include:

- Telebirr
- Chapa
- bank transfer

For bank transfer:

- applicant provides transaction/reference number
- payment record is retained
- finance/authorized reviewer can verify it
- approval should not depend on an unverifiable payment claim

### Payment configuration before go-live

Super Admin must configure:

- individual registration fee
- institution registration fee
- active payment channels
- bank name(s)
- account name
- account number
- branch
- provider credentials/secrets where applicable

Run one controlled test for every enabled payment method.

Do not advertise a payment method publicly until its production credentials and reconciliation process are ready.

---

## 8. Approval workflow and separation of duties

The operational rule should be:

`Applicant submits → reviewer checks → decision recorded → credential generated → publication/review where required`

Where policy requires separation of duties, the person who submits data should not be the only person approving the same record.

Every important decision must have:

- actor
- date/time
- action
- affected record
- previous/new state where applicable
- reason/comment where required

Audit logs must be retained.

---

## 9. Credentials and QR verification

### Member

Approved/active member:

`Member active → membership number → membership credential → QR/public verification`

### Institution license

Approved license:

`License approved → certificate generated → pending authorized review → publish → QR/public verification`

### Revocation

If a credential is revoked or expires:

`Public verification → credential not presented as valid`

Never rely only on the printed card/certificate. The public verification service is the authoritative current-status check.

---

## 10. First-day controlled launch

Do not immediately open nationwide registration unless the organization has already tested nationwide operational capacity.

Recommended sequence:

### Pilot

- selected administrative area(s)
- small number of institutions/citizens
- monitor every workflow

### Controlled expansion

- add additional districts/zones/regions
- review support volume
- review approval turnaround
- review payment reconciliation
- review data quality

### General availability

Open the public registration channels after the pilot acceptance criteria are satisfied.

---

## 11. First registrations — who monitors

### Registrar

Monitors:

- incomplete applications
- payment problems
- duplicate submissions
- document/data problems
- applicant questions

### District/Zone/Regional Admin

Monitors:

- pending approvals
- rejected cases
- institution/member counts
- geographic anomalies
- workload

### National Admin

Monitors:

- national registration volume
- regional backlog
- approval turnaround
- active institutions/members
- credential issuance
- payment totals/exception reports

### Super Admin

Monitors:

- system health
- authentication failures
- audit logs
- backup status
- payment integration health
- notification provider health
- security incidents

---

## 12. Daily operating cycle after go-live

### Morning

1. Check application health.
2. Check pending registrations.
3. Check payment exceptions.
4. Check failed notifications.
5. Check pending institution approvals/inspections.
6. Check credential review queue.

### During the day

- process registrations
- verify payments
- review applications
- perform inspections where required
- approve/reject with reasons
- handle applicant support
- monitor system errors

### End of day

- review pending backlog
- review failed payments/notifications
- review critical audit/security events
- confirm backups
- escalate unresolved operational issues

---

## 13. Backup and recovery

Before go-live:

- create a production backup policy
- perform a backup
- restore it into a separate test database
- verify key tables and records
- document restore commands/procedure
- define backup retention
- define who is authorized to restore production

At minimum, protect:

- PostgreSQL data
- uploaded documents/assets where applicable
- production configuration/secrets through an approved secret-management process
- migration history
- operational documentation

A backup that has never been restored is not considered fully validated.

---

## 14. Security controls before go-live

Required checks:

- HTTPS
- strong production secrets
- individual administrator accounts
- least-privilege RBAC
- jurisdiction isolation
- authentication rate limiting
- secure password handling
- token/session controls
- security headers
- audit logging
- credential revocation behavior
- public verification behavior
- dependency/security review
- backup/restore drill

Never publish test credentials, database passwords, API secrets, or provider secrets in Git.

---

## 15. Production readiness checklist

### Technical

- [ ] Approved Git release identified
- [ ] CI green
- [ ] Lint green
- [ ] Typecheck green
- [ ] Unit/integration tests green
- [ ] Critical E2E green
- [ ] Production build green
- [ ] Database migrations applied
- [ ] Health check green
- [ ] Error logging active
- [ ] Monitoring active

### Data

- [ ] Geography seeded
- [ ] Geography verified
- [ ] Institution types configured
- [ ] No orphan geography records
- [ ] Production database backup completed
- [ ] Restore test completed

### Administration

- [ ] Super Admin created
- [ ] Backup Super Admin created
- [ ] National Admin created
- [ ] Registrar created
- [ ] Inspector created if required
- [ ] Regional/zone/district admins created for pilot
- [ ] Role/jurisdiction tests completed

### Registration

- [ ] Individual form tested
- [ ] Institution form tested
- [ ] Cascading geography tested
- [ ] Required fields tested
- [ ] Tracking code tested
- [ ] Application status tracking tested
- [ ] Payment flow tested
- [ ] Approval/rejection tested
- [ ] Approval history tested

### Credentials

- [ ] Membership number generation tested
- [ ] Membership card tested
- [ ] Institutional certificate tested
- [ ] QR verification tested
- [ ] Revocation tested
- [ ] Expiry tested
- [ ] Publication/review workflow tested

### Operations

- [ ] CSV/report export tested
- [ ] Audit logs reviewed
- [ ] Notification failure handling tested
- [ ] Support process defined
- [ ] Escalation contacts defined
- [ ] Go-live owner identified

---

## 16. Go-live approval gate

The system is **GO** only when all critical launch blockers are closed.

### Automatic NO-GO conditions

- critical E2E failure
- production database migration failure
- registration cannot load geography
- administrators cannot log in
- wrong role can access protected data
- payment configuration is unavailable for advertised payment methods
- approval workflow is broken
- credentials cannot be verified publicly
- revoked credentials still verify as valid
- backup cannot be created/restored
- production secrets are exposed

A known non-critical UI improvement can be scheduled after launch, but it must not be used to waive a critical data, security, payment, authorization, registration, or recovery failure.

---

## 17. Ownership matrix

| Area | Primary owner | Backup/oversight |
|---|---|---|
| Production deployment | Technical team | Super Admin |
| Database | Technical team | National Admin/authorized owner |
| Geography | Super Admin | National Admin |
| Users/Roles | Super Admin | National Admin |
| Registration processing | Registrar | Regional/District Admin |
| Inspection | Inspector | Regional/National Admin |
| Institution approval | Authorized admin | Higher jurisdiction |
| Payment configuration | Super Admin/Finance | National Admin |
| Credential publication | Authorized reviewer | National Admin |
| Reports | Jurisdiction admins | National Admin |
| Audit review | Super Admin/National Admin | Authorized leadership |
| Backup/restore | Technical team | Super Admin |
| Public support | Registrar/support team | National Admin |

---

## 18. Important operational principle

EIASC-CRil should be operated as a **national institutional registry**, not as a simple public registration form.

The quality of the system depends on the chain:

`Geography → Users → Jurisdiction → Registration → Payment → Review → Approval → Membership/License → Credential → Public Verification → Audit → Reporting`

If any link in this chain is not configured, the public registration experience may appear functional while the organization cannot actually process applications correctly.

Therefore, administrative setup and operational ownership must be completed **before** public registration is opened.
