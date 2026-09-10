# EIASC CRil

## Product Requirements Document — M3

### Institution Registry & Institutional Approval

**Project:** Ethiopian Islamic Affairs Supreme Council — Community Registration & Institutional Licensing Platform
**Repository:** `Jafermenza/EIASC-CRil`
**Milestone:** **M3**
**Version:** 1.0
**Status:** Ready for Engineering Implementation
**Prerequisites:** M0, M1 and M2 completed

---

# 1. PURPOSE

M3 introduces the second major operational pillar of EIASC CRil:

> **The verified Islamic institution registry.**

M2 established the individual registration pathway.

M3 establishes the institutional pathway so that EIASC can digitally register, review, approve, manage, and verify:

* mosques;
* madrasas;
* Islamic centers;
* Islamic educational institutions;
* Islamic community organizations;
* other approved Islamic institutions.

The objective is to create a reliable institutional registry connected to the existing geographic hierarchy and capable of becoming the foundation for institutional licensing in M4.

---

# 2. M3 OBJECTIVE

At the end of M3, an authorized EIASC administrator must be able to:

1. receive an institution application;
2. validate its geographic hierarchy;
3. review institutional information;
4. request corrections;
5. approve or reject the institution;
6. assign a permanent institution code;
7. create the institution's official registry record;
8. associate approved members with the institution;
9. view the institution profile;
10. maintain institution status;
11. view institution history;
12. audit all significant institutional actions.

A public user must be able to:

1. submit an institution application;
2. receive a tracking code;
3. track the application;
4. respond to correction requests.

---

# 3. M3 SCOPE

## IN SCOPE

### Institution

* registration;
* profile;
* institution type;
* geographic location;
* contact information;
* leadership;
* staff summary;
* educational information;
* document submission;
* application status;
* approval;
* rejection;
* correction;
* institution code;
* institution status.

### Administration

* institution application queue;
* filters;
* review;
* approval;
* rejection;
* correction;
* institution profile;
* institution search;
* jurisdiction enforcement;
* audit.

### Membership Relationship

* associate approved members with institutions;
* move membership only through authorized workflow;
* institution-level member counts.

### Public

* institution application;
* application tracking;
* approved institution verification/search where enabled.

---

# 4. OUT OF SCOPE

Do NOT implement:

* institutional payment collection;
* telebirr;
* CBE Birr;
* banking;
* Waqf management;
* mosque property management;
* Hajj;
* Umrah;
* Zakat;
* payroll;
* school management;
* accounting;
* USSD;
* mobile apps;
* Fayda API;
* biometric verification;
* automated AI approval.

These remain future modules.

---

# 5. RELATIONSHIP TO M2

M2:

```text
Individual
    ↓
Registration
    ↓
Approval
    ↓
Member
```

M3:

```text
Institution
    ↓
Registration
    ↓
Review
    ↓
Approval
    ↓
Institution
    ↓
Members
```

Combined:

```text
                  EIASC CRil
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
       INDIVIDUAL             INSTITUTION
            │                     │
            ▼                     ▼
         MEMBER              INSTITUTION
            │                     │
            └──────────┬──────────┘
                       ▼
                  RELATIONSHIP
```

---

# 6. INSTITUTION TYPES

Institution types shall be database/configuration driven.

Initial seed:

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

Each type shall contain:

```text
id
code
name
description
active
createdAt
updatedAt
```

The frontend must obtain institution types from the API.

Do not hard-code the list in UI components.

---

# 7. INSTITUTION APPLICATION DATA MODEL

## 7.1 Basic Information

Required:

```text
institutionName
institutionTypeId
establishmentDate
phone
email
```

Optional where appropriate:

```text
alternativeName
website
secondaryPhone
```

---

# 8. GEOGRAPHIC INFORMATION

The institution must use the existing hierarchical location model created during M0/M1.

Required:

```text
regionId
zoneCityId
subcityTownId
districtId
address
```

The UI must use cascading selection:

```text
Region
   ↓
Zone / City
   ↓
Sub-city / Town
   ↓
District / Woreda
```

Invalid combinations must be rejected by the backend.

Example:

