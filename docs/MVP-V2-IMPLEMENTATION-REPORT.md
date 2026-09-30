# EIASC-CRil — MVP v2 Implementation & Requirements Comparison Report

**Repository:** `Jafermenza/EIASC-CRil`  
**Branch:** `main`  
**Assessment date:** 2026-09-12  
**Purpose:** Record the authoritative MVP requirements, compare them with the implementation completed in the repository, and identify the remaining production-readiness gates.

## 1. Executive summary

EIASC-CRil is being developed as a platform foundation for a national digital institutional registry, not as a disposable registration form. The implementation now includes the core individual/institution registration foundation, geographic hierarchy and jurisdiction controls, approval workflows, member–institution relationships, resource allocation, audit/RBAC foundations, reporting/export work, payment-ledger foundations, and the digital credential lifecycle.

The most recent MVP v2 work added:

- automatic digital membership ID generation for active members;
- automatic institutional license credential generation after license approval;
- credential profile/publication endpoints and member/institution profile views;
- configurable credential design/label settings;
- bilingual Gregorian/Hijri credential dates;
- certificate review and controlled publication workflow;
- QR/public verification support;
- acceptance coverage proving credential automation and publication/verification behavior.

The credential implementation is intentionally separated from the final production sign-off. A license credential can be generated while its publication remains pending review; publication requires an authorized decision-maker. This prevents an automatically generated certificate from becoming publicly authoritative before administrative review. citeturn955file0turn956file0

**Production-readiness conclusion:** the repository has substantial MVP v2 implementation, but the complete definition of MVP DONE must remain a checklist rather than a claim of completion until all validation gates pass, including build/typecheck, critical E2E, security threshold, production configuration, monitoring/error logging, and documentation verification.

## 2. SYSTEM VISION — REQUIRED BASELINE

The platform shall establish a single digital institutional registry connecting:

**Individual Members**

→ **Mosques / Madrasas / Islamic Institutions**

→ **District / Woreda**

→ **Sub-City / Town**

→ **City / Zone**

→ **Region**

→ **EIASC National Administration**

The MVP must establish the technical foundation for future:

- membership dues
- digital payments
- Waqf management
- welfare services
- Hajj/Umrah services
- education management
- institutional performance analytics
- GIS
- AI-assisted administration
- national resource allocation

The MVP must therefore be designed as a **platform**, not a disposable registration website.

## 3. MANDATORY MVP SCOPE — REQUIREMENT COMPARISON

| # | Required capability | Current implementation assessment | Evidence / notes |
|---|---|---|---|
| 1 | Administrative hierarchy management | **Implemented** | PostgreSQL Region/ZoneCity/SubcityTown/District models and geography administration foundation exist. |
| 2 | Individual registration | **Implemented** | Individual registration/member workflow is present and covered by API tests. |
| 3 | Institution/mosque/madrasa registration | **Implemented** | Institution application/profile models and administration workflow are present. |
| 4 | Institution affiliation | **Implemented** | `MemberInstitution` relationship model and membership workflow exist. |
| 5 | Cascading geographic selection | **Implemented** | Registration/jurisdiction uses database-backed hierarchical geography and validation. |
| 6 | Unique tracking codes | **Implemented** | Registration/application tracking codes are unique and indexed. |
| 7 | Stateful approval workflow | **Implemented** | Registration and institution/license status state machines and review actions exist. |
| 8 | Administrative dashboard | **Implemented** | Admin routes/dashboard work has been built around jurisdiction-scoped operations. |
| 9 | Search and filtering | **Implemented** | Institution/member/reporting list workflows include search/filter/pagination work. |
| 10 | Digital membership card | **Implemented** | Member credential profile and printable digital ID work was added. |
| 11 | Institutional operational certificate | **Implemented with controlled publication** | License approval generates a license credential; certificate publication is review-gated. |
| 12 | QR-based public verification | **Implemented** | Credential verification endpoint/page and acceptance coverage exist. |
| 13 | Institution/member aggregation | **Implemented** | Member–institution relationship and institution member counts are supported. |
| 14 | Per-capita resource allocation calculation | **Implemented** | Allocation policy/run/result models and acceptance test cover formula behavior. |
| 15 | Audit logging | **Implemented** | Significant authentication, workflow, credential and administrative actions are audited. |
| 16 | Role-based access control | **Implemented** | Role and jurisdiction authorization services/guards are present. |
| 17 | SMS-ready notification architecture | **Implemented as architecture** | Notification channel model supports SMS alongside in-app/email and future channels. |
| 18 | Responsive web interface | **Implemented** | Next.js responsive web application is the primary client. |
| 19 | API architecture | **Implemented** | NestJS API uses `/api/v1` endpoints. |
| 20 | Database backup and recovery | **Implemented as an operational drill** | Backup/restore validation script is included in the repository and CI. |
| 21 | Basic reporting/export | **Implemented** | Reporting trend and CSV export work exists; Excel import/template work also exists for geography. |

