# EIASC CRil
## Hierarchical Community Registration & Institutional Licensing Platform

# MASTER MVP PRD, ARCHITECTURE & AI AGENT IMPLEMENTATION ROADMAP — v2.1

**Organization:** Ethiopian Islamic Affairs Supreme Council (EIASC)  
**System:** Community Registration & Institutional Licensing Platform (CRil)  
**Repository:** `Jafermenza/EIASC-CRil`  
**Document Version:** 2.1  
**Status:** **MASTER ENGINEERING BUILD ROADMAP**  
**Updated:** 2026-09-13

> This v2.1 update supersedes the milestone-status summary in v2.0 while preserving the existing M0–M4 scope. It adds the critical registration configuration integration requirement, production settings work, SMS/Afro SMS, PWA, and explicit remaining milestones and release gates.

---

# 1. PURPOSE AND ENGINEERING RULES

This document is the authoritative implementation roadmap for completing the EIASC CRil MVP and preparing it for production.

The engineering agent must:

1. inspect the existing repository before changing code;
2. preserve completed functionality;
3. implement work sequentially and avoid unnecessary rewrites;
4. keep business rules in the NestJS API;
5. keep PostgreSQL/Prisma as the authoritative persistent data source;
6. keep frontend visibility separate from server-side authorization;
7. enforce authentication + role + jurisdiction + ownership + workflow state on the server;
8. audit critical administrative and lifecycle actions;
9. use configuration/reference data from the database rather than duplicated hard-coded UI lists;
10. run typecheck, tests, build and relevant E2E tests after functional changes;
11. never mark a milestone complete without repository and CI evidence;
12. never invent institutional/legal rules that require EIASC approval.

---

# 2. CURRENT MILESTONE STATUS

```text
M0  Foundation                         ✓ COMPLETE
M1  Identity & Security                ✓ COMPLETE
M2  Individual Registration            ✓ COMPLETE*
M3  Institution Registry               ✓ COMPLETE*
M4  Institutional Licensing            ✓ COMPLETE

M3.5 Registration Configuration        ← CURRENT / INTEGRATION GATE
M5  Digital Credentials & QR           ← NEXT AFTER REGISTRATION GATE
M6  Institutional Membership
M7  Reporting & Dashboards
M8  Resource Allocation Engine
M9  Notifications & Services
M10 Platform Settings & Integrations
M11 PWA / Offline / App Experience
M12 Production Hardening & Go-Live
```

`*` M2/M3 are functionally implemented, but the registration forms must pass the M3.5 integration gate before registration is considered production-ready.

Current engineering evidence shows M4 licensing is complete and the repository has an open registration-integration change connecting registration to live geography, institution types, fees, payment methods and receiving banks. The change also makes Subcity/Town and District/Woreda conditional on configured geography levels. 

---

# 3. NORTH STAR ARCHITECTURE

```text
PUBLIC USER
   │
   ├── Individual Registration
   ├── Institution Registration
   ├── Application Tracking
   └── Public Credential Verification
            │
            ▼
       NEXT.JS WEB / PWA
            │
            ▼
        NESTJS API
            │
            ▼
        PRISMA ORM
            │
            ▼
        POSTGRESQL
```

Core domains:

```text
Identity / RBAC
Geography
Registration
Institution Registry
Membership
Licensing
Credentials
Payments
Fees / Banks
Notifications
Reporting
Allocation
Audit
Platform Settings
```

---

# 4. AUTHORITATIVE CONFIGURATION PRINCIPLE

Registration must consume the same authoritative database-backed configuration used by administration.

```text
                    POSTGRESQL
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
   Geography      Institution Types   Payments
       │                │                │
       ▼                ▼                ▼
 Locations API   Institution API     Payment API
       │                │                │
       └────────────────┼────────────────┘
                        ▼
                 REGISTRATION UI
```

There must be:

- no hard-coded geography lists;
- no manually entered jurisdiction UUIDs;
- no duplicate institution-type lists;
- no registration dependency on an external geography API at submission time;
- no payment method selected merely because it is a UI default when that method is not configured;
- one authoritative set of database records shared by admin settings and public registration.

---

# 5. MILESTONE CONTRACT

Every milestone must document and verify:

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

A milestone is complete only when its implementation, database behavior, UI behavior and automated/manual acceptance evidence agree.

---

# 6. M0 — FOUNDATION

## Status

**✓ COMPLETE**

Next.js, NestJS, PostgreSQL, Prisma, environment configuration, build/test foundation and repository tooling remain the base platform.

---

# 7. M1 — IDENTITY & SECURITY

## Status

**✓ COMPLETE**

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

Server-side authorization must combine:

```text
Authentication
+ Role
+ Jurisdiction
+ Ownership
+ Workflow State
```

Critical actions require audit records.

---

# 8. M2 — INDIVIDUAL REGISTRATION

## Status

**IMPLEMENTED — PRODUCTION INTEGRATION GATE PENDING**

Flow:

```text
Public
 ↓
Registration
 ↓
Database-backed Geography
 ↓
Details / Documents
 ↓
Review
 ↓
Correction / Rejection / Approval
 ↓
Member
 ↓
Membership Credential
```

The form must preserve all required individual data and use authoritative configuration for geography and fees/payment.

---

# 9. M3 — INSTITUTION REGISTRY

## Status

**IMPLEMENTED — PRODUCTION INTEGRATION GATE PENDING**

Institution types and geography are reference/configuration data and must be loaded from the database.

Hierarchy:

```text
Region
 ↓
Zone / City
 ↓
Subcity / Town   (only when configured)
 ↓
District / Woreda (only when configured)
 ↓
Institution
```

Institution registration must use the same authoritative records as administration.

---

# 10. M3.5 — REGISTRATION CONFIGURATION INTEGRATION

## Status

**CURRENT WORK / RELEASE GATE**

## Objective

Close the production-critical gap discovered during UI testing: public individual and institution registration must actually consume live geography, institution type, fee, payment method and bank configuration.

## 10.1 Geography

The UI must implement a cascading database-backed selector:

```text
Region
  ↓
Zone / City
  ↓
Subcity / Town
  ↓
District / Woreda
```

Each child selector is populated from the selected parent.

### Conditional geography rule

**District/Woreda and Subcity/Town are not universally required.**

```text
If selected geography has no configured Subcity/Town:
    omit/allow empty

If selected geography has configured Subcity/Town:
    require selection

If selected parent has no configured District/Woreda:
    omit/allow empty

If selected parent has configured District/Woreda:
    require selection
```

The backend must enforce the same hierarchy and conditional requirement. Client-side validation alone is insufficient.

## 10.2 Institution Type

Institution registration must load active institution types from the authoritative institution-type API/database.

```text
Institution Types DB
        ↓
Institution Types API
        ↓
Registration selector
```

No duplicated hard-coded list is permitted.

## 10.3 Fees

Default configured fees:

```text
Individual registration: 100 ETB
Institution registration: 1,000 ETB
```

Both are editable by authorized Super Admin users and must be read from the database by registration/payment workflows.

## 10.4 Payment Methods and Banks

Registration must consume active payment configuration.

```text
Payment settings
     ↓
Active payment methods
     ↓
Registration UI
```

For bank transfer:

```text
Active receiving banks
     ↓
Bank selector
     ↓
Payment submission
```

Do not default to an unconfigured payment method.

## 10.5 Acceptance

```text
[ ] Fresh database contains bootstrap geography
[ ] Region selector loads from API
[ ] Zone/City selector cascades correctly
[ ] Subcity/Town is conditional
[ ] District/Woreda is conditional
[ ] Cross-parent geography is rejected server-side
[ ] Institution type selector loads database records
[ ] Registration fee loads from database
[ ] Active payment method loads from database
[ ] Active banks load from database
[ ] Payment form uses selected configured bank
[ ] Registration persists selected IDs
[ ] Admin and public forms use the same records
[ ] Unit/API tests pass
[ ] Playwright registration journey passes
[ ] Typecheck passes
[ ] Production build passes
```