```text
Region A
 └── Zone A1
      └── District A1-01
```

A request attempting to associate the institution with:

```text
Region A
Zone B1
```

must be rejected.

---

# 9. INSTITUTION LEADERSHIP

M3 must capture the primary institutional responsible person.

Minimum:

```text
fullName
role
phone
email
```

Example role values:

```text
CHAIRPERSON
IMAM
DIRECTOR
ADMINISTRATOR
MADRASA_HEAD
SECRETARY
OTHER
```

Role types should be configurable.

The system must support multiple institutional leaders where required.

---

# 10. STAFF SUMMARY

M3 is not a payroll system.

Store only institutional summary information.

Example:

```text
imamCount
teacherCount
administrativeStaffCount
otherStaffCount
```

The institution profile may display totals.

Detailed employee management is outside M3.

---

# 11. EDUCATIONAL INFORMATION

For institutions providing education:

```text
studentCount
teacherCount
educationLevels
```

Example education levels:

```text
QURAN
HIFZ
BASIC_ISLAMIC_STUDIES
MADRASAH
ADULT_EDUCATION
OTHER
```

Education configuration must be extensible.

---

# 12. INSTITUTION DESCRIPTION

Allow:

```text
mission
description
services
communityActivities
```

Text fields must have:

* maximum length;
* server-side sanitization;
* validation.

Do not allow arbitrary HTML.

---

# 13. DOCUMENTS

M3 supports institutional document upload.

Potential document categories:

```text
ESTABLISHMENT_DOCUMENT
AUTHORIZATION_DOCUMENT
LEADERSHIP_DOCUMENT
LOCATION_DOCUMENT
OTHER
```

The final mandatory document list shall be controlled through EIASC policy/configuration.

Each document record:

```text
id
institutionApplicationId
documentType
fileName
storageKey
mimeType
size
uploadedBy
createdAt
```

---

# 14. DOCUMENT SECURITY

Documents must:

* never be publicly exposed;
* be stored outside executable directories;
* require authorization;
* validate MIME type;
* validate file size;
* use generated storage identifiers;
* be auditable.

The original filename must not be used as the storage path.

---

# 15. INSTITUTION APPLICATION STATUS

Use:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
CORRECTION_REQUIRED
RESUBMITTED
APPROVED
REJECTED
```

After approval, institution operational status is separately maintained.

---

# 16. INSTITUTION STATUS

Institution status:

```text
ACTIVE
SUSPENDED
REVOKED
CLOSED
```

Do not confuse:

```text
Application Status
```

with:

```text
Institution Status
```

Example:

```text
Application
    APPROVED
       ↓
Institution
    ACTIVE
```

---

# 17. STATE MACHINE

Valid application transitions:

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ├──→ CORRECTION_REQUIRED
  │          ↓
  │      RESUBMITTED
  │          ↓
  │      UNDER_REVIEW
  │
  ├──→ APPROVED
  │
  └──→ REJECTED
```

Invalid transitions must return an API error.

Example:

```text
REJECTED → APPROVED
```

must not occur through a normal approval endpoint.

A formal reopening mechanism can be introduced later if EIASC policy requires it.

---

# 18. TRACKING CODE

Institution applications receive:

```text
EIASC-I-YYYY-XXXXXX
```

Example:

```text
EIASC-I-2026-8F42K7
```

Requirements:

* unique;
* unpredictable;
* indexed;
* not based on database ID.

---

# 19. INSTITUTION CODE

Upon approval:

```text
EIASC-INST-YYYY-XXXXXXXX
```

Example:

```text
EIASC-INST-2026-00018A7F
```

Institution code is permanent.

It must not change when:

* leadership changes;
* institution changes status;
* members change;
* license is renewed.

---

# 20. APPROVAL PROCESS

Administrator opens:

```text
Institution Application
```

System displays:

```text
Basic Information
Location
Leadership
Staff
Education
Documents
Applicant Information
Application History
```

Administrator actions:

```text
Request Correction
Approve
Reject
```

---

# 21. CORRECTION WORKFLOW

Administrator enters:

```text
correctionReason
```

Example:

```text
Please provide the institution establishment document.
```

Applicant receives notification.

