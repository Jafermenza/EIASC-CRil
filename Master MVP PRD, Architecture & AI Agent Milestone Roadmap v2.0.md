# EIASC CRil
## Hierarchical Community Registration & Institutional Licensing Platform

# MASTER MVP PRD, ARCHITECTURE & AI AGENT IMPLEMENTATION ROADMAP

**Organization:** Ethiopian Islamic Affairs Supreme Council (EIASC)  
**System:** Community Registration & Institutional Licensing Platform (CRil)  
**Repository:** `Jafermenza/EIASC-CRil`  
**Document Version:** 2.0  
**Status:** **MASTER ENGINEERING BUILD DOCUMENT**  
**MVP Progress:** **M0–M3 COMPLETE**  
**Next Milestone:** **M4 — Institutional Licensing**

---

# 1. DOCUMENT PURPOSE

This is the **single master implementation document** for the EIASC CRil MVP.

It replaces fragmented milestone instructions.

The AI coding agent shall use this document as the authoritative roadmap for completing the MVP.

The agent must:

1. preserve completed functionality;
2. inspect the current repository before modifying existing code;
3. implement milestones sequentially;
4. avoid rebuilding completed milestones unnecessarily;
5. maintain backward compatibility;
6. run tests after every milestone;
7. never invent major institutional or legal rules;
8. never claim completion without verification.

The original PRD establishes the system as an institutional information platform rather than merely a registration form. Its foundation connects verified identity, membership, institutions, jurisdiction, licensing, reporting and future resource allocation.

---

# 2. CURRENT IMPLEMENTATION STATUS

```text
M0  Foundation                    ✓ COMPLETE
M1  Identity & Security           ✓ COMPLETE
M2  Individual Registration       ✓ COMPLETE
M3  Institution Registry          ✓ COMPLETE

M4  Institutional Licensing       ← NEXT
M5  Digital Credentials & QR
M6  Institutional Membership
M7  Reporting & Dashboards
M8  Resource Allocation Engine
M9  Notifications & Services
M10 Production Hardening
```

The AI agent must treat M0–M3 as **existing system capabilities** unless repository inspection proves otherwise.

---

# 3. MVP NORTH STAR

The platform establishes:

```text
IDENTITY
   ↓
MEMBERSHIP
   ↓
INSTITUTION
   ↓
GOVERNANCE
   ↓
LICENSING
   ↓
FINANCE
   ↓
SERVICES
   ↓
DATA
   ↓
INTELLIGENCE
```

The MVP's immediate objective is to establish a trustworthy first institutional layer.

The long-term objective is a unified EIASC digital ecosystem rather than disconnected applications.

---

# 4. SYSTEM ARCHITECTURE

```text
                         PUBLIC USERS
                              │
             ┌────────────────┼─────────────────┐
             │                │                 │
             ▼                ▼                 ▼
        Registration       Tracking        Verification
             │
             ▼
      ┌──────────────────────────────────┐
      │          NEXT.JS WEB             │
      │                                  │
      │ Public Portal                    │
      │ Member Portal                    │
      │ Institution Portal               │
      │ Administrative Portal            │
      └────────────────┬─────────────────┘
                       │
                       ▼
      ┌──────────────────────────────────┐
      │           NESTJS API             │
      │                                  │
      │ Auth                           │
      │ RBAC                           │
      │ Jurisdiction                   │
      │ Registration                   │
      │ Members                        │
      │ Institutions                   │
      │ Licensing                      │
      │ Credentials                    │
      │ Verification                   │
      │ Reporting                      │
      │ Allocation                     │
      │ Notifications                  │
      │ Audit                          │
      └────────────────┬─────────────────┘
                       │
                       ▼
      ┌──────────────────────────────────┐
      │          PRISMA ORM              │
      └────────────────┬─────────────────┘
                       │
                       ▼
      ┌──────────────────────────────────┐
      │          POSTGRESQL              │
      │                                  │
      │ Users                            │
      │ Roles                            │
      │ Geography                        │
      │ Registrations                    │
      │ Members                          │
      │ Institutions                     │
      │ Licenses                         │
      │ Credentials                      │
      │ Memberships                      │
      │ Allocations                      │
      │ Notifications                    │
      │ Audit                            │
      └──────────────────────────────────┘
```

The approved architecture is Next.js + NestJS + PostgreSQL + Prisma, with modular backend boundaries.

---

# 5. ARCHITECTURAL PRINCIPLES

## 5.1 Modular Monolith

MVP shall remain a modular monolith.

Do not introduce microservices merely for architectural appearance.

## 5.2 API-First

Business logic belongs in NestJS services.

Next.js must not independently reproduce business rules.

