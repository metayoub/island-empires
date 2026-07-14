# Production Runbook

## Deploy

The production-readiness workflow installs dependencies, validates environment templates, typechecks, lints, tests, builds, validates Prisma migrations, runs security checks, builds Docker images, deploys staging, runs smoke tests, waits for production approval, deploys production, and runs production smoke tests.

## Check Health

- `GET /api/health`
- `GET /api/health/deep`
- `GET /api/health/metrics`
- `GET /api/version`

## Logs

Use structured JSON logs. Correlate API requests with `X-Request-Id`. Worker logs include queue counts every minute.

## Queues

Check active, delayed, failed, and waiting counts from `/api/health/metrics`. A failed-job spike or persistent backlog should page the launch owner.

## Migrations

Run `pnpm db:migration:check` before deployment and `pnpm db:migrate` during deployment.

## Backups And Restore

Run `scripts/backup-postgres.sh` for manual backup and `scripts/restore-postgres.sh <backup.sql.gz>` into an isolated database for restore drills.

## Disable Payments

Set the payment provider to the mock/sandbox provider or disable checkout routing at the deployment layer. Keep webhook endpoints available for already-created sessions.

## Disable Events

Use the admin dashboard to end or disable active live events before pausing workers.

## Maintenance Mode

Set `MAINTENANCE_MODE=true` for API gameplay route blocking and `VITE_MAINTENANCE_MODE=true` for the web maintenance page. Health, version, support, and admin endpoints remain available.

## Support Contacts

Primary support address is configured with `SUPPORT_EMAIL` and `VITE_SUPPORT_EMAIL`.