Application becomes:

```text
CORRECTION_REQUIRED
```

Applicant edits permitted fields.

Applicant submits again.

Status:

```text
RESUBMITTED
```

Administrator reviews again.

---

# 22. APPROVAL RESULT

When approved:

```text
Institution Application
        ↓
Institution Record
        ↓
Institution Code
        ↓
ACTIVE
```

The approval transaction must be atomic.

If institution creation succeeds but code generation fails, the entire transaction must roll back.

---

# 23. REJECTION

Rejection requires:

```text
reason
```

The reason is stored in the workflow history.

Applicant sees the approved public-facing explanation.

Internal notes must remain restricted.

---

# 24. INSTITUTION PROFILE

Approved institution profile:

```text
Institution Name
Institution Code
Institution Type
Status

Location
Contact
Leadership

Staff Summary
Education Summary

Member Count

Registration Date
Approval Date
```

Where licensing has not yet been implemented:

```text
License Status:
Not Yet Licensed / Licensing Pending
```

Do not create a fake license.

---

# 25. MEMBER-INSTITUTION RELATIONSHIP

M3 introduces:

```text
Member
   │
   ▼
MemberInstitution
   │
   ▼
Institution
```

Recommended entity:

```text
MemberInstitution
```

Fields:

```text
id
memberId
institutionId
relationshipType
status
startedAt
endedAt
createdAt
updatedAt
```

Relationship types:

```text
PRIMARY
SECONDARY
OTHER
```

M3 should normally allow one active PRIMARY institution per member unless EIASC policy explicitly permits multiple.

---

# 26. MEMBERSHIP RULE

Only:

```text
ACTIVE MEMBER
```

may be counted as an active institution member.

Therefore:

```text
Pending Member → NOT COUNTED
Suspended Member → NOT COUNTED
Revoked Member → NOT COUNTED
Active Member → COUNTED
```

This rule becomes important for M6 allocation.

---

# 27. MEMBER COUNT

Institution dashboard:

```text
Total Members
Active Members
Suspended Members
Pending Relationships
```

The backend calculates counts.

Do not store manually editable `memberCount` as the authoritative number.

---

# 28. ADMINISTRATION UI

Create:

```text
/admin/institutions
```

Table columns:

```text
Institution
Type
Region
Zone/City
District
Application Status
Institution Status
Submitted
Actions
```

Filters:

```text
Search
Institution Type
Region
Zone/City
District
Application Status
Institution Status
Date Range
```

Pagination is mandatory.

---

# 29. INSTITUTION REVIEW PAGE

Route:

```text
/admin/institutions/applications/[id]
```

Sections:

```text
Overview
Location
Leadership
Staff
Education
Documents
Members
Workflow
Audit
```

Action bar:

```text
Request Correction
Reject
Approve
```

Actions must be permission controlled.

---

# 30. INSTITUTION ADMINISTRATION

Institution administrator route:

```text
/institution
```

Dashboard:

```text
Institution Profile
Members
Applications/Requests
Institution Status
Documents
Activity
```

M3 institution administrators may:

* view institution profile;
* update permitted institutional information;
* view authorized members;
* initiate permitted updates.

They cannot:

* approve their own institution;
* change official status;
* issue licenses;
* access another institution;
* modify audit history.

---

# 31. JURISDICTION SECURITY

Institution data follows the same hierarchy established in M1.

Example:

```text
National Admin
     ↓
all institutions

Regional Admin
     ↓
own region

Zone Admin
     ↓
own zone

District Admin
     ↓
own district

Institution Admin
     ↓
own institution
```

Authorization must be enforced in NestJS services/guards.

---

# 32. API

Base:

```text
/api/v1
```

## Institution Types

```text
GET /institution-types
```

## Public Registration

```text
POST /registrations/institution
```

## Application

```text
GET /registrations/institution/:trackingCode
PATCH /registrations/institution/:id
POST /registrations/institution/:id/submit
POST /registrations/institution/:id/resubmit
```

## Administration

```text
GET /admin/institutions/applications
GET /admin/institutions/applications/:id

POST /admin/institutions/applications/:id/review
POST /admin/institutions/applications/:id/request-correction
POST /admin/institutions/applications/:id/approve
POST /admin/institutions/applications/:id/reject
```

