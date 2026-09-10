CRil Platform
(EIASC Community Registration & Institutional Licensing Platform)
Definitive MVP Product Requirements & Architecture Build Specification
Organization: Ethiopian Islamic Affairs Supreme Council (EIASC)
System: Community Registration & Institutional Licensing Platform (CRil)

Version: MVP v1.1
Status: DEFINITIVE BUILD BASELINE
Development Principle: Bismillah — build a secure, trustworthy and extensible foundation first.

1. PURPOSE OF THIS DOCUMENT
This document is the authoritative implementation specification for the EIASC CRil MVP.
It defines exactly what shall be built in the first operational release.
It shall be used by:
software engineers;
software architects;
UI/UX developers;
database developers;
QA engineers;
DevOps engineers;
project managers;
AI coding agents.
The implementation team shall use this document together with the approved architecture and repository.
No major feature shall be invented by an AI coding agent merely because it appears desirable.
If a requirement is not explicitly included in the MVP scope or required to support an included MVP feature, it belongs in the Future / Post-MVP Backlog.

2. THE DEFINITIVE MVP
2.1 MVP Definition
The EIASC CRil MVP shall be a working digital institutional registry capable of answering:
WHO?
Who is a registered community member?
WHERE?
Where is the member institutionally and geographically affiliated?
WHICH INSTITUTION?
Which mosque, madrasa, Islamic center or other approved institution is the member connected to?
WHAT STATUS?
Is the member:
Pending;
Active;
Suspended;
Revoked?
WHICH INSTITUTIONS?
Which Islamic institutions are registered and verified?
WHICH LICENSE?
Is an institution:
Pending;
Active;
Expired;
Suspended;
Revoked?
WHICH CREDENTIAL?
Can a member or institution credential be electronically verified?
HOW MANY?
How many verified members and institutions exist?
WHERE ARE THEY?
How are members and institutions distributed by:
Region;
Zone/City;
Sub-city/Town;
District/Woreda;
Institution?
WHO CHANGED WHAT?
What administrator performed a critical action?

3. MVP CORE
The MVP consists of exactly these core capabilities:
1. Public Registration
2. Administrative Hierarchy
3. Individual Registry
4. Institution Registry
5. Application Workflow
6. Membership
7. Institutional Licensing
8. Digital Credentials
9. QR/Public Verification
10. Hierarchical Administration
11. Reporting
12. Allocation Calculation Framework
13. Audit Logging
14. Authentication & Authorization
15. Responsive Multilingual-Ready UI

Everything else is secondary.

4. MVP PRODUCT FLOW
The complete MVP journey is:
                   PUBLIC
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   Individual                  Institution
   Registration                Registration
          │                       │
          └───────────┬───────────┘
                      ▼
                 APPLICATION
                      │
                      ▼
                 UNDER REVIEW
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
       CORRECTION            APPROVAL
            │                   │
            ▼                   ▼
       RESUBMISSION        VERIFIED RECORD
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
                 MEMBER                 INSTITUTION
                    │                       │
                    ▼                       ▼
               CREDENTIAL                LICENSE
                    │                       │
                    └───────────┬───────────┘
                                ▼
                         QR VERIFICATION
                                │
                                ▼
                         REPORTING / DATA
                                │
                                ▼
                         ALLOCATION ENGINE

This is the MVP backbone.

5. MVP BOUNDARY
5.1 MUST BE BUILT
The following are mandatory.
Public
homepage;
individual registration;
institution registration;
application tracking;
credential verification;
institution verification;
public institution directory/search where approved;
help;
privacy;
terms.
Identity
member record;
member status;
member number;
profile;
institution affiliation.
Institutions
institution record;
institution type;
location;
leadership;
staff summary;
institution status;
member population;
license.
Administration
authentication;
role-based access;
jurisdiction-based access;
registration review;
approval;
correction;
rejection;
revocation;
institution management;
member management;
licensing;
audit.
Credentials
member credential;
institution certificate;
QR verification;
public verification.
Reporting
national;
regional;
zone/city;
district;
institution.
Allocation
allocation policy;
eligible member calculation;
allocation calculation;
allocation run;
historical preservation.