## 5.3 Server-Side Authorization

Authorization consists of:

```text
Authentication
+
Role
+
Jurisdiction
+
Resource Ownership
+
Workflow State
```

Frontend visibility is not security.

## 5.4 Auditability

Critical actions must create immutable audit evidence.

## 5.5 Policy-Driven Business Rules

Allocation, licensing and other institutional rules should be configurable where appropriate.

Do not hard-code policy percentages or regulatory assumptions.

---

# 6. MILESTONE CONTRACT

Every milestone must contain:

```text
OBJECTIVE
SCOPE
DEPENDENCIES
DATABASE
BACKEND
FRONTEND
WORKFLOW
SECURITY
TESTS
ACCEPTANCE CRITERIA
DEFINITION OF DONE
```

No milestone is complete until all sections pass.

---

# 7. M0 — FOUNDATION

## Status

**✓ COMPLETE**

## Objective

Establish the executable application foundation.

## Expected foundation

```text
Next.js
NestJS
PostgreSQL
Prisma
Environment configuration
Build system
Testing
Linting
Type checking
```

## Acceptance

```text
[✓] Application runs
[✓] API runs
[✓] Database connects
[✓] Prisma works
[✓] Migration works
[✓] Seed works
[✓] Build works
[✓] Test framework works
```

Do not rebuild M0 unless a later milestone exposes a defect.

---

# 8. M1 — IDENTITY & SECURITY

## Status

**✓ COMPLETE**

## Objective

Create secure identity and administrative authorization.

## Components

```text
User
Role
Permission
Authentication
RBAC
Jurisdiction
Audit foundation
```

## Roles

Initial roles:

```text
SUPER_ADMIN
NATIONAL_ADMIN
REGIONAL_ADMIN
ZONE_ADMIN
DISTRICT_ADMIN
REGISTRAR
INSPECTOR
FINANCE_OFFICER
INSTITUTION_ADMIN
MEMBER
```

The original requirements explicitly require server-side role and jurisdiction enforcement.

## Acceptance

```text
[✓] Login
[✓] Password hashing
[✓] Protected API
[✓] RBAC
[✓] Jurisdiction isolation
[✓] Unauthorized access rejected
[✓] Audit foundation
```

---

# 9. M2 — INDIVIDUAL REGISTRATION

## Status

**✓ COMPLETE**

## Objective

Create the first complete citizen/member registration vertical slice.

## Flow

```text
Public
 ↓
Registration
 ↓
Validation
 ↓
Tracking Code
 ↓
Review
 ↓
Correction / Rejection / Approval
 ↓
Member
```

## Required data

- name;
- phone;
- birth date;
- age;
- gender;
- marital status;
- education;
- employment;
- address;
- geographic hierarchy;
- institution affiliation;
- approved identity identifier where applicable;
- declaration.

These fields are consistent with the approved individual-registration requirements.

## Acceptance

```text
[✓] Registration
[✓] Tracking code
[✓] Geographic validation
[✓] Duplicate handling
[✓] Review
[✓] Correction
[✓] Approval
[✓] Member creation
```

---

# 10. M3 — INSTITUTION REGISTRY

## Status

**✓ COMPLETE**

## Objective

Create the authoritative institution registry.

## Supported types

Configurable reference data:

```text
MOSQUE
MADRASA
MOSQUE_MADRASA
ISLAMIC_CENTER
ISLAMIC_EDUCATIONAL_INSTITUTION
ISLAMIC_COMMUNITY_ORGANIZATION
YOUTH_ASSOCIATION
OTHER
```

## Institution hierarchy

```text
Region
 ↓
Zone / City
 ↓
Sub-city / Town
 ↓
District / Woreda
 ↓
Institution
```

## Institution profile

Must support:

```text
Identity
Location
Contact
Leadership
Staff
Educational information
Documents
Status
Registration
```

The institution registry must become the authoritative parent for institutional membership, licensing and later allocation.

## Acceptance

```text
[✓] Institution registration
[✓] Institution type
[✓] Geographic hierarchy
[✓] Leadership
[✓] Staff
[✓] Documents
[✓] Review
[✓] Approval
[✓] Institution profile
```

---

# 11. M4 — INSTITUTIONAL LICENSING

## Status

**COMPLETE**

## Objective

Transform an approved institution into a formally trackable licensed institution.

This is the next engineering priority.

---

## 11.1 Licensing Model

```text
Institution
     │
     ▼
Eligibility
     │
     ▼
License Application
     │
     ▼
Review
     │
     ├── Correction
     │
     ├── Rejection
     │
     └── Approval
             │
             ▼
        ACTIVE LICENSE
```

---