## Institutions

```text
GET /institutions
GET /institutions/:id
PATCH /institutions/:id
```

## Members

```text
GET /institutions/:id/members
POST /institutions/:id/members/:memberId
DELETE /institutions/:id/members/:memberId
```

The delete operation should normally be implemented as relationship deactivation rather than physical deletion.

---

# 33. API VALIDATION

Use DTO validation.

Validate:

* required fields;
* UUID;
* phone;
* email;
* dates;
* enum values;
* hierarchy;
* document metadata;
* status transitions.

Never trust:

```text institutionId
regionId
districtId
memberId
role
status
```

sent by the browser.

---

# 34. DATABASE

Add the following core tables/models if not already present:

```text
InstitutionType
InstitutionApplication
Institution
InstitutionLeader
InstitutionStaffSummary
InstitutionEducation
InstitutionDocument
MemberInstitution
InstitutionStatusHistory
```

Existing:

```text
User
Role
Region
ZoneCity
SubcityTown
District
Member
Registration
AuditLog
```

must be reused rather than duplicated.

---

# 35. DATABASE RELATIONSHIPS

Conceptual:

```text
Region
  │
  └── ZoneCity
        │
        └── SubcityTown
              │
              └── District
                    │
                    └── Institution
                          │
                          ├── InstitutionLeader
                          ├── Documents
                          └── MemberInstitution
                                  │
                                  └── Member
```

---

# 36. TRANSACTIONAL APPROVAL

Approval must run as a database transaction:

```text
BEGIN
    validate application
    validate administrator jurisdiction
    validate current state
    generate institution code
    create institution
    create leadership relationship
    create institution status
    create approval history
    create audit log
    mark application approved
COMMIT
```

If any operation fails:

```text
ROLLBACK
```

---

# 37. AUDIT REQUIREMENTS

Record:

```text
INSTITUTION_SUBMITTED
INSTITUTION_REVIEWED
INSTITUTION_CORRECTION_REQUESTED
INSTITUTION_RESUBMITTED
INSTITUTION_APPROVED
INSTITUTION_REJECTED
INSTITUTION_SUSPENDED
INSTITUTION_RESTORED
INSTITUTION_REVOKED
MEMBER_ASSOCIATED
MEMBER_DISASSOCIATED
```

Audit:

```text
actorId
action
entityType
entityId
timestamp
requestId
metadata
```

Do not store unnecessary sensitive information in audit metadata.

---

# 38. NOTIFICATIONS

M3 should provide notification abstraction.

Channels:

```text
IN_APP
EMAIL
SMS
```

For MVP, actual SMS integration may remain disabled/configurable.

Required notification events:

```text
Application Submitted
Correction Requested
Application Approved
Application Rejected
Institution Status Changed
```

Create a notification service interface so providers can be added later.

---

# 39. UI/UX

The institution module must follow the established EIASC visual system.

### Theme

```text
Light
System
Dark
```

### Brand direction

Sophisticated institutional light-green identity.

Use:

* clean cards;
* generous spacing;
* modern data tables;
* clear status badges;
* accessible forms;
* responsive layouts;
* professional government/institutional appearance.

Avoid:

* excessive gradients;
* excessive animations;
* decorative clutter;
* childish visuals.

---

# 40. RESPONSIVE EXPERIENCE

Institution registration must work on:

```text
Mobile
Tablet
Desktop
```

The application should remain usable on low-bandwidth connections.

Large document previews should not automatically load.

---

# 41. ACCESSIBILITY

Target:

```text
WCAG 2.2 AA
```

Required:

* keyboard navigation;
* semantic labels;
* accessible error messages;
* focus management;
* accessible tables;
* accessible dialogs;
* adequate contrast;
* RTL readiness.

---

# 42. TEST DATA

Seed development database with realistic fictional data:

```text
Regions
Zones
Sub-cities/Towns
Districts

Institution Types

Sample Institutions
Sample Members
```

Never use real people's sensitive information in development seed data.

---

# 43. UNIT TESTS

Test:

### Institution code

```text
unique
stable
correct format
```

### Hierarchy

```text
valid hierarchy → accepted
invalid hierarchy → rejected
```

### State machine

Test every permitted and forbidden transition.

### Authorization

Test:

```text
National → all
Regional → own region
Zone → own zone
District → own district
Institution Admin → own institution
```

### Member count

Only active members are counted.

---

# 44. INTEGRATION TESTS

Required:

```text
institution registration
→ database

institution submission
→ application status

correction request
→ correction status

resubmission
→ review

approval
→ institution

approval
→ institution code

approval
→ audit

member association
→ institution count
```

---

# 45. END-TO-END TEST

## Institution happy path

```text
Public
 ↓
Institution Registration
 ↓
Complete Form
 ↓
Submit
 ↓
Tracking Code
 ↓
Admin Login
 ↓
Application Queue
 ↓
Open Application
 ↓
Approve
 ↓
Institution Created
 ↓
Institution Code
 ↓
Institution Profile
```

## Correction path

```text
Submit
 ↓
Review
 ↓
Correction Required
 ↓
Applicant edits
 ↓
Resubmit
 ↓
Review
 ↓
Approve
```

---

# 46. SECURITY ACCEPTANCE TESTS

Attempt:

```text
Institution A admin → Institution B
```

Expected:

```text
403
```

Attempt:

```text
District A admin → Institution in District B
```

Expected:

```text
403
```

Attempt:

```text
Institution admin → approve own application
```

Expected:

```text
403
```

Attempt:

```text
Client modifies institutionId
```

Expected:

```text
server rejects unauthorized relationship
```

---

# 47. PERFORMANCE

For normal MVP deployment:

* paginated institution list;
* indexed tracking code;
* indexed institution code;
* indexed status;
* indexed geography;
* efficient member counts;
* no unbounded database queries.

Do not load all institutions into the browser.

---

# 48. INDEXES

At minimum:

```text
Institution.code
Institution.name
Institution.status
Institution.typeId
Institution.regionId
Institution.zoneCityId
Institution.subcityTownId
Institution.districtId

InstitutionApplication.trackingCode
InstitutionApplication.status

MemberInstitution.memberId
MemberInstitution.institutionId
MemberInstitution.status
```

---

# 49. M3 DEFINITION OF DONE

M3 is complete only when:

```text
[ ] Institution types implemented
[ ] Institution registration implemented
[ ] Cascading location implemented
[ ] Institution validation implemented
[ ] Institution tracking implemented
[ ] Institution review implemented
[ ] Correction workflow implemented
[ ] Resubmission implemented
[ ] Approval implemented
[ ] Rejection implemented
[ ] Institution code generated
[ ] Institution profile implemented
[ ] Institution status implemented
[ ] Leadership implemented
[ ] Staff summary implemented
[ ] Education summary implemented
[ ] Documents implemented securely
[ ] Member relationship implemented
[ ] Member counts implemented
[ ] Jurisdiction authorization implemented
[ ] Audit implemented
[ ] Notifications abstraction implemented
[ ] Responsive UI implemented
[ ] Light/System/Dark theme works
[ ] Unit tests pass
[ ] Integration tests pass
[ ] E2E tests pass
[ ] Production build passes
```

---

# 50. M3 ACCEPTANCE CRITERIA

## AC-01

A public user can submit an institution registration.

## AC-02

The system generates a unique institution tracking code.

## AC-03

Geographic selections are hierarchical.

## AC-04

Invalid geographic combinations cannot be submitted.

## AC-05

Administrator sees institution applications only within authorized jurisdiction.

## AC-06

Administrator can request correction.

## AC-07

Applicant can resubmit.

## AC-08

Authorized administrator can approve.

## AC-09

Approval creates a permanent institution record.

## AC-10

Approval creates a unique institution code.

## AC-11

Approval is recorded in audit history.

## AC-12

Institution can have approved members.

## AC-13

Only active members count toward active membership.

## AC-14

Institution administrator cannot access another institution.

## AC-15

Institution administrator cannot approve itself.

## AC-16

Institution documents are protected.

## AC-17

Institution profile is responsive.

