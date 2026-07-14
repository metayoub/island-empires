# Contributing to Island Empires

Island Empires is a free and open-source long-term browser strategy game. Contributions should protect the core promise: no pay-to-win, no paid progression, no permanent city destruction, and calm asynchronous play.

## Local Setup

Prerequisites:

- Node.js
- pnpm
- Docker and Docker Compose

Install dependencies:

```bash
pnpm install
```

Start local services:

```bash
docker compose up -d
```

Run migrations:

```bash
pnpm db:migrate
```

Start the app:

```bash
pnpm dev
```

## Validation

Before opening a pull request, run the checks that match your change:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For focused frontend work:

```bash
pnpm --filter web test
pnpm --filter web typecheck
```

For focused backend or engine work:

```bash
pnpm --filter api test
pnpm --filter game-engine test
```

## Product Rules

Do not add:

- Paid gameplay advantages
- Premium currency
- Paid speedups
- Paid resources or units
- Paid-only research, buildings, combat power, or victory paths
- Mechanics that punish players for being offline
- Permanent destruction of core city progress

Prefer:

- Transparent balance changes
- Clear tutorial improvements
- Accessibility and mobile usability
- Privacy-preserving analytics
- Server-authoritative game rules
- Tests for shared game logic

## Balance Changes

Balance changes should include:

- The config or CSV change
- A short explanation of the intended player impact
- Test updates when formulas or unlock rules change
- Notes for first-week progression if early-game pacing is affected

## Pull Requests

Keep pull requests focused. Include:

- What changed
- Why it changed
- How it was tested
- Screenshots for visible UI changes

Avoid unrelated formatting churn.