6. EXPLICITLY NOT MVP
The following shall NOT be implemented as production business functionality in MVP unless separately approved:
payment gateway;
telebirr integration;
CBE Birr integration;
Fayda API integration;
biometric identification;
native Android application;
native iOS application;
USSD;
Hajj management;
Umrah management;
Zakat management;
Waqf management;
welfare case management;
education management;
employment marketplace;
property management;
banking;
accounting;
payroll;
AI decision-making;
automated licensing decisions;
automated approval decisions;
blockchain;
microservices;
national-scale data warehouse;
advanced GIS;
predictive analytics.
The architecture must permit these features later.

7. ADMINISTRATIVE HIERARCHY
The MVP supports:
NATIONAL
   │
   ▼
REGION
   │
   ▼
ZONE / CITY
   │
   ▼
SUB-CITY / TOWN
   │
   ▼
DISTRICT / WOREDA
   │
   ▼
LOCAL ISLAMIC INSTITUTION
   │
   ▼
MEMBER

The actual organizational/geographical terminology may be configured according to EIASC's approved model.
Database relationships shall use stable IDs rather than relying on names.

8. AUTHORIZATION HIERARCHY
National Administrator
NATIONAL
└── All authorized records

Regional Administrator
REGION
├── Zone/City
├── Sub-city/Town
├── District
└── Institutions

Zone/City Administrator
Access only assigned zone/city and descendants.
District Administrator
Access only assigned district and descendants.
Institution Administrator
Access only:
Own Institution
└── Own Members

Member
Access only permitted personal records.

9. NON-NEGOTIABLE AUTHORIZATION RULE
Authorization shall always evaluate:
Authentication
+
Role
+
Jurisdiction
+
Resource Ownership
+
Workflow State

Frontend hiding is not security.
The server must reject unauthorized access.
Example:
Regional Administrator – Region A
        │
        ├── Region A → ALLOW
        │
        └── Region B → DENY

An unauthorized request must return:
403 FORBIDDEN

even when the requester knows the resource ID.

10. INDIVIDUAL REGISTRATION — MVP
10.1 Required Data
Identity
first name;
middle name;
last name;
birth date;
automatically calculated age;
gender;
marital status.
Contact
phone number.
Education
education level.
Employment
employment status.
Address
region;
zone/city;
sub-city/town;
district/woreda;
specific street/current address.
National Identity
approved national identity identifier where available.
The system must not require a Fayda API integration for MVP.
Institution
institution affiliation where applicable.
Documents
Only documents explicitly required by approved EIASC policy.
Declaration
Applicant must confirm information accuracy.

11. INDIVIDUAL REGISTRATION WORKFLOW
START
  │
  ▼
Registration Form
  │
  ▼
Validate
  │
  ▼
DRAFT
  │
  ▼
SUBMITTED
  │
  ▼
UNDER_REVIEW
  │
  ├───────────────┐
  ▼               ▼
CORRECTION      APPROVED
  │               │
  ▼               ▼
RESUBMITTED     MEMBER
  │               │
  └───────►       ▼
             CREDENTIAL

Alternative:
UNDER_REVIEW
      │
      ▼
   REJECTED


12. FAMILY INFORMATION
The modified PRD introduces family information when applicable.
For MVP:
do not create an independent complex family-management subsystem;
support only the minimum structured relationship required by the approved registration workflow;
family records must be linked to the member;
family information must not be publicly exposed.
If EIASC later approves a comprehensive family registry, that becomes a separate module.

13. TRACKING CODE
Every submitted application receives:
EIASC-YYYY-XXXXXX

Example:
EIASC-2026-8F42K7

Requirements:
unique;
non-sequential;
difficult to guess;
indexed;
searchable;
stable.
Tracking codes must not expose database IDs.

14. APPLICATION TRACKING
Public input:
Tracking Code

Optional verification:
Phone Number
First Name

The response may show:
application type;
tracking code;
submission date;
current status;
next action;
correction requirement;
decision information where approved for public display.
It must not expose:
internal administrative notes;
internal reviewer information unless explicitly public;
private documents;
sensitive identity information.

