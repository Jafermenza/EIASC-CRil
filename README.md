# EIASC-CRil

Community Registration & Institutional Licensing Platform for the Ethiopian Islamic Affairs Supreme Council (EIASC).

## MVP foundation

The repository follows the authoritative `PRD.md` and is being implemented sequentially against its MVP definition.

- `apps/web` — Next.js frontend
- `apps/api` — NestJS API
- `prisma` — PostgreSQL/Prisma data foundation
- `docker-compose.yml` — local PostgreSQL for development

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

The MVP deliberately excludes payment gateways, Fayda API integration, biometrics, native mobile apps, USSD, AI decision-making, blockchain, microservices and other post-MVP functionality listed in `PRD.md`.