## 11.2 License States

```text
PENDING
ACTIVE
EXPIRED
SUSPENDED
REVOKED
```

Transitions:

```text
PENDING
  ↓
ACTIVE
  ↓
SUSPENDED
  ↓
RESTORED → ACTIVE
```

Alternative:

```text
ACTIVE → EXPIRED
ACTIVE → REVOKED
SUSPENDED → REVOKED
```

Invalid transitions must be rejected.

---

## 11.3 License Data Model

Create:

```text
License
```

Fields:

```text
id
licenseNumber
institutionId
licenseType
status
issuedAt
effectiveFrom
expiresAt
suspendedAt
revokedAt
reason
issuedBy
approvedBy
createdAt
updatedAt
```

Constraints:

```text
licenseNumber UNIQUE
institutionId indexed
status indexed
expiresAt indexed
```

---

## 11.4 License Number

Format:

```text
EIASC-L-YYYY-XXXXXX
```

Example:

```text
EIASC-L-2026-8F42K7
```

Must be:

- unique;
- non-sequential;
- unpredictable;
- indexed.

---

## 11.5 Licensing API

```text
GET    /api/v1/licenses
GET    /api/v1/licenses/:id

POST   /api/v1/licenses
POST   /api/v1/licenses/:id/issue
POST   /api/v1/licenses/:id/suspend
POST   /api/v1/licenses/:id/restore
POST   /api/v1/licenses/:id/revoke
POST   /api/v1/licenses/:id/renew
```

---

## 11.6 Authorization

National administrators:

```text
All institutions
```

Regional administrators:

```text
Assigned region
```

Zone administrators:

```text
Assigned zone
```

District administrators:

```text
Assigned district
```

Institution administrators:

```text
Own institution
```

Institution administrators cannot issue their own license.

---

## 11.7 Licensing UI

Add:

```text
/admin/licenses
/admin/licenses/[id]
```

Institution profile:

```text
License
├── Status
├── License Number
├── Issue Date
├── Expiry Date
├── Issuing Authority
├── Documents
└── Actions
```

Actions must be state-aware.

---

## 11.8 Licensing Acceptance

M4 is complete when:

```text
[x] Eligible institution identified
[x] License application created
[x] License reviewed
[x] Correction supported
[x] Approval supported
[x] License issued
[x] License number generated
[x] Expiration supported
[x] Renewal supported
[x] Suspension supported
[x] Restoration supported
[x] Revocation supported
[x] Authorization tested
[x] Audit created
[x] UI completed
[x] API tested
[x] E2E test passes
```

---

# 12. M5 — DIGITAL CREDENTIALS & QR

## Objective

Create trustworthy digital credentials for:

```text
Member
Institution
License
```

---

## 12.1 Member Credential

Format:

```text
EIASC-M-YYYY-XXXXXXXX
```

Displays:

```text
EIASC
Islamic Community Membership

Name
Membership Number
Institution
Status
QR
```

---

## 12.2 Institution Credential

Certificate:

```text
ETHIOPIAN ISLAMIC AFFAIRS SUPREME COUNCIL

OPERATIONAL CERTIFICATE

Institution
Institution Code
Location
Certificate Number
Status
Issue Date
Expiry
QR
Authorized Signature
```

Actual legal wording, seal and official design require EIASC approval.

---

## 12.3 QR

QR contains:

```text
Secure verification token
```

Never:

```text
Phone
National ID
Private address
Password
Sensitive personal information
```

The approved PRD explicitly requires secure-reference QR codes and public verification limited to approved information.

---

## 12.4 Verification

Route:

```text
/verify/[token]
```

Response:

```text
VERIFIED
Credential Type
Public Name
Institution
Status
Issued
Expires
```

Revoked:

```text
REVOKED
This credential is no longer valid.
```

---

## 12.5 Printing

Support:

```text
Membership card
A4 certificate
```

Use:

```css
@media print
```

Hide:

- navigation;
- buttons;
- dashboard controls.

---

## M5 Acceptance

```text
[ ] Member credential
[ ] Institution certificate
[ ] Unique credential identifiers
[ ] QR generation
[ ] Public verification
[ ] Revocation verification
[ ] Print layout
[ ] Security tests
[ ] E2E verification test
```

---

# 13. M6 — INSTITUTIONAL MEMBERSHIP

## Objective

Connect approved members to approved institutions with historical relationship tracking.

Model:

```text
Member
   ↕
MemberInstitution
   ↕
Institution
```

The relationship must preserve history rather than overwrite previous affiliations.

---

## 13.1 Membership Record

Fields:

```text
id
memberId
institutionId
membershipType
status
startedAt
endedAt
isPrimary
createdAt
updatedAt
```

