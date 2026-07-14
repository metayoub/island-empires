# Rollback Runbook

## When To Roll Back

Roll back when a release causes data-loss risk, sustained 5xx errors, failed payments, login failure, broken city loading, or a security regression that cannot be mitigated quickly.

## Approval

SEV1 rollback can be approved by the incident lead. SEV2 rollback requires the incident lead plus engineering owner. Record the approver, target version, and reason in the incident notes.

## App Rollback

1. Identify the current deployed version with `GET /api/version`.
2. Identify the last healthy image tag or commit SHA from the deployment log.
3. Redeploy the previous `api`, `worker`, `web`, and `admin` images.
4. Run `scripts/smoke-test.sh "$PRODUCTION_BASE_URL"`.
5. Check `/api/health/deep`, queue health, payment webhooks, and login.
6. Notify the team with the rollback template below.

## Database Considerations

- Prefer backward-compatible migrations.
- Add columns before writing to them.
- Do not drop columns during the launch sprint.
- Stop writes before any destructive database action.
- Restore from backup only after approval and only when app rollback is insufficient.

## Communication Template

`Rollback started for <version> due to <impact>. Owner: <name>. Target restore version: <sha>. Next update in 15 minutes.`
