# Incident Response Plan

## Severity

- SEV1: Game unavailable or data loss risk.
- SEV2: Major feature broken or payments affected.
- SEV3: Partial outage or degraded performance.
- SEV4: Minor bug or cosmetic issue.

## Response Flow

Detect, acknowledge, assess severity, assign owner, mitigate, communicate, resolve, then write a postmortem.

## Roles

- Incident lead owns severity, decisions, and mitigation.
- Comms lead owns internal and player-facing updates.
- Scribe records timeline, commands, links, and decisions.

## Triage

Check `/api/health`, `/api/health/deep`, `/api/health/metrics`, worker logs, queue failed jobs, database health, Redis health, payment webhooks, and recent deployments.

## Mitigation

Use maintenance mode, rollback, disable risky live events, disable payments, pause workers, or scale services depending on impact.

## Log Preservation

Preserve request IDs, deployment SHA, timestamps, and structured logs. Do not paste secrets, session tokens, payment secrets, private messages, or private keys into incident notes.

## Postmortem Template

- Summary
- Customer impact
- Timeline
- Root cause
- What worked
- What failed
- Corrective actions with owner and due date
