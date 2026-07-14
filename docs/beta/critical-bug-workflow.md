# Critical Bug Workflow

## Severity

- P0: Game unavailable, data loss, payments broken, or security issue.
- P1: Major progression blocker.
- P2: Important bug with a workaround.
- P3: Minor issue.
- P4: Cosmetic issue.

## Rules

- P0 issues are fixed immediately before beta growth continues.
- P1 issues are prioritized in the current sprint.
- P2 issues are scheduled based on player impact.
- P3 and P4 issues are collected for polish passes.

## Triage Flow

1. Confirm the report and reproduce where possible.
2. Mark related beta feedback as `reviewing`.
3. Assign severity and owner.
4. Fix and verify with the smallest practical test.
5. Deploy through the production runbook.
6. Mark feedback as `fixed` or `dismissed`.
7. Add player-facing notes to the beta changelog when the fix affects gameplay.

## Stop-Growth Rule

Do not invite additional beta cohorts while any P0 issue is open or while a P1 progression blocker affects new players.