15. INSTITUTION REGISTRATION — MVP
15.1 Institution Types
The backend shall maintain configurable institution types.
Initial seed values may include:
Mosque;
Madrasa;
Mosque/Madrasa;
Islamic Center;
Islamic Educational Institution;
Islamic Community Organization;
Youth Association/Council;
Other EIASC-approved institution.
The list must not be hard-coded into React components.

16. INSTITUTION DATA
Basic Information
institution name;
institution type;
establishment information;
contact information;
phone.
Leadership
responsible administrator;
leadership/committee information;
board/committee members where required;
leadership role;
number of leaders.
Staff
staff count;
staff role/category;
employee information where policy requires.
Educational Information
Where applicable:
number of students;
education level;
teachers;
graduates;
employment information.
The MVP should store approved structured data but should not become a full school-management system.
Location
region;
zone/city;
sub-city/town;
district/woreda;
local address.
Documents
required establishment documentation;
authorization documentation;
other EIASC-approved documentation.

17. INSTITUTION WORKFLOW
DRAFT
  ↓
PENDING
  ↓
UNDER REVIEW
  ↓
APPROVED
  ↓
ACTIVE

Administrative states:
ACTIVE
  ↓
SUSPENDED
  ↓
RESTORED

Terminal/alternative states:
REVOKED
CLOSED

Invalid transitions must be rejected server-side.

18. APPROVAL RULES
Rule 1
Draft records are not counted as approved.
Rule 2
Only approved records can become active.
Rule 3
Correction requests require an explanation.
Rule 4
Rejection requires an official reason.
Rule 5
Revocation requires a reason.
Rule 6
Every state change creates an audit record.
Rule 7
An administrator cannot approve their own submission.
Rule 8
Jurisdiction is validated server-side.

19. MEMBERSHIP
When an individual registration is approved:
Registration
      ↓
Member Record
      ↓
Membership Number
      ↓
Institution Relationship
      ↓
Credential

Membership statuses:
PENDING
ACTIVE
SUSPENDED
REVOKED

Membership number:
EIASC-M-YYYY-XXXXXXXX

Example:
EIASC-M-2026-7F82K31A


20. INSTITUTION MEMBER MANAGEMENT
An active institution shall be able to see its authorized membership population.
Minimum metrics:
Total Registered
Active
Inactive/Suspended
Pending

Institution administrators must not be able to modify members outside their institution.

21. LICENSING
Approved eligible institutions may receive a license.
License:
EIASC-L-YYYY-XXXXXX

Statuses:
PENDING
ACTIVE
EXPIRED
SUSPENDED
REVOKED

License actions:
issue;
renew;
suspend;
restore;
revoke;
expire.
All licensing actions are auditable.

22. DIGITAL MEMBERSHIP CREDENTIAL
An active member receives:
EIASC membership number;
digital membership card;
QR verification.
Card should display:
EIASC
Islamic Community Membership

Name
Membership Number
Institution
Status

QR

Sensitive information must not be encoded in the QR.

23. INSTITUTION CERTIFICATE
Approved institutions receive:
institution code;
operational certificate;
certificate number;
QR verification.
The final legal wording, seal, signature and official visual design require EIASC approval before production.

24. QR VERIFICATION
QR shall contain only a secure verification reference.
Never encode:
phone number;
national ID;
private address;
password;
sensitive personal information.
Verification endpoint:
/verify/[token]

Public result:
VERIFIED
Credential Type
Name/public institution
Status
Institution
Issue Date
Expiry

A revoked credential must fail verification.

25. REPORTING — MVP
National
members;
active members;
institutions;
active institutions;
registrations;
approvals;
rejections;
corrections;
regional distribution;
licensing;
allocation.
Regional
members;
institutions;
districts;
registrations;
licensing;
distribution.
District
institutions;
members;
registration status;
licensing.
Institution
membership;
license;
basic institutional activity.

26. DASHBOARD KPIs
National dashboard:
Total Members
Active Members
Institutions
Active Institutions
Pending Applications
Approved
Rejected
Active Licenses

Charts:
Members by Region
Institutions by Region
Registration Trend
Institution Status
License Status

All dashboards must be jurisdiction-filtered.

