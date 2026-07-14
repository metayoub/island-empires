# Island Empires

**A calm, free, open-source browser strategy game about growing an island empire over time.**

Build cities, manage resources, research technologies, trade with other players, join alliances, explore islands, and return each day to keep your empire moving.

Island Empires is designed for slow, thoughtful play. No pay-to-win. No premium currency. No paid boosts. No city destruction while you are offline.

---

## Why Play?

- Build and upgrade island cities
- Manage workers, resources, research, and storage
- Expand to new islands and specialize your empire
- Trade, cooperate, and join alliances
- Fight PvE camps and optional protected PvP
- Progress at a relaxed pace without needing to stay online all day

The core question is simple:

> Do you want to come back tomorrow and continue growing your empire?

---

## Free And Open Source

Island Empires is intended to be fully playable for everyone.

- Core gameplay is free
- Donations are optional
- Donation rewards must stay cosmetic or community-facing only
- Gameplay resources, units, research, buildings, and strategic advantages are earned in-game
- The source code is open for learning, self-hosting, and contribution

---

## Project Status

Island Empires is in active development.

Current systems include city building, resources, population, happiness, research, world map, colonization, transport, marketplace, alliances, scouting, PvE, controlled PvP, naval combat, notifications, events, moderation tools, inventory, and supporter donations.

The current product focus is trust, onboarding, balance, and preparing the game for real players.

---

## Run Locally

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

Run database migrations:

```bash
pnpm db:migrate
```

Start the game:

```bash
pnpm dev
```

Open:

```text
http://localhost:5173
```

Useful commands:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

---

## For Contributors

Start here:

- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Asset Licensing](ASSET_LICENSES.md)

Product and design references:

- [Product Audit](docs/product/open-source-product-audit.md)
- [Public Launch Plan](docs/launch/public-launch-plan.md)
- [UX Simplification Audit](docs/ux/process-simplification-audit.md)
- [Balance Docs](docs/balancing)
- [Technical Architecture](spec/architecture.md)

Please keep contributions aligned with the project promise: calm play, fair progression, open source, and no paid gameplay advantage.

---

## License

Source code is licensed under the [MIT License](LICENSE).

Game art, icons, images, audio, fonts, and other media assets require separate provenance review before public release. See [ASSET_LICENSES.md](ASSET_LICENSES.md).
