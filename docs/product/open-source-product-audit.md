# Open Source Product Audit

This audit assumes Island Empires is intended to be a 100% free and open-source long-term browser strategy game.

## Product Direction

Island Empires already has a strong core: calm asynchronous city growth, resource planning, research, colonization, trade, alliances, PvE, controlled PvP, naval play, anti-abuse, and live events.

The main product risk is not missing features. The risk is that the game can look like a broad commercial MMO before it has proven the first-session and first-week experience. For a free open-source game, trust, clarity, onboarding, and community contribution matter more than shop depth.

## Redo First

### 1. Remove commercial monetization framing

Initial state:

- `spec/spec.md` still says the business model is "Free-to-play with optional premium convenience and cosmetics."
- `/shop` exposes Gems, Premium, Cosmetics, Services, and Purchase History.
- The backend has a full premium currency purchase flow.
- The supporter page is closer to the intended model because it frames support as optional donations with cosmetic-only rewards.

First pass completed:

- README and product spec now state "100% free and open source, with optional donations only."
- Player-facing `/shop`, `/shop/success`, and `/shop/cancel` routes were removed.
- The web premium shop files were removed.
- The API no longer mounts the legacy monetization module.
- Legal copy now describes optional donations instead of paid gameplay purchases.

Remaining work:

- Rename or remove legacy backend/database names that still use premium terminology.
- Keep only a Support Project page, donation history, and cosmetic supporter acknowledgements.
- Keep payment code only if donations are truly needed, and isolate it from gameplay progression.

Why:

For open-source players, a premium shop creates distrust even if the rules are fair. The game should not ask players to evaluate whether Gems are harmless. It should make the fairness model obvious.

### 2. Redesign onboarding around one guided first session

Current state:

- The tutorial has useful quests, but it spans many systems quickly: city overview, resources, workers, warehouse, construction, academy, scientists, research, city hall, world map, city view, warehouse inspection, port, transport.
- Navigation exposes many advanced systems immediately: marketplace, inventory, rankings, search, events, scouting, alliances, messages, reports, notifications.
- The public launch success criteria correctly depend on tutorial completion and D1 retention.

Recommended change:

- Build a focused 10-minute first-session path:
  1. See city.
  2. Start one upgrade.
  3. Assign workers.
  4. Start research.
  5. Understand "come back later".
- Gate or visually de-emphasize advanced navigation until the player unlocks it.
- Add a persistent "Next best action" panel that points to one useful action, not a list of systems.
- Treat transport, alliances, marketplace, scouting, PvP, naval combat, and events as day 2+ or unlock-driven experiences.

Why:

The product question in the README is correct: "Does the player want to return tomorrow?" The first session should answer that, not introduce every feature.

### 3. Make open-source readiness real

Initial state:

- Root `package.json` has `"private": true`.
- No visible `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, or `SECURITY.md` exists at repo root.
- README has a License section header, but no actual license file is present.

First pass completed:

- Root package now declares the MIT license.
- `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and `ASSET_LICENSES.md` were added.
- README links to contribution, security, conduct, and asset licensing docs.

Remaining work:

- Decide whether art assets use the same license or a separate Creative Commons license.
- Document third-party asset provenance.

Why:

"Open source" is not just code visibility. Contributors need legal clarity, setup clarity, and trust that assets can be reused safely.

## Improve Next

### 4. Consolidate the interface

The left navigation is too broad for early players. It currently reads like an admin map of the whole product, not a player journey.

Recommended information architecture:

- City: City, Research, Workers
- World: Map, Transport, Market
- Social: Alliance, Messages
- Progress: Quests, Reports, Rankings
- Community: Guide, Support Project, Account

Hide locked systems rather than showing dead ends.

### 5. Strengthen the identity

The game has a clear mechanical identity but still leans heavily on inherited browser-strategy conventions. For a community open-source game, differentiation matters.

Recommended product identity:

- Calm empire growth.
- No pay-to-win.
- No city destruction.
- Community-run worlds.
- Transparent balance files.
- Moddable/self-hostable server.

This should appear in README, landing/auth screens, and the in-game guide.

### 6. Make balance transparent and playable by contributors

The repo already has strong balance docs and config files. Turn that into a feature.

Recommended change:

- Add a "How balance works" guide.
- Add seed/demo worlds for quick testing.
- Add a balance simulator command for the first 7 days.
- Make balance changes reviewable with generated diffs from CSV/config.

Why:

Open-source strategy games live or die by whether contributors can reason about balance without reading the whole backend.

### 7. Reframe analytics for privacy

Current launch goals mention registration success, tutorial completion, D1 retention, API error rate, and economy exploits. That is useful, but open-source players will care about privacy.

Recommended change:

- Publish a privacy-friendly analytics policy.
- Track aggregate product health, not invasive behavior.
- Make analytics optional/self-host configurable.
- Document exactly what is collected.

## Keep

- Low-pressure design pillars.
- No permanent city destruction.
- Beginner protection and warehouse protection.
- Server-authoritative gameplay.
- Modular monolith architecture.
- Shared game-engine package with tests.
- Balance docs and CSVs.
- Admin moderation and anti-abuse tools.
- Optional supporter page, if it stays donation-first and cosmetic-only.

## Suggested Roadmap

### Phase 1: Trust Reset

- Remove legacy backend/database premium terminology.
- Complete asset provenance review.
- Audit asset licensing.

### Phase 2: First Session

- Simplify the tutorial.
- Add next-best-action guidance.
- Hide advanced systems until unlocked.
- Instrument tutorial completion and first upgrade/research completion.

### Phase 3: Community Launch

- Add self-hosting docs.
- Add demo world seed.
- Add public roadmap.
- Label beginner-friendly issues.
- Publish balance contribution workflow.

### Phase 4: Public World

- Run a small invite beta.
- Fix progression blockers.
- Open a fair fresh public world.
- Keep donations separate from gameplay.

## Product Principle

Every product decision should pass this test:

> Would a player still trust this game if they never donate and can read the source code?

If the answer is not clearly yes, redo the feature.