27. RESOURCE ALLOCATION — MVP
The MVP includes the calculation framework, not payment settlement.
The system shall calculate theoretical allocations using eligible active members.
Conceptual model:
Funding Pool
      ÷
Eligible Members
      =
Base Per-Member Allocation

The actual formula must be policy-driven.
No percentage or financial rule may be hard-coded into application code.

28. ALLOCATION POLICY
Each policy contains:
Policy ID
Version
Effective Date
Calculation Period
Eligibility Rules
Formula Inputs
Funding Pool

Every allocation run stores:
Policy
Policy Version
Period
Eligible Member Count
Funding Pool
Formula Inputs
Calculated Amount

Historical runs must remain reproducible.

29. AUDIT
Audit critical actions:
login/security events where appropriate;
registration submission;
correction request;
approval;
rejection;
revocation;
institution approval;
license issuance;
license suspension;
credential issuance;
role change;
allocation calculation/approval;
significant data changes.
Audit records must not be casually deleted.

30. MVP USER ROLES
Seed these roles:
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


31. MVP API
Base:
/api/v1

Authentication
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me

Locations
GET /locations/regions
GET /locations/zones?regionId=
GET /locations/subcities?zoneId=
GET /locations/districts?parentId=

Registration
POST /registrations/individual
POST /registrations/institution

GET /registrations/:trackingCode
POST /registrations/:id/resubmit

Administrative Workflow
GET  /admin/registrations
GET  /admin/registrations/:id
POST /admin/registrations/:id/review
POST /admin/registrations/:id/request-correction
POST /admin/registrations/:id/approve
POST /admin/registrations/:id/reject
POST /admin/registrations/:id/revoke

Members
GET /members
GET /members/:id
PATCH /members/:id
GET /members/:id/credential

Institutions
GET /institutions
POST /institutions
GET /institutions/:id
PATCH /institutions/:id
GET /institutions/:id/members

Licensing
GET  /licenses
GET  /licenses/:id
POST /licenses
POST /licenses/:id/issue
POST /licenses/:id/suspend
POST /licenses/:id/restore
POST /licenses/:id/revoke

Credentials
GET /credentials/:id
GET /credentials/:id/qr

Public Verification
GET /verify/:token

Reporting
GET /reports/dashboard
GET /reports/members
GET /reports/institutions
GET /reports/registrations
GET /reports/licenses

Allocation
GET  /allocation-policies
POST /allocation-policies

GET  /allocation-runs
POST /allocation-runs/calculate
GET  /allocation-runs/:id
POST /allocation-runs/:id/approve

GET /allocations/institution/:id


32. DATABASE — MVP CORE
Required entities:
User
Role
UserRole

Region
ZoneCity
SubcityTown
District

InstitutionType

Institution
InstitutionLeader/Staff where required

Member
MemberInstitution

Registration
ApprovalAction

License
Credential
Document

AllocationPolicy
AllocationRun
ResourceAllocation

AuditLog
Notification


33. DATABASE RULE
Every critical entity shall have:
UUID primary key
createdAt
updatedAt

Core public identifiers must have unique constraints.
Examples:
trackingCode UNIQUE
membershipNumber UNIQUE
institutionCode UNIQUE
licenseNumber UNIQUE
credential verification token UNIQUE


34. DUPLICATE PREVENTION
The system must detect likely duplicate records using appropriate identifiers and approved matching rules.
The MVP shall not rely only on names.
Possible matching inputs:
phone;
approved identity identifier;
membership number;
institution code;
license number.
Duplicate handling must not automatically reject a person merely because a similar name exists.

35. DOCUMENT SECURITY
Uploaded documents:
must be type validated;
must have size limits;
must be stored outside executable directories;
must require authorization to retrieve;
must not be publicly accessible by filename;
must not be exposed through predictable URLs.

36. FRONTEND STRUCTURE
app/
├── page.tsx
├── register/
│   ├── individual/
│   └── institution/
├── track/
├── verify/
│   └── [token]/
├── login/
├── member/
├── institution/
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


37. PUBLIC HOMEPAGE
Required:
EIASC
Community Registration Platform

[ Register as Member ]
[ Register Institution ]