## Definition of Done

The same database configuration visible to Super Admin is demonstrably consumed by both registration forms, with no hard-coded or manually entered UUID dependency.

---

# 11. M5 — DIGITAL CREDENTIALS & QR

## Status

**IN PROGRESS / NEXT AFTER M3.5**

Create trustworthy credentials for:

```text
Member
Institution
License
```

Required capabilities:

```text
Automatic credential number
Automatic issue date
Expiry / validity
QR verification
Public verification API
Public verification page
Revocation handling
Credential history/audit
Print/PDF-ready layouts
```

## Credential design configuration

The credential settings model/UI must support, as applicable:

- institution logo centered;
- authorizing authority left;
- Arabic authorizing authority right;
- license title;
- English body;
- Arabic body;
- editable/auto-loaded location;
- additional institution information;
- issue date;
- expiry date;
- automatic validity period;
- automatic credential/certificate number;
- QR code;
- signature image;
- A4 frame/background;
- scanned seal.

Regional Administrators may manage designs/configuration applicable to their authorized region. Super Admin retains global control.

## Verification contract

```text
GET /api/v1/credentials/verify/:credentialNumber
        ↓
verified: true/false
        ↓
Next.js /verify/[token-or-number]
        ↓
Clear public result
```

Verification must be based on the actual API response, and the Next.js rewrite/proxy must reach the NestJS API correctly.

Acceptance must cover valid, expired, revoked and invalid credentials.

---

# 12. M6 — INSTITUTIONAL MEMBERSHIP

## Objective

Connect members to institutions while preserving historical relationships.

```text
Member
  ↕
MemberInstitution
  ↕
Institution
```

Support:

```text
PENDING
ACTIVE
SUSPENDED
ENDED
```

Institution administrators may manage only permitted relationships within their institution/jurisdiction.

---

# 13. M7 — REPORTING & DASHBOARDS

## Objective

Provide trustworthy operational and governance reporting.

Required reporting:

```text
Credential issued totals
Member IDs issued
Institution certificates issued
License certificates issued
Active credentials
Expired credentials
Revoked credentials
Credential issuance trends
Regional breakdown
Period/date filtering
```

Dashboards must respect authorization and jurisdiction boundaries.

Charts require accessible summaries and must not depend on color alone.

---

# 14. M8 — RESOURCE ALLOCATION ENGINE

## Objective

Provide policy-driven allocation using verified institutional/member data.

Requirements:

- configurable policy inputs;
- eligibility rules;
- calculation transparency;
- jurisdiction-aware access;
- allocation history;
- audit trail;
- reporting/export where authorized.

Do not hard-code regulatory percentages or financial policy without EIASC approval.

---

# 15. M9 — NOTIFICATIONS & SERVICES

## Objective

Complete the shared notification architecture across in-app, email and SMS channels.

Existing credential-related notification events must be reused rather than creating a second notification mechanism.

## Channels

```text
In-app
Email
SMS
```

## Events

```text
Registration submitted
Tracking ID created
Registration approved
Registration rejected
Correction required
Renewal
Credential issued
Credential expiry
License expiry
Other configured system events
```

## SMS provider

Primary production integration target:

```text
Afro SMS / Afro API
```

The integration must be provider-adapter based so another SMS provider can be added without rewriting notification business logic.

## SMS settings UI

Super Admin must be able to:

- enable/disable SMS notifications;
- see provider/configuration status;
- configure Afro API credentials/settings securely;
- configure message/API format;
- edit notification templates;
- see supported template variables;
- send a test SMS;
- see success/error status;
- enable/disable individual event types.

Secrets must not be exposed in normal UI responses or logs.

## Acceptance

