# Production Runbook

## Environments

- Development uses local Postgres, Redis, MinIO, MailHog, and sandbox payments.
- Staging mirrors production deployment with test data, sandbox payments, monitoring, and error tracking.
- Production requires HTTPS, secure cookies, strict CORS, real backups, and no debug shortcuts.

## Deployment

1. CI runs install, env template validation, typecheck, lint, tests, build, migration validation, security checks, and Docker builds.
2. Main branch deploys to staging first.
3. Run `scripts/smoke-test.sh "$STAGING_BASE_URL"`.
4. Promote through the protected production environment after approval.
5. Run `scripts/smoke-test.sh "$PRODUCTION_BASE_URL"` and announce the release.

## Rollback

1. Stop promotions and identify the last healthy image tag or commit SHA.
2. Redeploy the previous API, worker, web, and admin images.
3. If a migration caused data risk, stop writes before any database action.
4. Restore from verified backup only after product and engineering approval.
5. Keep the incident open until smoke tests, deep health, and payment/webhook checks pass.

## Backups

- Production policy: daily full backup, 7 day minimum retention, encrypted storage outside the primary host.
- Run `scripts/backup-postgres.sh` from a host with `pg_dump` and `DATABASE_URL`.
- Verify each backup with `gzip -t`.
- Run a weekly restore drill with `scripts/restore-postgres.sh <backup.sql.gz>` against an isolated database.

## Monitoring And Alerts

- Scrape `/api/health/metrics` for process metrics.
- Use `/api/health` for load balancer checks.
- Restrict `/api/health/deep` to internal/admin networks.
- Alert on API 5xx rate, high latency, failed queue jobs, Redis/database connection failure, backup failure, disk pressure, and checkout/webhook failures.

## Incident Response

1. Assign incident lead, comms lead, and scribe.
2. Triage severity, affected systems, user impact, and start time.
3. Mitigate first: rollback, disable risky jobs, or put the service in maintenance.
4. Preserve logs with request IDs and avoid posting secrets in incident notes.
5. Publish player-facing updates for material outages.
6. Close with root cause, timeline, corrective actions, and owner/date for each action.

## CDN And Cache

- Serve built web assets through the CDN/reverse proxy.
- Cache `/assets/*` for one year with immutable headers.
- Do not cache `index.html` or authenticated API responses.
