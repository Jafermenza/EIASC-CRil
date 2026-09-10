# EIASC-CRil

Community Registration & Institutional Licensing Platform for the Ethiopian Islamic Affairs Supreme Council (EIASC).

## Project status / developer handoff

The repository follows the authoritative `PRD.md` and is being implemented sequentially against the Master MVP roadmap. Completed milestones must not be rebuilt unless a concrete regression or current-milestone dependency requires it.

### Milestone status

- **M0 Foundation — completed**
- **M1 Identity & Security — completed and validated**
  - Authentication, JWT access/refresh flow, password hashing/reset foundation
  - RBAC and jurisdiction-aware authorization
  - Audit foundation
  - Administrative user-management workflow for creating/updating/listing users and assigning configured roles/jurisdictions
  - CI lint/typecheck/test/build gates validated after corrective M1 work
- **M2 Individual Registration — completed**
- **M3 Institution Registry — completed**
  - Completion merge commit: `768793dac9702dae761ee4c6bf42a48f0968a501` (`M3 completed merge`)
- **M4 Institutional Licensing — implementation/validation in progress**
  - Working branch: `feature/m4-institutional-licensing`
  - Licensing module/controller/service and Prisma licensing model/migration are implemented
  - Admin licensing UI exists under `/admin/licenses` and `/admin/licenses/[id]`
  - Institution license view exists under `/institution/license`
  - Application states and license states are represented in Prisma
  - Jurisdiction scoping is enforced server-side
  - Institution eligibility requires an active institution
  - Licensing decision roles exclude institution administrators
  - Application review, correction request, approval, issuance, suspension, restoration, revocation, renewal, expiry handling, audit events, and license-number generation are implemented
  - License numbers use the `EIASC-L-YYYY-XXXXXX` format with an opaque/random suffix and database uniqueness
  - Issuance requires an approved application and must be performed by an authorized licensing role
  - **M4 is not yet declared complete:** the roadmap's explicit rejection workflow still needs to be implemented/validated, followed by the full M4 acceptance/security review and authoritative CI success

## Current M4 validation gate

CI is authoritative. A local assumption or a successful individual command does not count as milestone validation until the GitHub Actions workflow passes all required gates.

The required sequence is:

```bash
npm install
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run build
```

The M4 branch previously reached the following CI corrections:

1. The root lint script referenced a nonexistent `packages/**/*.{ts,tsx}` glob; it was corrected to lint the actual `apps` tree.
2. The ESLint configuration was aligned with the existing codebase by disabling legacy `no-explicit-any` and `no-empty-object-type` failures.
3. An unused `Request` import in `apps/api/src/auth/auth.controller.ts` was removed.
4. The latest CI typecheck exposed two TypeScript errors in `apps/api/src/licensing/licensing.service.ts` in the application transition map. These were corrected by explicitly typing the transition record and avoiding the narrow-array `.includes()` reason check.

Latest licensing typecheck fix commit:

`95db2e6c6fe8f97ea28dad54e7f63718cee316f6` — `fix M4 licensing application transition typecheck`

**Next developer action:** wait for/review the GitHub Actions result for the latest commit. If CI fails, fix only the reported failure and rerun the authoritative gates. Do not mark M4 complete merely because typecheck passes.

## M4 acceptance checklist

Before merging M4 to `main`, verify:

- [ ] Active institution eligibility
- [ ] Licensing application creation
- [ ] Review workflow
- [ ] Correction request with mandatory reason
- [ ] Rejection workflow with mandatory reason
- [ ] Re-submission/correction path
- [ ] Approval workflow
- [ ] No institution administrator can issue or approve its own license
- [ ] License number generation and uniqueness
- [ ] Expiry behavior
- [ ] Renewal behavior
- [ ] Suspension → restoration behavior
- [ ] Revocation behavior
- [ ] Jurisdiction enforcement for national/regional/zone/district/institution scopes
- [ ] Server-side authorization on every protected licensing action
- [ ] Audit evidence for critical licensing actions
- [ ] API/UI alignment
- [ ] Unit/integration/E2E coverage required by the PRD
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Production build passes
- [ ] M0–M3 regression review passes

## Architecture

- `apps/web` — Next.js frontend
- `apps/api` — NestJS API
- `prisma` — PostgreSQL/Prisma data foundation
- `docker-compose.yml` — local PostgreSQL for development

The platform is a modular monolith with an API-first architecture. Business logic and authorization belong in the NestJS API; client-side checks are not a security boundary.

## Requirements

- Node.js 20+
- npm 10+
- PostgreSQL 16+ (or the included Docker service)

## Local setup

```bash
cp .env.example .env
npm install
npm run db:generate
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend: `http://localhost:3000`
API health: `http://localhost:4000/api/v1/health`

## M1 authentication configuration

Set `JWT_SECRET` to a random value of at least 32 characters. Never commit `.env` or real credentials.

For a local development administrator, set:

```bash
BOOTSTRAP_ADMIN_EMAIL="admin@example.test"
BOOTSTRAP_ADMIN_PASSWORD="use-a-long-development-password"
RESET_TOKEN_DEBUG="true"
```

`RESET_TOKEN_DEBUG` is only honored outside production and exists solely to exercise the password-reset API until notification delivery is implemented.

M1 exposes:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/me`

Access tokens are short-lived JWTs. Refresh tokens are rotated and stored only as SHA-256 hashes. Passwords use Node.js `scrypt` and are never stored in plaintext.

## Development gates

Run these after each major milestone:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Scope discipline

The MVP deliberately excludes payment gateways, Fayda API integration, biometrics, native mobile apps, USSD, AI decision-making, blockchain, microservices and other post-MVP functionality listed in `PRD.md`.

Do not invent legal or regulatory requirements. Implement only rules explicitly defined by the authoritative PRD and approved project decisions.
