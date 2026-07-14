---
name: empire-acceptance-guard
description: Enforce Island Empires project acceptance rules and Definition of Done while generating or modifying code, database migrations, API endpoints, frontend UI, game balance config, or documentation. Use when Codex works in this repo, implements sprint features, edits backend or frontend code, changes schema/config/API behavior, or prepares a feature for review.
---

# Empire Acceptance Guard

## Overview

Use this skill to keep implementation work aligned with the project acceptance criteria and Definition of Done. Treat the files in `spec/` as the source of truth and verify every code change against them before finishing.

## Required Context

Before generating or modifying code, read:

- `spec/Acceptance criteria.md`
- `spec/Definition of Done.md`
- The relevant sprint file in `spec/sprints/`
- `spec/architecture.md` when changing module boundaries or backend/frontend structure
- `spec/techStack.md` when choosing libraries, tools, or framework patterns

When working on schema, balance, or API behavior, also read:

- `spec/database-schema-v1.md`
- `spec/game-balance-config-v1.md`
- `spec/api-spec-v1.md`
- `spec/config/balance/*.json`

## Implementation Workflow

1. Identify the sprint requirement and the user-facing acceptance criteria.
2. Inspect the existing code before choosing an approach.
3. Keep the implementation aligned with the modular monolith architecture.
4. Use the existing stack unless the user explicitly approves a change:
   - React, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand
   - Node.js, TypeScript, NestJS
   - PostgreSQL
   - Redis and BullMQ for background jobs
   - Prisma or Drizzle for ORM
5. Implement backend logic, frontend UI, database migration, API validation, error handling, tests, and documentation when the feature scope requires them.
6. Validate that no resource duplication bug can occur in resource production, upgrade start, or job completion logic.
7. Run the most relevant tests and checks available in the repo.
8. Report any DoD item that could not be completed and why.

## Acceptance Checklist

For Sprint 0 and early prototype work, verify:

- Player can access the game.
- A default city is created.
- City name is displayed.
- City level is displayed.
- Resource bar is visible.
- Buildings are visible.
- Data is loaded from the backend.

## Definition of Done Checklist

Before finishing, check whether the feature has:

- Backend logic implemented.
- Frontend UI implemented.
- Database migration exists.
- API validation exists.
- Errors are handled.
- Basic tests are added.
- Feature is manually tested when possible.
- No resource duplication bug exists.
- Documentation is updated.

If the task is documentation-only or config-only, mark non-applicable checklist items explicitly in the final response rather than pretending they are complete.

## Resource Integrity Rules

When implementing resource or timer logic:

- Apply offline production once per calculation window.
- Update `last_production_at` in the same transaction as resource changes.
- Clamp resources to storage capacity.
- Subtract building and research costs exactly once when the job starts.
- Complete construction and research jobs idempotently.
- Do not increment building or research levels twice if a worker retries.
- Recalculate storage after Warehouse upgrades.
- Update city level after City Hall upgrades.
- Apply Academy research effects through config-driven calculations.

## Final Response Requirements

In the final response, include:

- What changed.
- Which checks/tests were run.
- Any DoD gaps or acceptance risks.
- File references for important changes.