The database design explicitly includes `InstitutionType`, `InstitutionApplication`, `Institution`, leadership/staff/education/document models, `MemberInstitution`, `License`, `Credential`, audit data and allocation entities. citeturn949file0turn950file0turn951file0

## 4. DIGITAL CREDENTIAL REQUIREMENT COMPARISON

### Individual membership ID

**Required:** automatically generate and issue a digital membership ID after approval, expose it in the member profile, and allow printing.

**Implemented:** the current credential automation creates an active member credential when the member becomes active, generates a unique `EIASC-M-YYYY-XXXXXXXX` credential/membership number when needed, creates a credential record, and publishes the member credential. A member credential profile was also added. citeturn955file0turn957file0

### Institutional certificate

**Required:** issue an institutional operational certificate after approval, but require administrative/inspector/jurisdiction review before public publication.

**Implemented:** approval of an active license generates a license credential and creates a `CredentialPublication` record in `PENDING_REVIEW`. Authorized roles can review/publish it. The acceptance test verifies that the credential exists, publication begins in the review state, an authorized admin can publish it, and the resulting credential can be verified publicly. citeturn955file0turn942file0

### Required certificate/card information

The credential configuration/publication schema now supports:

- certificate title;
- certificate subtitle;
- member card title;
- issuing authority;
- validity in years;
- authorized signer and title;
- signature image URL;
- seal image URL;
- institution/location labels;
- membership/certificate number labels;
- issue/expiry/valid-for labels;
- publication/review timestamps;
- Gregorian issue/expiry dates from the credential;
- Hijri issue/expiry date fields;
- design version.

These values are stored in database configuration/publication data rather than being limited to one hard-coded presentation. citeturn956file0turn957file0

### Remaining credential presentation validation

The data/configuration foundation is implemented, but production acceptance must still visually validate that the final certificate and ID rendering meets the required institutional design standard: Islamic-art certificate background/frame, modern corporate ATM-wallet-size member ID, correct signature/seal rendering, readable bilingual dates, and print output at the required physical dimensions. These are presentation acceptance criteria and should not be marked fully complete without visual/print QA.

## 5. LONG-TERM SYSTEM — NON-GOALS

The following should not delay the first deployment:

- full native Android/iOS applications
- Analytics AI
- complete Waqf management
- full Zakat management
- advanced accounting
- biometric authentication
- sophisticated payment wallet
- automated legal/property verification
- national identity integration before authorized APIs are available

The architecture should anticipate these capabilities while keeping them outside MVP delivery scope.

## 6. RECOMMENDED INFORMATION ARCHITECTURE

```text
PUBLIC
├── Home
├── Register
│   ├── Individual
│   └── Institution
├── Track Application
├── Verify Credential
├── Find Institution
└── Help

AUTHENTICATED MEMBER
├── Dashboard
├── My Profile
├── My Institution
├── Membership Card
├── Registration Status
└── Notifications

INSTITUTION ADMIN
├── Dashboard
├── Institution Profile
├── Members
├── License
├── Documents
├── Reports
└── Notifications

DISTRICT ADMIN
├── Dashboard
├── Registrations
├── Institutions
├── Members
├── Licensing
├── Reports
└── Audit

REGIONAL ADMIN
├── Dashboard
├── Districts
├── Institutions
├── Members
├── Reports
└── Analytics

NATIONAL ADMIN
├── National Dashboard
├── Regions
├── Institutions
├── Members
├── Licensing
├── Resource Allocation
├── Reports
├── Audit
└── System Administration
```