---

## 13.2 Status

```text
PENDING
ACTIVE
SUSPENDED
ENDED
```

---

## 13.3 Institution Dashboard

Display:

```text
Total Members
Active Members
Pending Members
Suspended Members
```

Institution administrator may:

- view members;
- request affiliation;
- update permitted institutional information.

Cannot:

- approve own institutional license;
- manipulate membership merely to affect allocation;
- access unrelated institutions.

---

## M6 Acceptance

```text
[ ] Member-institution relationship
[ ] Historical relationships
[ ] Institution member list
[ ] Membership status
[ ] Institution statistics
[ ] Authorization
[ ] Audit
[ ] E2E tests
```

---

# 14. M7 — REPORTING & DASHBOARDS

## Objective

Turn the registry into an institutional intelligence platform.

---

## 14.1 National Dashboard

KPIs:

```text
Total Members
Active Members
Institutions
Active Institutions
Pending Applications
Approved
Rejected
Active Licenses
Expired Licenses
Suspended Licenses
```

---

## 14.2 Regional Dashboard

```text
Members
Institutions
Districts
Registration trend
Institution types
Licenses
```

---

## 14.3 District Dashboard

```text
Institutions
Members
Applications
Licenses
```

---

## 14.4 Institution Dashboard

```text
Members
Membership status
License
Credential
Institution information
```

---

## 14.5 Reports

Required dimensions:

```text
Registration
Membership
Institution
Licensing
Geography
Trend
```

The approved requirements specify reporting at national, regional, district and institutional levels.

---

## 14.6 Performance

Large reports must use:

```text
server-side filtering
server-side pagination
indexed queries
aggregation queries
```

Do not load the entire national dataset into the browser.

---

## M7 Acceptance

```text
[ ] National dashboard
[ ] Regional dashboard
[ ] District dashboard
[ ] Institution dashboard
[ ] Registration analytics
[ ] Membership analytics
[ ] Institution analytics
[ ] Licensing analytics
[ ] Geographic aggregation
[ ] Role-specific visibility
[ ] Performance tested
```

---

# 15. M8 — RESOURCE ALLOCATION ENGINE

## Objective

Convert verified institutional/member data into controlled and reproducible allocation calculations.

This is **not payment settlement**.

---

# 15.1 Allocation Flow

```text
Verified Data
      ↓
Eligibility
      ↓
Allocation Policy
      ↓
Calculation
      ↓
Preview
      ↓
Review
      ↓
Approval
      ↓
Finalized Allocation
```

This follows the approved allocation architecture.

---

# 15.2 Inputs

Potential inputs:

```text
Active Members
Eligible Institutions
Geographic Jurisdiction
Funding Pool
Allocation Policy
Policy Version
Calculation Period
```

---

# 15.3 Policy

Create:

```text
AllocationPolicy
```

Fields:

```text
id
name
version
status
effectiveFrom
effectiveTo
eligibilityRules
formulaDefinition
createdBy
approvedBy
createdAt
```

---

# 15.4 Allocation Run

Create:

```text
AllocationRun
```

Fields:

```text
id
policyId
policyVersion
period
fundingPool
eligibleMemberCount
basePerMemberAmount
equalizationPool
totalAllocated
status
calculatedAt
approvedAt
calculatedBy
approvedBy
```

---

# 15.5 Allocation Result

```text
ResourceAllocation
```

Fields:

```text
id
allocationRunId
institutionId
eligibleMemberCount
baseAmount
equalizationAmount
totalAmount
```

---

# 15.6 Critical Rule

**Never hard-code allocation percentages in the frontend or business logic.**

The system must retrieve the approved policy and preserve its version.

---

# 15.7 Immutability

Once finalized:

```text
AllocationRun
```

must not be silently overwritten.

Corrections require a new controlled run/version.

---

# 15.8 M8 Acceptance

```text
[ ] Allocation policy
[ ] Policy version
[ ] Funding pool
[ ] Eligible members
[ ] Calculation
[ ] Preview
[ ] Review
[ ] Approval
[ ] Allocation results
[ ] Historical preservation
[ ] Audit
[ ] Reproducibility
[ ] Authorization
[ ] E2E tests
```

---

# 16. M9 — NOTIFICATIONS & SERVICES

## Objective

Create the communication layer for the MVP.

---

# 16.1 MVP Channels

Primary:

```text
In-app
Email where configured
```

The architecture must permit:

```text
SMS
Push
USSD
```

later.

---

# 16.2 Events

Notifications should be generated for:

```text
Registration Received
Correction Required
Application Approved
Application Rejected
Credential Issued
License Issued
License Expiring
Membership Renewal Reminder
```

