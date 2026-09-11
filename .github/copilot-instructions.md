# Copilot instructions for EIASC CRil

## Build, test, and lint

Use the repo-level commands from the root:

```bash
cp .env.example .env
npm install
npm run db:generate
docker compose up -d postgres
npm run db:migrate
npm run db:seed
```

Validation commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

This repo uses a Node 20 + npm 10 toolchain and a CI workflow that runs the same checks on every push/PR.

Run a single test in the API package with Jest directly:

```bash
npm run test --workspace @eiasc/api -- --runTestsByPath src/locations/locations.service.spec.ts
```

Or by name pattern:

```bash
npm run test --workspace @eiasc/api -- --watch=false --runInBand --testNamePattern="licensing"
```

The web app does not have its own test script; validation is via the root `typecheck` and `build` flow.

## High-level architecture

This is a monorepo with two application packages:

- `apps/web` — Next.js app-router frontend for public and administrative journeys.
- `apps/api` — NestJS API for auth, registrations, institutions, licensing, and geography.
- `prisma/` — the source of truth for database schema, enums, and migration history.
- `docker-compose.yml` — local PostgreSQL for development.

The API is organized as feature modules under `apps/api/src`, with a Nest module/controller/service pattern. The root `AppModule` wires Prisma plus the major domain modules:

- `auth` for JWT access tokens, rotated refresh tokens, password reset flow, and role checks
- `locations` for geography and jurisdiction data
- `registrations` for member and institution registration workflows
- `institutions` for institutional management and documents
- `users` for user profiles and admin-facing user operations
- `licensing` for licensing lifecycle management

The database model is driven by `prisma/schema.prisma`, which defines the business domain and authorization model (roles, statuses, jurisdiction structures, institutions, memberships, licenses, and geography). `PrismaService` is the common injection point for database access; feature services use it rather than talking to the database directly from controllers.

The web app is route-based under `apps/web/app` and covers the public landing page, registration flows, login, tracking, and admin views. It is intentionally a thin presentation layer around the API/domain operations rather than a separate business logic system.

## Key conventions

- Prefer the Prisma schema as the contract for data shape and enumeration values. When changing domain models or enums, regenerate and migrate the database with the repo scripts and commit the migration.
- Keep API structure consistent with the existing NestJS pattern: feature folders contain a module plus controller/service files, and these are registered through the app module.
- Auth and authorization are enforced with shared guards and role metadata. If you add a permission or role change, update both the Prisma `RoleCode` enum and the relevant auth/guard logic.
- Authentication in this codebase uses short-lived JWT access tokens and hashed refresh tokens; password reset tokens are also hashed and rotated. Do not introduce plaintext storage of auth secrets or raw tokens.
- Use the repo-level Prisma scripts (`db:generate`, `db:migrate`, `db:seed`, `db:import-geography`, `db:verify-geography`) for database work rather than ad-hoc SQL or one-off scripts.
- The app follows a domain-first model: registrations, institutions, licenses, and geography are primary concepts in the schema and the API. Keep feature work aligned with those domain boundaries instead of creating unrelated cross-cutting abstractions.
- CI enforces: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` on Node 20. Changes should be validated through that same path before being considered complete.

## Working notes

- The repo’s README is the main onboarding reference for local setup and the core MVP assumptions.
- `PRD.md` and related planning documents describe the broader product scope; implementation should stay aligned with the MVP and avoid adding out-of-scope concepts.
- The project is not a generic CRUD app: geography, institution governance, role-aware administration, and licensing are core to the data model and API flow.