## 7. REQUIRED USER JOURNEYS

### Citizen

```text
Register
 ↓
Pay
 ↓
Receive tracking code
 ↓
Track application
 ↓
Approval
 ↓
Receive membership number
 ↓
View/print digital card
 ↓
Later access services
```

### Institution

```text
Apply
 ↓
Pay
 ↓
Receive tracking code
 ↓
Administrative review
 ↓
Inspection if required
 ↓
Approval
 ↓
Digital operational certificate
 ↓
QR verification
 ↓
Become active institutional node
```

### Administrator

```text
Login
 ↓
View jurisdiction dashboard
 ↓
Review applications
 ↓
Approve/reject
 ↓
Monitor institutions
 ↓
Monitor members
 ↓
Generate reports
```

### National Leadership

```text
Login
 ↓
National dashboard
 ↓
View regional operations
 ↓
View institutions
 ↓
View membership
 ↓
View resource projections
 ↓
Make strategic decisions
```

## 8. DEFINITION OF MVP DONE — FINAL GATE CHECKLIST

| Requirement | Status for production sign-off | Comment |
|---|---|---|
| PostgreSQL schema implemented | **Implemented** | Core registry, membership, licensing, credentials, audit and allocation models exist. |
| Geographic hierarchy seeded | **Implemented** | Pinned geography import and verification workflow exists. |
| User authentication works | **Implemented / tested** | Authentication APIs and credential tests exist. |
| RBAC works | **Implemented / tested** | Role and jurisdiction authorization are present. |
| Hierarchical access control works | **Implemented / tested** | Acceptance coverage exists for horizontal/vertical privilege boundaries. |
| Individual registration works | **Implemented / tested** | Existing registration service tests pass in the latest reported API test run except unrelated app-module dependency state. |
| Institution registration works | **Implemented / tested** | Institution registration/review workflow exists. |
| Cascading location selection works | **Implemented** | Database-backed location APIs support cascading selection. |
| Tracking codes unique | **Implemented** | Unique database constraints/generation are present. |
| Approval workflow works | **Implemented / tested** | Institution/license/member lifecycle work exists. |
| Approval history recorded | **Implemented** | Status history/audit records exist. |
| Member records created correctly | **Implemented / tested** | Membership automation is covered. |
| Institution records created correctly | **Implemented** | Institution application approval creates/links institution records. |
| Digital membership cards work | **Implemented; visual QA pending** | Profile/printable credential implementation exists. |
| Institutional certificates work | **Implemented; publication QA pending** | Certificate generation and review/publication workflow exists. |
| QR verification works | **Implemented / acceptance-tested** | Public verification path is covered by credential acceptance tests. |
| Revoked credentials become invalid | **Implemented in credential lifecycle; final acceptance rerun required** | Verify/revocation behavior must remain part of final E2E sign-off. |
| Search/filter/pagination | **Implemented** | Reporting/institution/member list work exists. |
| Audit logs | **Implemented** | Audit model and service usage exist. |
| Resource allocation calculation | **Implemented / tested** | Formula acceptance test exists. |
| Allocation policy configurable | **Implemented** | Policy/formula are database-configured. |
| CSV/Excel export | **Implemented in relevant workflows** | CSV reporting/export is present; Excel support exists for geography import. Final end-to-end export QA remains a release gate. |
| Database backup | **Implemented as drill** | CI includes backup/restore validation. |
| Security tests pass | **Pending** | Dependency security review previously remained above its configured threshold and must be resolved or explicitly separated from CI without misrepresenting it as passed. |
| Critical E2E tests pass | **Pending final rerun** | Earlier E2E failures were repaired; a fresh full run is required for sign-off. |
| Production environment configured | **Pending** | Requires production deployment configuration and operational verification. |
| Monitoring and error logging enabled | **Pending verification** | Must be confirmed in the actual production environment. |
| Administrator documentation exists | **In progress / this report added** | This report documents the MVP requirements and implementation comparison. |
| User documentation exists | **Pending completion** | End-user operating guidance should be finalized before production sign-off. |