---

# 16.3 Notification Model

```text
Notification
```

Fields:

```text
id
recipientId
channel
type
title
message
status
sentAt
readAt
metadata
createdAt
```

---

# 16.4 Notification Architecture

```text
Business Event
      ↓
Notification Service
      ↓
Channel Adapter
      ├── In-App
      ├── Email
      ├── Future SMS
      ├── Future Push
      └── Future USSD
```

Do not put email/SMS implementation directly inside registration services.

---

# 16.5 M9 Acceptance

```text
[ ] In-app notifications
[ ] Email adapter
[ ] Registration notification
[ ] Correction notification
[ ] Approval notification
[ ] Rejection notification
[ ] Credential notification
[ ] License notification
[ ] Expiry reminder
[ ] Notification history
[ ] Read/unread
[ ] Failure handling
```

---

# 17. M10 — PRODUCTION HARDENING

## Objective

Transform the MVP from a development system into a production-ready institutional platform.

---

# 17.1 Security

Test:

```text
Authentication
Authorization
RBAC
Jurisdiction isolation
Horizontal privilege escalation
Vertical privilege escalation
JWT security
SQL injection
XSS
CSRF where applicable
Rate limiting
File upload attacks
Credential-token guessing
ID enumeration
Document access
```

These security test categories are already required by the approved PRD.

---

# 17.2 Logging

Every API request should support:

```text
timestamp
level
service
requestId
userId
endpoint
statusCode
duration
error
```

Never log:

```text
passwords
tokens
sensitive identity numbers
private documents
complete personal records
```



---

# 17.3 Request ID

Every request:

```text
X-Request-ID
```

Example:

```text
6b2f0b1e-...
```

---

# 17.4 File Security

Uploaded files must:

- have size limits;
- have allowed MIME types;
- be renamed;
- use generated storage keys;
- be stored outside executable directories;
- require authorization.



---

# 17.5 Backup

Minimum:

```text
Daily PostgreSQL backup
Weekly independent backup
Periodic restore test
```

A backup is not considered reliable until restoration has been successfully tested.

---

# 17.6 Disaster Recovery

Initial target:

```text
RPO ≤ 24 hours
RTO ≤ 8 hours
```

These targets can become stricter as the platform grows.

---

# 17.7 Performance

Targets:

```text
Normal API < 500ms target
Normal page < 2 seconds target
```

Use:

```text
Indexes
Pagination
Efficient joins
Server-side filtering
Caching where appropriate
```



---

# 17.8 Observability

Production must answer:

```text
Is the system running?
Is the database healthy?
Are registrations failing?
Are APIs slow?
Who performed an administrative action?
```

Required:

```text
Application logs
Error monitoring
Database monitoring
Server monitoring
Uptime monitoring
Audit logs
```

---

# 17.9 M10 Acceptance

```text
[ ] Security audit
[ ] Performance testing
[ ] Backup
[ ] Restore test
[ ] Monitoring
[ ] Logging
[ ] Error tracking
[ ] SSL/HTTPS
[ ] Production environment
[ ] Deployment documentation
[ ] Operations documentation
[ ] Disaster recovery procedure
[ ] UAT
[ ] Final release gate
```

---

# 18. COMPLETE MILESTONE ROADMAP

```text
M0  Foundation
    │
    ▼
M1  Identity & Security
    │
    ▼
M2  Individual Registration
    │
    ▼
M3  Institution Registry
    │
    ▼
M4  Institutional Licensing
    │
    ▼
M5  Digital Credentials & QR
    │
    ▼
M6  Institutional Membership
    │
    ▼
M7  Reporting & Dashboards
    │
    ▼
M8  Resource Allocation Engine
    │
    ▼
M9  Notifications & Services
    │
    ▼
M10 Production Hardening
    │
    ▼
        MVP RELEASE
```

---

# 19. DEPENDENCY GRAPH

```text
M0
 │
 ▼
M1
 │
 ├───────────────┐
 ▼               ▼
M2              M3
 │               │
 └───────┬───────┘
         ▼
        M4
         │
         ▼
        M5
         │
         ▼
        M6
         │
     ┌───┴────┐
     ▼        ▼
    M7       M8
     │        │
     └───┬────┘
         ▼
        M9
         │
         ▼
        M10
```

---

# 20. DATABASE EVOLUTION

The database should evolve approximately as:

```text
M0
User
Role

M1
Permission
Jurisdiction
AuditLog

M2
Registration
Member

M3
Institution
InstitutionType
InstitutionStaff
InstitutionDocument

M4
License

M5
Credential
VerificationToken

M6
MemberInstitution

M7
Reporting/Aggregation structures as needed

M8
AllocationPolicy
AllocationRun
ResourceAllocation

M9
Notification

M10
Operational/monitoring support
```