```text
[ ] Provider adapter
[ ] Afro SMS configuration
[ ] Enable/disable
[ ] Event toggles
[ ] Templates
[ ] Variables
[ ] Test SMS
[ ] Error/status visibility
[ ] In-app notification tests
[ ] Email notification tests
[ ] SMS event tests
[ ] End-to-end notification workflow
```

---

# 16. M10 — PLATFORM SETTINGS & INTEGRATIONS

Each settings area is a separate page. Avoid one giant settings screen.

## 16.1 Production Bootstrap

Super Admin page must show:

```text
Bootstrap status
Completed / Not completed
Missing requirements
Human-readable instructions
Safe rerun status
```

Bootstrap must be idempotent and auditable.

Required initialization includes deterministic reference/configuration data needed for registration, including geography and institution types.

## 16.2 Live Email Delivery

Separate page:

```text
Provider
Enable/disable
Sender configuration
Test delivery
Delivery status/errors
```

## 16.3 Digital ID & Certificate

Separate page for:

```text
Member ID design
License/certificate design
Regional configuration
Numbering
QR
Artwork
Validity
```

## 16.4 Geography

Separate page:

```text
Region
Zone/City
Subcity/Town
District/Woreda
```

Support:

```text
View
Search/filter
Add
Edit
Safe deactivate/delete
Bootstrap-imported records
Admin-added records
```

Authorization must be enforced server-side.

## 16.5 Telebirr / Payment Integrations

Separate page for:

```text
Telebirr
Other payment providers
Enable/disable
API configuration
Callback configuration
Test connection
Transaction status
```

## 16.6 Fees & Bank Accounts

Separate page for:

```text
Individual fee
Institution fee
Banks
Account name
Account number
Bank name
Branch
Enable/disable
Edit
Deactivate/delete
```

All records persist to PostgreSQL and the same records are consumed by registration/payment forms.

---

# 17. SUPER ADMIN USER MANAGEMENT

Complete the following before production:

```text
[ ] Replace manual Jurisdiction ID with geographic selectors
[ ] Proper Institution selector
[ ] Delete user
[ ] Require deletion reason
[ ] Notify affected user / retain deletion record
[ ] Clear user-creation errors
[ ] Improve role ↔ jurisdiction validation
[ ] Audit user creation/update/deletion
```

Super Admin creation is part of production bootstrap and must be verified from UI through database persistence and audit evidence.

---

# 18. INSTITUTION TYPE ADMINISTRATION

Complete:

```text
[ ] Delete/deactivate institution type
[ ] Prevent unsafe deletion when referenced
[ ] Explain why deletion is blocked
[ ] Preserve referential integrity
[ ] Audit changes
```

Preferred behavior is safe deactivation where historical registrations/institutions reference a type.

---

# 19. INDIVIDUAL DIGITAL ID / MEMBERSHIP CARD

Required design:

```text
Wallet-size
Modern professional layout
Member photo where permitted
Member name
Membership number
Institution
Status
QR verification
Issue/expiry information where applicable
```

Fields must be automatically populated from authoritative member data. Editable fields must be restricted to approved configuration.

---

# 20. CREDENTIAL LIFECYCLE

Persist configuration and issued credentials in PostgreSQL.

Support:

```text
Issued
Active
Expired
Cancelled
Terminated
Revoked
```

Every lifecycle action must retain:

```text
Timestamp
Actor
Previous state
New state
Reason where required
Audit evidence
```

Expiry dashboard and pre-expiry notification must be available.

---

# 21. PWA / APP-LIKE EXPERIENCE

## Status

**PLANNED**

The web application must become a proper Progressive Web App.

Requirements:

```text
Installable
Offline support
App-like standalone experience
Cross-platform desktop/mobile support
```

Implementation requirements:

- valid web app manifest;
- appropriate icons;
- service worker;
- safe static-asset caching;
- offline/fallback experience;
- installability verification;
- responsive mobile-first UI;
- preservation of unsent registration input where technically safe;
- clear weak-network behavior.

