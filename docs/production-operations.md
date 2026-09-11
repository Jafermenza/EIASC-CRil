# Production operations

## Release gate

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before deployment. Apply migrations with `npm run db:deploy`; never use `db:push` in production.

## Backups and recovery

Create a compressed PostgreSQL backup every day and copy one weekly backup to independent storage. Test restoration periodically in an isolated database. The initial recovery objective is RPO 24 hours and RTO 8 hours.

## Runtime requirements

Set `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), `WEB_ORIGIN`, and `API_PORT`. Serve the API and web app behind HTTPS termination. Preserve the `X-Request-ID` response header when forwarding requests.

## Monitoring

Monitor `/api/v1/health`, database connectivity, error rates, request latency, failed notification delivery, and disk capacity. Audit records are the source for administrative action history.