## AC-18

All M3 tests pass.

---

# 51. M3 DATABASE MIGRATION RULE

Before migration:

```text
backup
```

Then:

```text
migration
→ generate
→ apply
→ seed
→ test
```

Never manually modify production tables to make the application work.

---

# 52. M3 IMPLEMENTATION ORDER

The coding agent must implement in this order:

```text
STEP 1
Inspect M0/M1/M2 implementation
        ↓
STEP 2
Database models
        ↓
STEP 3
Prisma migration
        ↓
STEP 4
Institution types seed
        ↓
STEP 5
Institution validation DTOs
        ↓
STEP 6
Institution service
        ↓
STEP 7
Institution registration API
        ↓
STEP 8
Institution workflow
        ↓
STEP 9
Approval transaction
        ↓
STEP 10
MemberInstitution relationship
        ↓
STEP 11
Authorization
        ↓
STEP 12
Audit
        ↓
STEP 13
Frontend registration
        ↓
STEP 14
Admin institution dashboard
        ↓
STEP 15
Institution profile
        ↓
STEP 16
Documents
        ↓
STEP 17
Tests
        ↓
STEP 18
Security testing
        ↓
STEP 19
Build
```

---

# 53. CODING AGENT INSTRUCTION

Before changing code, inspect what M0–M2 already implemented.

Do not recreate:

```text
authentication
roles
locations
audit infrastructure
member entity
registration infrastructure
theme system
shared UI
```

unless missing or incompatible.

Reuse existing components.

---

# 54. REQUIRED FIRST AGENT TASK

The first coding-agent response for M3 should produce:

```text
M3 IMPLEMENTATION AUDIT
```

containing:

1. Current repository structure.
2. Existing M0 components.
3. Existing M1 security architecture.
4. Existing M2 individual registration implementation.
5. Existing database models.
6. Existing location models.
7. Existing member model.
8. Existing workflow/state implementation.
9. Existing UI components.
10. Existing testing infrastructure.
11. Missing M3 components.
12. Files that will be created.
13. Files that will be modified.
14. Database migration plan.
15. Risks/conflicts.
16. First implementation commit.

The agent should **not modify unrelated functionality**.

---

# 55. FIRST M3 COMMIT

Recommended initial commit:

```text
feat(institutions): establish institution registry foundation
```

This commit should contain only the foundational M3 database/domain work.

Then proceed incrementally.

---

# 56. M3 TARGET OUTPUT

At completion, demonstrate this live scenario:

```text
             PUBLIC USER
                  │
                  ▼
       INSTITUTION REGISTRATION
                  │
                  ▼
        EIASC-I-2026-XXXXXX
                  │
                  ▼
           ADMIN REVIEW
                  │
          ┌───────┴───────┐
          ▼               ▼
     CORRECTION         APPROVE
          │               │
          ▼               ▼
      RESUBMIT       INSTITUTION
                          │
                          ▼
                 EIASC-INST-2026-XXXX
                          │
              ┌───────────┴──────────┐
              ▼                      ▼
          INSTITUTION             MEMBERS
            PROFILE                  │
                                     ▼
                              ACTIVE MEMBER COUNT
```

This completes the institutional foundation.

---

# 57. NEXT MILESTONE

After successful completion of M3:

## M4 — Institutional Licensing & Digital Certificates

M4 will build:

```text
Approved Institution
       ↓
Licensing Application
       ↓
Inspection / Review
       ↓
License Approval
       ↓
Operational License
       ↓
Digital Certificate
       ↓
QR Verification
       ↓
Public Verification
```

M4 must build on the institution registry created by M3 rather than creating another institution database.

---

# 58. MILESTONE ROADMAP

```text
M0  Foundation                 ✓ COMPLETE
M1  Identity & Security       ✓ COMPLETE
M2  Individual Registration   ✓ COMPLETE

M3  Institution Registry      ← CURRENT
M4  Institutional Licensing
M5  Digital Credentials & QR
M6  Institutional Membership
M7  Reporting & Dashboards
M8  Resource Allocation Engine
M9  Notifications & Services
M10 Production Hardening
```

The immediate engineering target is **M3 only**.