Offline mode must never imply that sensitive server-side operations were successfully submitted when the network is unavailable.

---

# 22. PRODUCTION READINESS MILESTONE — M12

## Objective

Prove the entire system works from a clean deployment through real operational workflows.

## Required checks

### Infrastructure

```text
[ ] Production PostgreSQL
[ ] Correct environment variables
[ ] Secrets configured securely
[ ] Database migrations applied
[ ] Bootstrap completed
[ ] Backup strategy
[ ] Restore test
[ ] HTTPS
[ ] Domain/reverse proxy
[ ] Next.js production build
[ ] NestJS production build
```

### Security

```text
[ ] Password/security configuration reviewed
[ ] RBAC verified
[ ] Jurisdiction isolation verified
[ ] Ownership checks verified
[ ] Public verification exposes only approved fields
[ ] Secrets absent from logs/client payloads
[ ] Rate limiting / abuse controls reviewed
[ ] Audit logs verified
```

### Operational configuration

```text
[ ] Super Admin exists
[ ] National/Regional/Zone/District admins created as required
[ ] Registrars created
[ ] Inspectors created
[ ] Finance officers created
[ ] Institution administrators created when institutions are approved
[ ] Geography loaded
[ ] Institution types loaded
[ ] Fees configured
[ ] Receiving banks configured
[ ] Payment provider configured/tested
[ ] Email provider configured/tested
[ ] SMS provider configured/tested
[ ] Notification templates approved
[ ] Credential artwork/design approved
```

### End-to-end business smoke tests

```text
[ ] Individual registration
[ ] Institution registration
[ ] Tracking lookup
[ ] Registrar review
[ ] Correction request
[ ] Rejection with reason
[ ] Approval
[ ] Member creation
[ ] Institution creation
[ ] License application
[ ] License approval/issuance
[ ] Credential issuance
[ ] QR/public verification
[ ] Expiry/revocation behavior
[ ] Notification delivery
[ ] Payment flow
[ ] Admin reporting
```

---

# 23. PRODUCTION ADMIN ROLE BOOTSTRAP

Create only the minimum operational users needed, using named institutional accounts rather than shared credentials.

Recommended initial operational structure:

```text
SUPER_ADMIN
  │
  ├── National administration
  ├── Regional administration
  ├── Finance
  ├── Registration/review
  └── System settings

REGIONAL_ADMIN
  └── Assigned region

ZONE_ADMIN
  └── Assigned zone

DISTRICT_ADMIN
  └── Assigned district

REGISTRAR
  └── Assigned registration workflow/jurisdiction

INSPECTOR
  └── Assigned inspection workflow/jurisdiction

FINANCE_OFFICER
  └── Payment/financial operations

INSTITUTION_ADMIN
  └── Own approved institution
```

The exact number of users and assignments are operational decisions. Do not create unnecessary privileged accounts.

Every administrative account must have:

```text
Unique username/email
Strong password
Least-privilege role
Correct geographic scope
Audit identity
Recovery procedure
```

---

# 24. GO-LIVE SEQUENCE — WHO DOES WHAT

## Phase A — Engineering

**Engineering team / AI coding agent**

```text
1. Finish M3.5 registration integration
2. Verify database-backed geography/type/payment behavior
3. Finish M5 verification contract and public UI
4. Finish M6/M7/M8/M9/M10/M11 according to dependencies
5. Run typecheck + unit/API tests + build + E2E
6. Fix all blocking failures
```

## Phase B — Super Admin / EIASC system owner

```text
1. Confirm institutional roles
2. Approve credential designs/legal wording
3. Approve notification templates
4. Approve registration fees
5. Configure geography/reference data policy
6. Configure banks/payment providers
7. Configure email/SMS providers
8. Create initial admin accounts
9. Verify audit/access boundaries
```

## Phase C — Operational administrators