[ Track Application ]
[ Verify Credential ]
[ Find Institution ]

Additional:
mission;
explanation;
help;
contact;
privacy;
terms.
The visual design shall be modern, trustworthy, institutional and accessible.

38. DESIGN SYSTEM
Primary brand direction:
Sophisticated light green institutional identity.
Theme:
LIGHT
SYSTEM
DARK

Design tokens:
Primary Green #2E8B57
Deep Green #176B45
Dark Green #0D3B2A
Light Green #EAF7EF
Soft Green #D8F0E2
Medium Green #4FAF72

Do not scatter hard-coded colors throughout components.

39. LOCALIZATION
Architecture must support:
English;
Amharic;
Afaan Oromo;
Arabic;
future Ethiopian/local languages.
Arabic requires RTL.
Visible text must not be embedded directly inside business logic.

40. ACCESSIBILITY
Target:
WCAG 2.2 AA
Required:
keyboard navigation;
semantic HTML;
accessible forms;
visible focus;
error descriptions;
screen-reader labels;
accessible tables;
accessible dialogs;
sufficient contrast;
reduced motion.

41. MOBILE
The MVP must be fully functional on:
smartphones;
tablets;
desktop.
Registration and tracking must be usable on low-end/mobile devices.

42. LOW-BANDWIDTH REQUIREMENTS
Avoid unnecessary:
video;
oversized images;
excessive animations;
large JavaScript bundles.
Use:
optimized assets;
pagination;
lazy loading;
server-side filtering;
efficient API responses.

43. ARCHITECTURE
The MVP shall use:
Next.js
     ↓
NestJS API
     ↓
Prisma
     ↓
PostgreSQL

MySQL 8+ may be used if the approved deployment environment cannot provide PostgreSQL.
The business/domain architecture must remain database-portable where practical.

44. BACKEND MODULES
auth
users
roles
locations
registrations
members
institutions
licensing
credentials
documents
notifications
reporting
allocation
audit

Each module shall contain its own:
controller;
service;
DTO;
validation;
authorization integration;
tests.

45. SECURITY ARCHITECTURE
Required:
Authentication
RBAC
Jurisdiction Guard
Ownership Guard
Workflow Guard
Input Validation
Rate Limiting
Secure File Upload
Audit Logging
Secure Headers
Password Hashing
Secret Management

No client-side-only authorization.

46. API ERROR STANDARD
Example:
{
  "success": false,
  "error": {
    "code": "JURISDICTION_DENIED",
    "message": "You are not authorized to access this resource."
  },
  "meta": {
    "requestId": "..."
  }
}

Stable error codes shall be used.

47. TESTING
Unit
Test:
status transitions;
tracking code;
hierarchy validation;
permission logic;
duplicate detection;
allocation formulas.
Integration
Test:
registration → database
approval → member
approval → credential
institution approval → license
revocation → verification failure
member → institution
member → allocation

E2E
Scenario A
Public
→ Individual Registration
→ Admin Review
→ Correction
→ Resubmission
→ Approval
→ Member
→ Credential
→ QR Verification

Scenario B
Institution Registration
→ Review
→ Approval
→ License
→ Certificate
→ QR Verification

Scenario C
Member
→ Institution
→ Active Member Count
→ Allocation


48. SECURITY TESTS
Must test:
unauthorized API access;
horizontal privilege escalation;
vertical privilege escalation;
invalid token;
expired token;
SQL injection;
XSS;
malicious upload;
rate-limit bypass;
ID enumeration;
QR token guessing;
unauthorized document access;
cross-jurisdiction access.

49. MVP ACCEPTANCE TESTS
The MVP is functionally complete only when all are successful.
Test 1
Public user submits individual registration.
Test 2
Unique tracking code is generated.
Test 3
Registrar reviews application.
Test 4
Registrar requests correction.
Test 5
Applicant resubmits.
Test 6
Authorized administrator approves.
Test 7
Approved registration creates member.
Test 8
Member credential is issued.
Test 9
QR credential is publicly verified.
Test 10
Institution can be registered and approved.
Test 11
Approved institution can manage authorized members.
Test 12
Institution license can be issued.
Test 13
Regional administrator cannot access another region.
Test 14
District administrator cannot access another district.
Test 15
Critical actions appear in audit history.
Test 16
Light/System/Dark theme works.
Test 17
Core workflows work on mobile.
Test 18
Allocation calculation produces reproducible results.
Test 19
Revoked credential fails public verification.
Test 20
Production build succeeds.

