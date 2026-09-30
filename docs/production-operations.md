# Production operations

## Release gate

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before deployment. Apply migrations with `npm run db:deploy`; never use `db:push` in production. PostgreSQL 16+ may be self-hosted or managed; Docker is not a production requirement.

## Backups and recovery

Create a compressed PostgreSQL backup every day and copy one weekly backup to independent storage. Test restoration periodically in an isolated database. The initial recovery objective is RPO 24 hours and RTO 8 hours.

## Runtime requirements

Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), `WEB_ORIGIN`, `API_PORT`, `API_PUBLIC_URL`, `WEB_PUBLIC_URL`, `NEXT_PUBLIC_API_URL`, and `API_INTERNAL_URL`. `WEB_ORIGIN` must contain the public web origin because the API fails closed when it is absent. Set `API_INTERNAL_URL` to the API's private network address when the web server and API run separately.

Install the locked dependencies with `npm ci`, run `npm run db:generate`, apply `npm run db:deploy`, initialize reference data for a new database, then run `npm run build`. Start a single-host deployment with `npm run start:prod`; otherwise supervise `npm run start:api` and `npm run start:web` independently. Serve the API and web app behind HTTPS termination. Preserve the `X-Request-ID` response header when forwarding requests.

## Monitoring

Monitor `/api/v1/health`, database connectivity, error rates, request latency, failed notification delivery, and disk capacity. Audit records are the source for administrative action history.