Do not create unnecessary denormalized tables before performance evidence requires them.

---

# 21. API VERSIONING

Base:

```text
/api/v1
```

Core namespaces:

```text
/auth
/users
/roles
/locations
/registrations
/members
/institutions
/licenses
/credentials
/verify
/reports
/allocation-policies
/allocation-runs
/allocations
/notifications
/audit
```

Future reserved namespaces:

```text
/payments
/waqf
/welfare
/education
/hajj
/gis
/ai
```

The original architecture specifically reserves future namespaces without requiring them in MVP.

---

# 22. FRONTEND ROUTE MAP

```text
/
├── register/
│   ├── individual/
│   └── institution/
│
├── track/
│
├── verify/
│   └── [token]/
│
├── login/
│
├── member/
│   ├── profile/
│   └── credential/
│
├── institution/
│   ├── profile/
│   ├── members/
│   ├── license/
│   └── credential/
│
└── admin/
    ├── dashboard/
    ├── registrations/
    ├── members/
    ├── institutions/
    ├── licenses/
    ├── allocations/
    ├── reports/
    ├── audit/
    └── settings/
```

---

# 23. UI/UX MASTER STANDARD

The platform shall have a premium institutional interface.

## Brand

Primary:

**Sophisticated light green**

Theme modes:

```text
LIGHT
SYSTEM
DARK
```

The approved PRD requires responsive, mobile-first, accessible, multilingual-ready, low-bandwidth design and WCAG 2.2 AA targeting.

---

# 24. DESIGN LANGUAGE

Visual characteristics:

```text
Clean
Modern
Trustworthy
Institutional
Elegant
Minimal
Accessible
Mobile-first
```

Use:

- cards;
- clear hierarchy;
- generous spacing;
- modern tables;
- meaningful status badges;
- contextual actions;
- responsive navigation;
- subtle transitions;
- strong typography.

Avoid:

- excessive gradients;
- excessive animation;
- clutter;
- tiny text;
- unnecessary dashboards;
- visual overload.

---

# 25. LANGUAGE ARCHITECTURE

Must support:

```text
English
Amharic
Afaan Oromo
Arabic
```

Arabic:

```text
RTL
```

Visible text must not be embedded directly inside business logic.

---

# 26. AI CODING AGENT MASTER PROTOCOL

This section is mandatory.

The AI agent shall execute:

```text
1. READ THIS DOCUMENT
2. INSPECT REPOSITORY
3. INSPECT COMPLETED MILESTONES
4. IDENTIFY CURRENT GAP
5. IMPLEMENT ONLY NEXT MILESTONE
6. RUN DATABASE MIGRATION
7. RUN UNIT TESTS
8. RUN INTEGRATION TESTS
9. RUN E2E TESTS
10. RUN LINT
11. RUN TYPE CHECK
12. RUN PRODUCTION BUILD
13. REVIEW SECURITY
14. REPORT RESULTS
15. COMMIT
16. MOVE TO NEXT MILESTONE
```

---

# 27. AI AGENT MUST NOT REBUILD COMPLETED MILESTONES

Because:

```text
M0 ✓
M1 ✓
M2 ✓
M3 ✓
```

the next task is:

```text
M4
```

The agent must not:

- redesign M1;
- replace working authentication;
- replace M2;
- rewrite M3;
- migrate frameworks without reason.

It should extend the existing system.

---

# 28. AI AGENT TASK FORMAT

For every milestone the agent should begin with:

```text
MILESTONE: M4
NAME: Institutional Licensing

CURRENT STATE:
[repository findings]

OBJECTIVE:
[objective]

FILES TO CHANGE:
[list]

DATABASE CHANGES:
[list]

API CHANGES:
[list]

UI CHANGES:
[list]

SECURITY CHANGES:
[list]

TESTS:
[list]

ACCEPTANCE:
[list]
```

Then implement.

---

# 29. AI AGENT COMPLETION REPORT

After each milestone:

```text
MILESTONE:
STATUS:

IMPLEMENTED:
-

DATABASE:
-

API:
-

UI:
-

SECURITY:
-

TESTS:
-

BUILD:
PASS / FAIL

LINT:
PASS / FAIL

TYPE CHECK:
PASS / FAIL

E2E:
PASS / FAIL

KNOWN ISSUES:
-

NEXT MILESTONE:
-
```

The agent must never report `COMPLETE` while a mandatory test is failing.

---

# 30. GIT RULES

Recommended branches:

```text
main
develop
feature/m4-institutional-licensing
feature/m5-credentials
feature/m6-membership
...
```

