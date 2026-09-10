# EIASC-CRil

Community Registration & Institutional Licensing Platform for the Ethiopian Islamic Affairs Supreme Council (EIASC).

## MVP foundation

The repository follows the authoritative `PRD.md` and starts with the first coding milestone: a runnable development foundation.

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

## Development gates

Run these after each major milestone:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The MVP deliberately excludes payment gateways, Fayda API integration, biometrics, native mobile apps, USSD, AI decision-making, blockchain, microservices and other post-MVP functionality listed in `PRD.md`.
