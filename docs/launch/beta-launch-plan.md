# Beta Launch Plan

## Beta Scope

Island Empires beta opens as a limited invite-only world named `Beta World 1`.

- Access model: invite code
- Max players: 500
- World status: beta
- Data policy: beta progress may be reset before public launch
- Public launch: use this beta data to decide whether to rebalance, reset, or open a fresh public world

## Operating Checklist

- Create invite codes in Admin > Beta.
- Invite one cohort at a time.
- Confirm registration, login, email verification, tutorial start, and tutorial completion.
- Review Admin > Beta every day for D1 retention, economy balance, combat activity, marketplace activity, alliance creation, feedback, reports, and abuse flags.
- Keep payment flows disabled or sandboxed until public launch approval.
- Triage feedback daily and mark items as reviewing, planned, fixed, dismissed, or archived.
- Use [Critical Bug Workflow](../beta/critical-bug-workflow.md), [Balance Adjustment Log](../beta/balance-adjustment-log.md), and [Communication Templates](../beta/communication-templates.md) during live operations.

## Critical Bug Triage

Critical beta bugs include:

- Registration or login failures
- Data loss or duplicate account creation
- Tutorial blockers
- Broken resource production or building completion
- Combat result corruption
- Marketplace duplication or unfair trades
- Moderation, privacy, or abuse-control failures

Workflow:

1. Reproduce the issue.
2. Mark related feedback as `reviewing`.
3. Create a fix with a focused test where practical.
4. Deploy through the production readiness checklist.
5. Mark feedback as `fixed` after validation.

## Balance Adjustment Workflow

- Use metrics and feedback together.
- Avoid changing economy or combat values because of a single report.
- Prefer small changes to production rates, costs, timers, and rewards.
- Record every adjustment in balancing docs before deployment.
- Recheck D1 retention, tutorial completion, storage-full frequency, and attack win rates after each change.

## Communication Template

Subject: Island Empires Beta Access

Island Empires is in beta. Your progress and feedback help improve the game before public launch.

Use your invite code during registration:

`INVITE-CODE-HERE`

This is a beta world. Progress may be reset before public launch as we fix bugs and adjust balance.

Please use the in-game Send Feedback button for bugs, confusing steps, balance concerns, performance issues, and suggestions.

## Public Launch Readiness

Public launch should wait until:

- Registration and login are stable.
- Tutorial completion is healthy.
- D1 retention is acceptable for the test cohort.
- Economy progression does not show severe bottlenecks.
- Combat reports are understandable and fair.
- Marketplace and alliance activity are functional.
- Open critical bugs are zero.
- Moderation and anti-abuse queues are manageable.
- A reset-or-carry-forward decision has been communicated.

See [Public Launch Plan](public-launch-plan.md) for the full launch decision checklist.