One logical milestone or feature should be represented by controlled commits.

Commit examples:

```text
feat(licensing): add license domain model
feat(licensing): add license workflow
feat(licensing): add license administration UI
test(licensing): add lifecycle e2e tests
```

---

# 31. TESTING PYRAMID

```text
             E2E
            /   \
       Integration
        /         \
       Unit Tests
```

Every important business rule must have unit coverage.

Every important workflow must have integration/E2E coverage.

---

# 32. CROSS-MILESTONE REGRESSION TEST

At the end of every milestone, the agent must verify:

```text
M0 tests
+
M1 tests
+
M2 tests
+
M3 tests
+
Current milestone tests
```

A new milestone must not break completed capabilities.

---

# 33. MASTER END-TO-END SCENARIO

At MVP completion:

```text
PUBLIC USER
    │
    ▼
REGISTER
    │
    ▼
TRACKING CODE
    │
    ▼
ADMIN REVIEW
    │
    ├── CORRECTION
    │       ↓
    │   RESUBMISSION
    │
    ▼
APPROVAL
    │
    ▼
MEMBER
    │
    ▼
MEMBERSHIP
    │
    ▼
CREDENTIAL
    │
    ▼
QR VERIFICATION


INSTITUTION
    │
    ▼
REGISTRATION
    │
    ▼
REVIEW
    │
    ▼
APPROVAL
    │
    ▼
LICENSE
    │
    ▼
CERTIFICATE
    │
    ▼
QR VERIFICATION
    │
    ▼
MEMBERS
    │
    ▼
REPORTING
    │
    ▼
ALLOCATION
    │
    ▼
NOTIFICATIONS
```

---

# 34. MASTER SECURITY RULES

The system shall never:

```text
Expose passwords
Expose tokens
Expose sensitive identity numbers
Expose private documents
Trust client-side authorization
Trust client-side geography
Allow arbitrary status changes
Allow self-approval
Allow allocation manipulation
Allow credential-token guessing
Allow unauthorized document access
Delete ordinary audit history
```

These rules are consistent with the approved AI-agent non-negotiable rules.

---

# 35. MASTER BUSINESS RULES

```text
BR-001
Only approved members become active.

BR-002
Only approved institutions become active.

BR-003
Only active members count toward normal allocation.

BR-004
Suspended/revoked institutions are excluded from normal active allocation.

BR-005
Revoked credentials cannot verify as active.

BR-006
Every approval is audited.

BR-007
Every rejection requires a reason.

BR-008
Every revocation requires a reason.

BR-009
Geographic relationships are validated server-side.

BR-010
Users cannot approve their own submissions.

BR-011
Allocation calculations reference a policy version.

BR-012
Historical allocation calculations cannot be silently overwritten.
```

These are derived directly from the approved business rules.

---

# 36. MASTER MVP RELEASE CHECKLIST

## Product

```text
[ ] Individual registration
[ ] Institution registration
[ ] Application tracking
[ ] Membership
[ ] Institution registry
[ ] Licensing
[ ] Credentials
[ ] QR verification
[ ] Institutional membership
[ ] Reporting
[ ] Allocation
[ ] Notifications
```

## Security

```text
[ ] Authentication
[ ] RBAC
[ ] Jurisdiction
[ ] Ownership
[ ] Workflow security
[ ] Rate limiting
[ ] Secure documents
[ ] Audit
```

## UX

```text
[ ] Mobile
[ ] Desktop
[ ] Light mode
[ ] Dark mode
[ ] System theme
[ ] Accessibility
[ ] Localization architecture
[ ] RTL support
```

## Operations

```text
[ ] HTTPS
[ ] Backup
[ ] Restore
[ ] Monitoring
[ ] Logging
[ ] Error tracking
[ ] Performance
[ ] Deployment
```

---

# 37. FINAL MVP ACCEPTANCE

The MVP is successful when EIASC can answer, through controlled and auditable data:

### WHO?

Verified member/institution identity.

### WHERE?

Exact administrative and institutional affiliation.

### STATUS?

Pending / Active / Suspended / Revoked.

### LICENSE?

Valid institutional authorization status.

### CREDENTIAL?

Digitally verifiable.

### HOW MANY?

Verified members and institutions.

### WHERE ARE THEY?

Distribution by administrative and institutional hierarchy.

### WHAT CAN BE ALLOCATED?

Resource allocation based on an approved reproducible policy.

### WHO CHANGED WHAT?

Complete administrative audit trail.

These questions define the approved system's definition of success.

---

# 38. LEGAL / GOVERNANCE SAFEGUARD

The software does not itself create legal authority.