## 9. VALIDATION WORKFLOW USED

The implementation has been developed and validated in small, recoverable changes rather than treating the entire MVP as one untestable change.

```text
Authoritative PRD / MVP baseline
        ↓
Inspect existing implementation
        ↓
Implement one bounded capability
        ↓
Typecheck
        ↓
Unit/API tests
        ↓
Build
        ↓
Critical Playwright E2E
        ↓
Security / backup / geography gates
        ↓
Document acceptance evidence
        ↓
Commit to main
```

For the digital credential work specifically, the sequence was:

```text
Credential data/publication schema
        ↓
Configurable credential templates
        ↓
Admin credential design settings
        ↓
Credential profile/publication API
        ↓
Automatic member ID generation
        ↓
Automatic license certificate generation
        ↓
Certificate review queue
        ↓
Authorized publication
        ↓
Member/institution profile exposure
        ↓
QR verification acceptance test
```

The repository history records these stages, including automatic credential generation, configuration, profile exposure, review/publication, and acceptance testing. citeturn955file0turn957file0turn942file0

## 10. CI / PRODUCTION-READINESS STATUS

The current CI workflow is configured to run:

1. dependency installation;
2. Prisma generation;
3. database reset/setup;
4. payment and credential migrations;
5. seed data;
6. geography import;
7. geography verification;
8. lint;
9. typecheck;
10. API tests;
11. backup/restore drill;
12. production build;
13. Playwright browser installation;
14. critical E2E tests.

This is a strong validation pipeline, but a workflow definition is not evidence that every gate has passed. citeturn945file0

## 11. Known release blockers / next verification actions

Before calling MVP v2 **production-ready**, complete a fresh run of the complete gate sequence and record the actual result:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:verify-geography
npm run ops:backup-restore
npm run test:e2e
```

Then separately verify:

- `npm run security:review` against the configured policy threshold;
- production environment variables/secrets;
- database backup retention and restore procedure;
- monitoring and centralized error logging;
- administrator documentation;
- user documentation;
- visual/print QA for membership ID and institutional certificate.

No unresolved check should be represented as passed merely because the corresponding feature exists.

## 12. CHANGE RECORD — MVP v2 CREDENTIAL WORK

Recent implementation commits include:

- `dfe02326227023b79cb9b3d8a60eb4c802524e9a` — automate member IDs and license certificate generation.
- `bdf698605b852fa0521cf401ac06ab809ddb6aad` — add configurable credential templates.
- `0f5694f5e27b7d50fac8e984742386284ea6abb1` — add admin credential design settings.
- `6110516ed19678ce477540ae2264bf226ee03492` — link credential design into platform settings.
- `6dff67177930bc46c8dcf0c2f895c27540754592` — add publishable credential lifecycle and bilingual dates.
- `9f526fbe979925498af3e80c16395d906ea773b7` — add credential profile and publication endpoints.
- `4baa9fb8be480010a986062552b67080c3c6f2c5` — add member credential profile page.
- `4967367c1c1f83c5e209ade07f5af1342a1b08bb` — expose digital ID from member profile.
- `cfed379b062b326d9dcf29c104886e44f76ece0f` — add institution certificate profile page.
- `1c8ea36e4b99adb7f3b1582f0c85715fd7e029ad` — add certificate review queue service.
- `6484b8a143936d0f522b8647044abbe122f04202` — register certificate review queue.
- `c6bc9e2e8c1021ff4705076e6d4b8ee32ae439f1` — expose credential review queue to authorized admins.
- `432957aa10b65703599c3ef89a01e871da224f59` — add certificate review and publish workflow.
- `77d1f345c6c0d0c7a2168e036cabe9a314cabb3d` — prove automatic digital credential issuance and publication.

## 13. Final assessment

**MVP v2 is substantially implemented, but this report deliberately does not declare the entire system production-ready yet.** The correct next step is release-gate validation: execute the complete typecheck/test/build/E2E/security/backup/production checks, repair every failing gate, and only then mark the corresponding Definition of MVP Done items as complete.