50. MVP RELEASE GATE
All must be checked:
[ ] Requirements implemented
[ ] Database migrations tested
[ ] Seed data tested
[ ] Authentication tested
[ ] RBAC tested
[ ] Jurisdiction isolation tested
[ ] Individual registration tested
[ ] Institution registration tested
[ ] Approval workflow tested
[ ] Correction workflow tested
[ ] Rejection workflow tested
[ ] Membership tested
[ ] Licensing tested
[ ] Credentials tested
[ ] QR verification tested
[ ] Reporting tested
[ ] Allocation calculation tested
[ ] Audit tested
[ ] Responsive UI tested
[ ] Theme tested
[ ] Accessibility tested
[ ] Security testing completed
[ ] Backup/restore tested
[ ] Production deployment tested
[ ] UAT completed


51. MVP DEFINITION OF DONE
A feature is not complete simply because its page exists.
It is complete only when:
UI
+
API
+
Database
+
Validation
+
Authorization
+
Business Rules
+
Audit
+
Tests

are implemented where applicable.

52. DEVELOPMENT PHASES
PHASE 0 — Repository and Environment
inspect repository;
establish baseline;
configure Node;
configure package manager;
configure environment;
configure lint;
configure tests;
configure build.
PHASE 1 — Architecture Foundation
application structure;
shared configuration;
API;
frontend;
Prisma;
database;
migrations.
PHASE 2 — Identity and Security
User;
Role;
authentication;
RBAC;
jurisdiction;
audit foundation.
PHASE 3 — Locations
region;
zone/city;
sub-city/town;
district;
hierarchy validation.
PHASE 4 — Individual Registration
public form;
validation;
submission;
tracking;
review;
correction;
approval;
member.
PHASE 5 — Institution
institution types;
institution registration;
review;
approval;
profile;
member management.
PHASE 6 — Licensing
license;
issue;
suspend;
restore;
revoke;
expiry.
PHASE 7 — Credentials
member card;
institution certificate;
QR;
verification.
PHASE 8 — Reporting
dashboards;
national;
regional;
district;
institution.
PHASE 9 — Allocation
policy;
calculation;
run;
approval;
historical preservation.
PHASE 10 — Hardening
security;
accessibility;
performance;
mobile;
backup;
deployment.

53. AI CODING AGENT IMPLEMENTATION PROTOCOL
The coding agent must work sequentially.
Before coding
1. Inspect repository.
2. Inspect current branches.
3. Inspect package.json.
4. Inspect existing source.
5. Inspect configuration.
6. Inspect database.
7. Identify existing functionality.
8. Identify conflicts with this PRD.

Then implement
Foundation
↓
Database
↓
Authentication
↓
Authorization
↓
Locations
↓
Individual Registration
↓
Approval
↓
Member
↓
Institution
↓
Licensing
↓
Credentials
↓
Verification
↓
Reporting
↓
Allocation
↓
Testing
↓
Security
↓
Deployment

After every major phase:
Lint
+
Type Check
+
Tests
+
Build

must be executed.

54. AI AGENT NON-NEGOTIABLE RULES
The agent shall never:
bypass authentication;
bypass authorization;
disable validation;
remove database constraints;
expose private information;
hard-code financial allocation policies;
directly manipulate production data;
delete audit history;
invent legal authority;
invent undocumented business rules;
add unnecessary dependencies;
claim tests passed without running them;
claim deployment succeeded without verification;
replace an architectural decision silently.
If the agent encounters ambiguity:
STOP
→ identify ambiguity
→ use existing requirement where possible
→ document assumption
→ do not invent a major business rule