Before production enforcement of:

- institutional licensing;
- property restrictions;
- banking restrictions;
- mandatory membership;
- financial obligations;

EIASC must establish:

```text
Legal Authority
+
Policy
+
Regulation
+
Procedure
+
Digital Enforcement
```

The software must implement the approved institutional framework, not invent it.

---

# 39. POST-MVP ROADMAP

After M10, the platform can expand into:

```text
M11 Payments
M12 USSD
M13 Mobile Application
M14 Fayda Integration
M15 Hajj Services
M16 Umrah Services
M17 Zakat
M18 Waqf
M19 Education
M20 Welfare
M21 GIS
M22 Advanced Analytics
M23 AI-Assisted Administration
```

These future services must consume the same governed identity, institution and jurisdiction foundation rather than creating independent registries.

---

# 40. FUTURE PAYMENT ARCHITECTURE

```text
Member
  ↓
Payment Provider
  ↓
Payment Service
  ↓
Transaction
  ↓
Ledger
  ↓
Allocation Engine
```

Provider abstraction:

```text
PaymentProviderInterface
```

This allows multiple Ethiopian payment providers to be added without changing core membership logic.

---

# 41. FUTURE USSD

```text
Feature Phone
     ↓
USSD Gateway
     ↓
USSD Adapter
     ↓
NestJS API
     ↓
Membership Service
```

USSD must consume the same business logic as web/mobile.

---

# 42. FUTURE MOBILE

```text
Web
 │
 ├─────────┐
 │         ▼
Mobile → API
 │
USSD ──────┘
```

No duplicated business rules.

---

# 43. FUTURE AI

AI sits above governed data:

```text
PostgreSQL
     +
Approved Documents
     +
Policies
     +
Knowledge Base
        ↓
AI Retrieval Layer
        ↓
AI Assistant
        ↓
Authorized User
```

AI must never directly modify critical institutional records without controlled workflows.

---

# 44. MASTER AI AGENT COMMAND

When this document is supplied to an AI coding agent, the instruction is:

> **You are the principal engineering agent for EIASC CRil.**
>
> Treat this document as the authoritative MVP implementation roadmap.
>
> M0, M1, M2 and M3 are complete.
>
> Do not rebuild them unless repository inspection identifies a concrete defect required by the current milestone.
>
> Begin with **M4 — Institutional Licensing**.
>
> Inspect the repository first.
>
> Reuse existing architecture, authentication, authorization, institution registry and design system.
>
> Implement only the M4 scope.
>
> Run migrations, tests, lint, type checking and production build.
>
> Verify authorization and audit behavior.
>
> Do not invent legal licensing authority or undocumented institutional rules.
>
> When M4 passes all acceptance criteria, report completion and proceed to M5.
>
> Continue sequentially through M10.
>
> Never skip a milestone.
>
> Never claim success without executable verification.

---

# 45. MASTER IMPLEMENTATION SEQUENCE

```text
                 CURRENT
                    │
                    ▼
              M0 ✓ COMPLETE
                    │
                    ▼
              M1 ✓ COMPLETE
                    │
                    ▼
              M2 ✓ COMPLETE
                    │
                    ▼
              M3 ✓ COMPLETE
                    │
                    ▼
          ┌────────────────────┐
          │ M4 LICENSING       │ ← START HERE
          └─────────┬──────────┘
                    ▼
          ┌────────────────────┐
          │ M5 CREDENTIALS/QR  │
          └─────────┬──────────┘
                    ▼
          ┌────────────────────┐
          │ M6 MEMBERSHIP      │
          └─────────┬──────────┘
                    ▼
          ┌────────────────────┐
          │ M7 REPORTING       │
          └─────────┬──────────┘
                    ▼
          ┌────────────────────┐
          │ M8 ALLOCATION      │
          └─────────┬──────────┘
                    ▼
          ┌────────────────────┐
          │ M9 NOTIFICATIONS   │
          └─────────┬──────────┘
                    ▼
          ┌────────────────────┐
          │ M10 HARDENING      │
          └─────────┬──────────┘
                    ▼
             MVP PRODUCTION
```

# 46. FINAL DIRECTIVE

**M0–M3 are considered complete.**

Therefore, the engineering agent's next assignment is:

## **M4 — Institutional Licensing**

Do not start M5 until M4's:

```text
Database
API
Workflow
Authorization
UI
Audit
Tests
Build
Acceptance Criteria
```

all pass.

Do not start M6 until M5 passes.

Do not start M7 until M6 passes.

Continue this discipline through M10.

**The objective is not maximum code. The objective is a secure, auditable, maintainable and genuinely usable institutional platform.**

**Bismillah.**