```text
1. Test registration review
2. Test correction/rejection/approval
3. Test licensing workflow
4. Test credential issuance
5. Test payments
6. Test notifications
7. Verify reports
8. Report UAT defects
```

## Phase D — Production deployment owner

```text
1. Database backup
2. Apply migrations
3. Run idempotent bootstrap
4. Verify configuration
5. Deploy web/API
6. Verify HTTPS/domain
7. Run production smoke tests
8. Monitor logs/errors
9. Approve go-live
```

---

# 25. RELEASE GATES

The platform must pass gates in this order:

```text
GATE 1  Registration data integration
   ↓
GATE 2  Digital credential verification
   ↓
GATE 3  Membership + reporting
   ↓
GATE 4  Allocation
   ↓
GATE 5  Notifications + SMS/email
   ↓
GATE 6  Settings + payments + geography administration
   ↓
GATE 7  PWA
   ↓
GATE 8  Security / production hardening
   ↓
GATE 9  UAT
   ↓
GATE 10 Production smoke test
   ↓
GO LIVE
```

A later gate must not be declared passed while an earlier critical gate is failing.

---

# 26. TESTING STANDARD

For every completed workstream, verify at four levels where applicable:

```text
DATABASE
   ↓
BACKEND API
   ↓
FRONTEND UI
   ↓
E2E WORKFLOW
```

Required commands before release:

```text
npm run typecheck
npm test
npm run test:e2e
npm run build
```

A failing test is a release blocker until its root cause is understood and fixed. Do not disable M5/M6 acceptance tests merely to make CI green.

---

# 27. CURRENT EXECUTION PRIORITY

The immediate work order is:

```text
1. COMPLETE M3.5 — Registration Configuration Integration
   ├── Geography
   ├── Conditional Subcity/Town
   ├── Conditional District/Woreda
   ├── Institution Types
   ├── Fees
   ├── Payment Methods
   └── Banks

2. VERIFY M3.5 through UI + API + database + E2E

3. FIX/COMPLETE M5
   ├── Credential issuance
   ├── API verification
   ├── Next.js rewrite/proxy
   ├── Public verification page
   ├── QR
   └── Revocation/expiry states

4. COMPLETE M6
5. COMPLETE M7
6. COMPLETE M8
7. COMPLETE M9
   ├── In-app
   ├── Email
   └── Afro SMS

8. COMPLETE M10
   ├── Bootstrap
   ├── Email settings
   ├── Credential settings
   ├── Geography settings
   ├── SMS settings
   ├── Payment integrations
   └── Fees/banks

9. COMPLETE M11 PWA
10. COMPLETE M12 PRODUCTION HARDENING
11. UAT
12. PRODUCTION GO-LIVE
```

---

# 28. DEFINITION OF MVP COMPLETION

The MVP is not complete merely because individual pages exist.

MVP completion requires:

```text
Authoritative database
        ↓
Correct API behavior
        ↓
Correct UI behavior
        ↓
Correct role/jurisdiction enforcement
        ↓
Auditable workflow
        ↓
Notifications
        ↓
Payments
        ↓
Credentials + verification
        ↓
Reports
        ↓
PWA experience
        ↓
Clean CI
        ↓
Production smoke test
        ↓
UAT approval
        ↓
GO LIVE
```

No hard-coded production reference data may remain where an administrative/database configuration is required.

No critical workflow may depend on a manual UUID entry.

No public credential verification may be declared complete until the real API response is successfully consumed and rendered by the public verification page.

---

# 29. CHANGE CONTROL

When implementing the roadmap:

```text
Inspect → Plan → Implement → Test → Review → Merge
```

Prefer small, reviewable commits and preserve a known recovery point before risky migrations or production changes.

For each milestone, record:

```text
Branch
Commit(s)
Database migration
Tests
CI result
Known warnings
Known limitations
Acceptance evidence
```

The roadmap status must be updated only after the corresponding evidence exists.