55. GIT STRATEGY
Recommended:
main
develop
feature/*
fix/*
release/*

Initial development branch:
feature/mvp-foundation

or equivalent.
Production releases must originate from a controlled branch/tag.

56. REPOSITORY STRUCTURE
Preferred:
EIASC-CRil/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── types/
│   ├── validation/
│   └── config/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── deployment/
│   └── decisions/
│
├── tests/
│   └── e2e/
│
├── .env.example
├── README.md
└── package.json

If the existing repository has a different structure, the AI agent must first inspect it and adapt rather than blindly replacing it.

57. ARCHITECTURAL DECISIONS
Initial ADRs:
ADR-001 Modular Monolith
ADR-002 Database Selection
ADR-003 Authentication
ADR-004 RBAC and Jurisdiction
ADR-005 Document Storage
ADR-006 Credential Verification
ADR-007 Allocation Engine
ADR-008 Shared Hosting Deployment


58. FUTURE ARCHITECTURE
The MVP shall expose stable extension points for:
Payments
USSD
Mobile
Fayda
Hajj
Umrah
Zakat
Waqf
Education
Welfare
GIS
Analytics
AI

These future systems must consume the existing:
Identity
Membership
Institution
Jurisdiction
Governance
Licensing

foundation.
They must not create disconnected duplicate registries.

59. LONG-TERM PLATFORM MODEL
The platform follows:
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

The MVP implements the first five layers while preparing the interfaces for the remaining layers.

60. LEGAL AND INSTITUTIONAL SAFEGUARD
The software implements only authority formally approved by EIASC and applicable law.
The software itself does not create:
compulsory membership;
mandatory financial contributions;
legal licensing authority;
property restrictions;
banking authority;
disciplinary authority.
Those powers must be established through appropriate institutional/legal instruments.

61. FINAL MVP STATEMENT
The first release of EIASC CRil is not intended to be every future EIASC digital service.
It is a trusted institutional foundation.
The MVP must successfully establish:
            VERIFIED IDENTITY
                    │
                    ▼
              MEMBERSHIP
                    │
                    ▼
              INSTITUTION
                    │
                    ▼
             JURISDICTION
                    │
                    ▼
              GOVERNANCE
                    │
                    ▼
              LICENSING
                    │
                    ▼
             CREDENTIALS
                    │
                    ▼
              VERIFICATION
                    │
                    ▼
               REPORTING
                    │
                    ▼
             ALLOCATION DATA

If these capabilities work securely, audibly and reliably, the MVP is successful.
Everything else becomes an extension of this foundation.

62. START-CODING DIRECTIVE
Bismillah.
The engineering team or AI coding agent shall begin by inspecting the repository:
Jafermenza/EIASC-CRil

It shall not immediately generate the entire platform.
The first task is:
REPOSITORY INSPECTION
        ↓
CURRENT-STATE REPORT
        ↓
ARCHITECTURE ALIGNMENT
        ↓
FOUNDATION IMPLEMENTATION

The agent must report:
1. Existing framework
2. Existing dependencies
3. Existing routes
4. Existing database
5. Existing authentication
6. Existing UI
7. Existing tests
8. Existing deployment configuration
9. Conflicts with this PRD
10. Recommended first implementation task

Only after that inspection should coding begin.

63. FIRST CODING MILESTONE
The first milestone is:
M0 — Running Development Foundation
Acceptance:
[ ] Repository builds
[ ] Development server starts
[ ] Frontend loads
[ ] Backend/API loads
[ ] Database connects
[ ] Prisma works
[ ] Migration works
[ ] Seed works
[ ] Environment variables documented
[ ] Basic test runner works
[ ] Basic lint/type-check works

Then:
M1 — Identity & Security Foundation
User
Role
Authentication
RBAC
Jurisdiction
Audit

Then:
M2 — Individual Registration Vertical Slice
Public Form
→ API
→ Validation
→ Database
→ Tracking Code
→ Review
→ Correction
→ Approval
→ Member
→ Credential
→ QR Verification

This is the first true end-to-end MVP demonstration.

64. ENGINEERING PRINCIPLE
Do not build a collection of pages. Build a trustworthy institutional system.
Every important feature must have:
Data
+
Business Rule
+
Authorization
+
Workflow
+
Audit
+
Verification
+
Test

That principle governs the implementation of EIASC CRil MVP v1.1.

