# Technical Architecture Document

# Long-Term Browser Strategy Game

## Island Empire Builder Architecture

---

## 1. Architecture Goal

The goal is to build a browser-based long-term strategy game that starts small as a solo playable prototype and can evolve into a full multiplayer persistent world.

The architecture must support:

- Solo city-building gameplay
- Offline progression
- Long timers
- Resource production
- Building upgrades
- Research
- Multiple cities
- World map
- PvE
- Multiplayer world
- Trade
- Alliances
- PvP
- Notifications
- Live events
- Admin tools
- Anti-cheat
- Monetization
- Analytics
- Long-term scalability

---

## 2. Architecture Philosophy

The best architecture for this project is not microservices from day one.

The recommended approach is:

> Start with a modular monolith, then split services only when the game has enough users and clear scaling needs.

---

## 3. Recommended Architecture Style

## 3.1 Phase 1 — Modular Monolith

Use this during:

- Prototype
- Solo playable version
- MVP
- Alpha
- Early beta

### Why

A modular monolith is easier to build, test, debug, deploy, and change quickly.

It allows the team to move fast without creating unnecessary distributed system complexity.

### Modules

- Auth Module
- Player Module
- World Module
- City Module
- Building Module
- Resource Module
- Research Module
- Map Module
- Movement Module
- PvE Module
- Combat Module
- Trade Module
- Alliance Module
- Messaging Module
- Notification Module
- Admin Module
- Analytics Module
- Payment Module

---

## 3.2 Phase 2 — Service-Oriented Architecture

Use this when:

- The game has many concurrent players
- Background jobs become heavy
- Combat/trade/movement processing needs isolation
- Admin/live-ops needs separate permissions
- WebSocket traffic grows
- Analytics traffic becomes large

### Services to Split Later

- Auth Service
- Game API Service
- World Simulation Service
- Realtime Gateway
- Job Worker Service
- Combat Service
- Trade Service
- Notification Service
- Admin Service
- Analytics Service
- Payment Service

---

# 4. High-Level System Architecture

```md id="architecture-diagram"
[ Browser / PWA Client ]
|
| HTTPS
v
[ Nginx / Reverse Proxy / CDN ]
|
v
[ Game API Backend ]
|
|----------------------|
| |
v v
[ PostgreSQL ] [ Redis ]
| |
| v
| [ Job Queue ]
| |
| v
| [ Worker Service ]
|
v
[ Object Storage ]

Additional systems:

[ WebSocket Gateway ]
[ Admin Dashboard ]
[ Analytics Pipeline ]
[ Monitoring / Logs ]
[ Payment Provider ]
[ Email Provider ]
```

---

# 5. Recommended Technology Stack

## 5.1 Frontend

Recommended:

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- Zustand or Redux Toolkit
- WebSocket client
- PWA support later

### Why

React + TypeScript is a good choice for a browser strategy game because the UI will contain many stateful screens:

- City dashboard
- Resource bars
- Timers
- Map
- Reports
- Marketplace
- Alliance screens
- Admin tools

---

## 5.2 Backend

Recommended:

- Node.js
- TypeScript
- NestJS or Fastify
- REST API first
- WebSocket gateway
- Background workers

### Why

This project contains many domain modules and background jobs.

A TypeScript backend keeps the frontend and backend language aligned, which is useful for shared types and faster development.

---

## 5.3 Database

Recommended:

- PostgreSQL

Use PostgreSQL for:

- Users
- Players
- Worlds
- Cities
- Buildings
- Resources
- Research
- Movements
- Battles
- Trade
- Alliances
- Messages
- Reports
- Payments
- Admin logs

PostgreSQL is a strong default choice because it supports relational consistency, transactions, indexing, JSONB, and partitioning. PostgreSQL’s official documentation describes partitioning as useful for improving query performance in cases where heavily accessed rows are concentrated in a small number of partitions. PostgreSQL also supports JSONB indexing for querying document-like data when needed.

---

## 5.4 Cache and Queue

Recommended:

- Redis
- BullMQ

Use Redis for:

- Sessions, optional
- Cache
- Rate limiting
- WebSocket scaling
- Temporary locks
- Queue backend
- Short-lived game state
- Pub/Sub events

Redis Streams can act as an append-only event structure with consumer groups, which is useful for real-time event processing and asynchronous consumption. Redis Pub/Sub supports pattern-based subscriptions, which can be useful for broadcasting events by world, alliance, or player channel.

Use BullMQ for:

- Building completion jobs
- Research completion jobs
- Movement arrival jobs
- Trade arrival jobs
- Battle resolution jobs
- Notification jobs
- Event start/end jobs
- Scheduled reports

BullMQ supports delayed, scheduled, repeatable jobs, retries, priorities, and concurrency settings, which fits the timer-heavy nature of this game.

---

## 5.5 Realtime Layer

Recommended:

- Socket.IO or native WebSocket

Use realtime for:

- Resource updates
- Building completion
- Incoming attack warning
- Trade arrival
- Chat
- Alliance chat
- Notifications
- Admin monitoring

## Socket.IO supports fallback behavior when WebSocket is not available and provides reconnection handling. It also supports scaling across multiple servers with adapters, including Redis-based adapters.

## 5.6 Storage

Recommended:

- S3-compatible object storage
- MinIO for local development

Use object storage for:

- Player avatars
- Alliance logos
- City skin assets
- Generated reports, optional
- Static game assets
- Event images
- Admin exports

---

## 5.7 Infrastructure

Recommended for early stage:

- Docker Compose
- Nginx reverse proxy
- PostgreSQL container
- Redis container
- API container
- Worker container
- Frontend container

Recommended for later:

- Kubernetes or managed containers
- Managed PostgreSQL
- Managed Redis
- CDN
- Centralized logging
- Horizontal scaling

---

# 6. Main Runtime Components

## 6.1 Browser Client

The browser client is responsible for:

- Displaying city state
- Displaying resources
- Displaying timers
- Sending player actions
- Showing map
- Showing messages/reports
- Handling WebSocket events
- Showing notifications
- Running UI-only predictions

Important rule:

> The frontend must never be trusted for game authority.

The frontend can display predicted timers and values, but the backend is the source of truth.

---

## 6.2 Game API Backend

The Game API is responsible for:

- Authentication
- Authorization
- Game actions
- Resource validation
- Building upgrades
- Research start
- Transport start
- Combat commands
- Trade commands
- Alliance commands
- Messaging
- Reports
- Admin APIs

The API must validate every action.

Example:

When a player starts a building upgrade, the backend must verify:

- Player owns the city
- Building exists
- Requirements are met
- Resources are available
- Queue is available
- City is not locked
- Request is not duplicated
- Cost is deducted transactionally
- Job/timer is created safely

---

## 6.3 Worker Service

The Worker Service processes asynchronous jobs.

Responsibilities:

- Complete building upgrades
- Complete research
- Resolve arrivals
- Resolve battles
- Complete trades
- Generate reports
- Send notifications
- Process live events
- Run anti-abuse checks
- Run analytics aggregation

Important rule:

> Workers must be idempotent.

If the same job runs twice, the final state must still be correct.

---

## 6.4 WebSocket Gateway

The WebSocket Gateway is responsible for realtime communication.

Channels:

- Player channel
- City channel
- World channel
- Island channel
- Alliance channel
- Admin channel

Examples:

```md id="websocket-events"
player:{playerId}
city:{cityId}
world:{worldId}
island:{islandId}
alliance:{allianceId}
admin:world:{worldId}
```

Events:

- `building.completed`
- `research.completed`
- `trade.arrived`
- `army.arrived`
- `battle.report.created`
- `message.received`
- `alliance.announcement`
- `notification.created`

---

## 6.5 Admin Dashboard

Admin dashboard responsibilities:

- Player search
- City search
- Resource audit
- Trade audit
- Battle audit
- Reports review
- Player warnings
- Ban/mute/suspend
- World configuration
- Event configuration
- Economy monitoring
- Payment review
- Anti-cheat review

---

## 6.6 Analytics System

Analytics responsibilities:

- Track player behavior
- Track economy health
- Track retention
- Track tutorial completion
- Track marketplace activity
- Track PvP impact
- Track alliance participation
- Track monetization
- Detect abnormal patterns

---

# 7. Domain Modules

---

## 7.1 Auth Module

Responsibilities:

- Register
- Login
- Logout
- Password reset
- Email verification
- Token generation
- Session management
- Account deletion request

Tables:

- `users`
- `sessions`
- `email_verification_tokens`
- `password_reset_tokens`

Security requirements:

- Password hashing
- Rate limiting
- Brute-force protection
- Secure cookies or JWT
- Email verification
- Device/session tracking

---

## 7.2 Player Module

Responsibilities:

- Player profile
- Player name
- Avatar
- Score
- Settings
- Beginner protection
- Vacation mode
- Player status

Tables:

- `players`
- `player_settings`
- `player_scores`
- `player_statuses`

---

## 7.3 World Module

Responsibilities:

- Create world
- Configure world speed
- Generate islands
- Assign players to world
- World status
- World merge support later

Tables:

- `worlds`
- `world_settings`
- `world_events`
- `world_statistics`

---

## 7.4 Map Module

Responsibilities:

- Island generation
- City slot management
- Coordinates
- Distance calculation
- Travel time calculation
- Map search
- Map filters

Tables:

- `islands`
- `island_slots`
- `map_landmarks`
- `map_pve_locations`

---

## 7.5 City Module

Responsibilities:

- Create first city
- Create colony
- Rename city
- City overview
- City population
- City happiness
- City status
- City ownership validation

Tables:

- `cities`
- `city_statuses`
- `city_population_snapshots`

---

## 7.6 Building Module

Responsibilities:

- Building list
- Building upgrades
- Upgrade requirements
- Construction queue
- Completion logic
- Building effects

Tables:

- `city_buildings`
- `building_definitions`
- `building_upgrade_jobs`

---

## 7.7 Resource Module

Responsibilities:

- Resource balances
- Resource production
- Offline production
- Resource spending
- Resource transfer
- Resource caps
- Resource protection
- Resource ledger

Tables:

- `city_resources`
- `resource_transactions`
- `resource_production_settings`
- `resource_snapshots`

---

## 7.8 Research Module

Responsibilities:

- Research points
- Technology tree
- Research queue
- Research completion
- Unlocks
- Research bonuses

Tables:

- `player_research`
- `research_definitions`
- `research_jobs`
- `research_unlocks`

---

## 7.9 Movement Module

Responsibilities:

- Army movement
- Trade movement
- Colonization movement
- Return movement
- Arrival processing
- Travel time calculation

Tables:

- `movements`
- `movement_units`
- `movement_resources`
- `movement_events`

---

## 7.10 PvE Module

Responsibilities:

- PvE camp generation
- PvE levels
- PvE battles
- PvE rewards
- PvE cooldowns

Tables:

- `pve_camps`
- `pve_battles`
- `pve_rewards`

---

## 7.11 Combat Module

Responsibilities:

- Unit training
- Unit stats
- Battle calculation
- Casualties
- Loot
- Battle reports
- Protection validation
- Anti-bullying rules

Tables:

- `city_units`
- `unit_definitions`
- `unit_training_jobs`
- `battles`
- `battle_participants`
- `battle_reports`

---

## 7.12 Trade Module

Responsibilities:

- Internal transport
- Marketplace
- Trade offers
- Trade validation
- Trade ship capacity
- Trade reports
- Anti-pushing checks

Tables:

- `trade_offers`
- `trade_transactions`
- `trade_routes`
- `trade_reports`

---

## 7.13 Alliance Module

Responsibilities:

- Create alliance
- Join alliance
- Applications
- Roles
- Permissions
- Alliance chat
- Alliance projects
- Alliance diplomacy

Tables:

- `alliances`
- `alliance_members`
- `alliance_roles`
- `alliance_applications`
- `alliance_projects`
- `alliance_donations`

---

## 7.14 Messaging Module

Responsibilities:

- Player messages
- System messages
- Reports
- Inbox
- Read/unread state
- Block player
- Report message

Tables:

- `messages`
- `message_recipients`
- `reports`
- `player_blocks`
- `message_reports`

---

## 7.15 Notification Module

Responsibilities:

- In-game notifications
- Email notifications
- Browser push notifications
- Notification settings
- Notification templates

Tables:

- `notifications`
- `notification_settings`
- `push_subscriptions`
- `email_logs`

---

## 7.16 Admin Module

Responsibilities:

- Admin permissions
- Player moderation
- World configuration
- Event configuration
- Audit logs
- Support tools

Tables:

- `admin_users`
- `admin_roles`
- `admin_actions`
- `moderation_cases`

---

## 7.17 Payment Module

Responsibilities:

- Premium currency
- Shop items
- Purchases
- Payment provider callbacks
- Refunds
- Fraud review

Tables:

- `shop_items`
- `player_wallets`
- `premium_transactions`
- `payment_orders`
- `payment_events`

---

## 7.18 Analytics Module

Responsibilities:

- Event tracking
- KPI aggregation
- Retention metrics
- Economy metrics
- Combat metrics
- Trade metrics
- Funnel analysis

Tables:

- `analytics_events`
- `daily_player_metrics`
- `daily_world_metrics`
- `economy_metrics`

---

# 8. Data Architecture

---

## 8.1 Database Strategy

Use PostgreSQL as the source of truth.

Core principles:

- Every important game action is stored
- Economy changes are logged
- Sensitive actions are auditable
- Use transactions for resource spending
- Use constraints to protect data integrity
- Use indexes for player/world/city access
- Partition large historical tables later

---

## 8.2 Multi-World Data Model

Every major game table should include `world_id` when relevant.

Examples:

- `players.world_id`
- `cities.world_id`
- `islands.world_id`
- `movements.world_id`
- `battles.world_id`
- `trade_offers.world_id`
- `alliances.world_id`

This allows:

- Multiple servers/worlds
- World-specific rankings
- Easier world merges later
- Better data partitioning later

---

## 8.3 Core Tables

### users

```sql id="users-table"
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### worlds

```sql id="worlds-table"
CREATE TABLE worlds (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  speed_building NUMERIC NOT NULL DEFAULT 1,
  speed_research NUMERIC NOT NULL DEFAULT 1,
  speed_resource NUMERIC NOT NULL DEFAULT 1,
  speed_travel NUMERIC NOT NULL DEFAULT 1,
  opened_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### players

```sql id="players-table"
CREATE TABLE players (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  world_id UUID NOT NULL REFERENCES worlds(id),
  name TEXT NOT NULL,
  avatar_url TEXT,
  score BIGINT NOT NULL DEFAULT 0,
  beginner_protection_until TIMESTAMP,
  vacation_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(world_id, name)
);
```

---

### islands

```sql id="islands-table"
CREATE TABLE islands (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES worlds(id),
  x INT NOT NULL,
  y INT NOT NULL,
  main_resource TEXT NOT NULL,
  luxury_resource TEXT NOT NULL,
  max_slots INT NOT NULL DEFAULT 16,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(world_id, x, y)
);
```

---

### cities

```sql id="cities-table"
CREATE TABLE cities (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES worlds(id),
  player_id UUID NOT NULL REFERENCES players(id),
  island_id UUID NOT NULL REFERENCES islands(id),
  slot_index INT NOT NULL,
  name TEXT NOT NULL,
  level INT NOT NULL DEFAULT 1,
  population INT NOT NULL DEFAULT 50,
  happiness INT NOT NULL DEFAULT 100,
  corruption NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(island_id, slot_index)
);
```

---

### city_resources

```sql id="city-resources-table"
CREATE TABLE city_resources (
  city_id UUID PRIMARY KEY REFERENCES cities(id),
  wood BIGINT NOT NULL DEFAULT 0,
  marble BIGINT NOT NULL DEFAULT 0,
  wine BIGINT NOT NULL DEFAULT 0,
  crystal BIGINT NOT NULL DEFAULT 0,
  sulfur BIGINT NOT NULL DEFAULT 0,
  gold BIGINT NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### city_buildings

```sql id="city-buildings-table"
CREATE TABLE city_buildings (
  id UUID PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES cities(id),
  building_type TEXT NOT NULL,
  level INT NOT NULL DEFAULT 1,
  slot_index INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  upgrade_started_at TIMESTAMP,
  upgrade_finishes_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(city_id, building_type)
);
```

---

### movements

```sql id="movements-table"
CREATE TABLE movements (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES worlds(id),
  player_id UUID NOT NULL REFERENCES players(id),
  origin_city_id UUID NOT NULL REFERENCES cities(id),
  destination_city_id UUID NOT NULL REFERENCES cities(id),
  movement_type TEXT NOT NULL,
  status TEXT NOT NULL,
  departure_time TIMESTAMP NOT NULL,
  arrival_time TIMESTAMP NOT NULL,
  return_time TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### resource_transactions

```sql id="resource-transactions-table"
CREATE TABLE resource_transactions (
  id UUID PRIMARY KEY,
  world_id UUID NOT NULL REFERENCES worlds(id),
  city_id UUID NOT NULL REFERENCES cities(id),
  player_id UUID NOT NULL REFERENCES players(id),
  transaction_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 8.4 Resource Ledger

Every resource change should create a transaction record.

Examples:

- Production gained
- Building cost spent
- Research cost spent
- Trade sent
- Trade received
- Loot lost
- Loot gained
- Admin adjustment
- Event reward

Why this matters:

- Debugging
- Anti-cheat
- Player support
- Economy analysis
- Admin audits

---

## 8.5 Large Table Partitioning

Later, partition large tables by `world_id` or time.

Candidate tables:

- `resource_transactions`
- `analytics_events`
- `battle_reports`
- `messages`
- `movements`
- `admin_actions`

Partitioning should not be done too early unless there is a real performance need.

---

# 9. Game State Calculation

---

## 9.1 Source of Truth

The backend and database are the source of truth.

The frontend may display predicted values but must refresh from the backend when important actions happen.

---

## 9.2 Resource Production Model

Use lazy calculation.

Do not update every city every second.

Instead, store:

- Current resource balance
- Last calculated timestamp
- Production per hour
- Storage capacity

When the player opens the city or performs an action:

1. Load city resources
2. Calculate elapsed time
3. Calculate produced resources
4. Apply storage cap
5. Update balance
6. Update `last_calculated_at`

---

## 9.3 Example Resource Calculation

```ts id="resource-calculation"
function calculateProducedAmount(
  productionPerHour: number,
  lastCalculatedAt: Date,
  now: Date,
): number {
  const elapsedMs = now.getTime() - lastCalculatedAt.getTime();
  const elapsedHours = elapsedMs / 1000 / 60 / 60;
  return Math.floor(productionPerHour * elapsedHours);
}
```

---

## 9.4 Why Lazy Calculation Is Better

Lazy calculation avoids:

- Updating thousands of cities every second
- Heavy background processing
- Unnecessary database writes
- Scaling problems early

It also supports offline progression naturally.

---

## 9.5 When to Use Jobs Instead

Use background jobs for discrete events:

- Building completed
- Research completed
- Trade arrived
- Army arrived
- Battle resolved
- Event started
- Event ended

---

# 10. Timer Architecture

---

## 10.1 Timer Types

The game has many long-running timers:

- Building upgrade timer
- Research timer
- Unit training timer
- Ship training timer
- Trade movement timer
- Army movement timer
- Colonization timer
- Event timer
- Vacation mode timer
- Beginner protection timer

---

## 10.2 Timer Storage

Every timer should be stored in the database.

Example:

```md id="timer-data"
upgrade_started_at
upgrade_finishes_at
status
```

The job queue improves responsiveness, but the database remains the source of truth.

---

## 10.3 Timer Completion Strategy

Use a hybrid strategy:

### Database State

Stores the real completion time.

### Job Queue

Triggers processing near the completion time.

### Fallback Scanner

Periodically checks for missed completed timers.

This protects the game if the job queue fails or restarts.

---

## 10.4 Idempotent Completion

Every completion job must check:

- Does the entity still exist?
- Is the status still active?
- Is the completion time reached?
- Was it already completed?

Example:

```ts id="idempotent-building-completion"
async function completeBuildingUpgrade(buildingId: string) {
  await db.transaction(async (tx) => {
    const building = await tx.cityBuilding.findForUpdate(buildingId);

    if (!building) return;
    if (building.status !== "upgrading") return;
    if (building.upgradeFinishesAt > new Date()) return;

    await tx.cityBuilding.update(buildingId, {
      level: building.level + 1,
      status: "idle",
      upgradeStartedAt: null,
      upgradeFinishesAt: null,
    });

    await tx.report.create({
      type: "building_completed",
      cityId: building.cityId,
      payload: {
        buildingType: building.buildingType,
        newLevel: building.level + 1,
      },
    });
  });
}
```

---

# 11. API Architecture

---

## 11.1 API Style

Recommended:

- REST API for most actions
- WebSocket for realtime events
- Internal worker events for background processing

REST is easier to debug, document, test, and secure for the first versions.

---

## 11.2 API Structure

```md id="api-structure"
api/
auth/
players/
worlds/
cities/
buildings/
resources/
research/
map/
movement/
pve/
combat/
trade/
alliances/
messages/
notifications/
admin/
```

---

## 11.3 Example API Endpoints

### Auth

```http id="auth-endpoints"
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/password-reset
GET  /api/auth/me
```

---

### City

```http id="city-endpoints"
GET  /api/cities
GET  /api/cities/:cityId
POST /api/cities/:cityId/rename
GET  /api/cities/:cityId/overview
```

---

### Buildings

```http id="building-endpoints"
GET  /api/cities/:cityId/buildings
POST /api/cities/:cityId/buildings/:buildingType/upgrade
POST /api/cities/:cityId/buildings/:buildingType/cancel
```

---

### Resources

```http id="resource-endpoints"
GET  /api/cities/:cityId/resources
GET  /api/cities/:cityId/production
POST /api/cities/:cityId/workers/assign
```

---

### Research

```http id="research-endpoints"
GET  /api/research
POST /api/research/:technologyId/start
```

---

### Map

```http id="map-endpoints"
GET /api/worlds/:worldId/map
GET /api/islands/:islandId
GET /api/map/search
```

---

### Movement

```http id="movement-endpoints"
GET  /api/movements
POST /api/movements/transport
POST /api/movements/colonize
POST /api/movements/attack-pve
POST /api/movements/attack-player
POST /api/movements/:movementId/recall
```

---

### Trade

```http id="trade-endpoints"
GET  /api/trade/offers
POST /api/trade/offers
POST /api/trade/offers/:offerId/accept
POST /api/trade/offers/:offerId/cancel
```

---

### Alliance

```http id="alliance-endpoints"
GET  /api/alliances
POST /api/alliances
GET  /api/alliances/:allianceId
POST /api/alliances/:allianceId/apply
POST /api/alliances/:allianceId/invite
POST /api/alliances/:allianceId/leave
```

---

## 11.4 API Validation

Every API action must validate:

- Authentication
- Authorization
- Ownership
- World membership
- City ownership
- Resource availability
- Action cooldown
- Queue availability
- Protection rules
- Anti-abuse rules
- Request idempotency

---

# 12. Frontend Architecture

---

## 12.1 Frontend Folder Structure

```md id="frontend-structure"
src/
app/
router/
providers/
layout/
features/
auth/
city/
buildings/
resources/
research/
map/
transport/
pve/
combat/
trade/
alliance/
messages/
notifications/
admin/
components/
ui/
game/
layout/
hooks/
services/
api/
websocket/
stores/
types/
utils/
assets/
```

---

## 12.2 Frontend Responsibilities

The frontend handles:

- Rendering game state
- Calling APIs
- Showing timers
- Showing optimistic UI carefully
- Listening to realtime events
- Showing notifications
- Displaying reports
- Managing local UI state

The frontend does not decide:

- Whether a player can afford an upgrade
- Whether a battle is won
- Whether a trade is valid
- Whether resources are available
- Whether a timer is complete

Those are backend responsibilities.

---

## 12.3 Frontend State Types

### Server State

Use TanStack Query or equivalent.

Examples:

- Cities
- Buildings
- Resources
- Research
- Movements
- Messages
- Reports

### UI State

Use Zustand or equivalent.

Examples:

- Selected city
- Open modal
- Current map position
- Active tab
- Sidebar state
- Notification panel state

### Realtime State

Updated through WebSocket events.

Examples:

- New message
- Timer completed
- Incoming attack
- Trade arrived

---

## 12.4 Timer Display

Frontend timers should be visual only.

Example:

```ts id="frontend-timer"
const remainingMs = new Date(finishTime).getTime() - Date.now();
```

When timer reaches zero:

1. Show “completing”
2. Ask backend for fresh state
3. Do not locally upgrade building without backend confirmation

---

# 13. Backend Architecture

---

## 13.1 Backend Folder Structure

```md id="backend-structure"
src/
main.ts
app.module.ts

modules/
auth/
players/
worlds/
cities/
buildings/
resources/
research/
map/
movements/
pve/
combat/
trade/
alliances/
messages/
notifications/
admin/
analytics/

common/
guards/
decorators/
filters/
interceptors/
validators/
errors/
utils/

database/
migrations/
seeds/
repositories/

jobs/
queues/
processors/
schedulers/

realtime/
gateways/
events/

config/
```

---

## 13.2 Backend Layers

Each module should have:

- Controller
- Service
- Repository
- DTOs
- Domain logic
- Tests

Example:

```md id="module-layers"
buildings/
buildings.controller.ts
buildings.service.ts
buildings.repository.ts
buildings.rules.ts
buildings.dto.ts
buildings.types.ts
buildings.spec.ts
```

---

## 13.3 Domain Rules

Keep game rules outside controllers.

Bad:

```ts id="bad-controller-rule"
@Post('/upgrade')
upgrade() {
  // calculate cost here
  // check resources here
  // update building here
}
```

Good:

```ts id="good-service-rule"
@Post('/upgrade')
upgrade() {
  return this.buildingService.startUpgrade(command);
}
```

The service should call domain rules:

```ts id="domain-rules"
BuildingRules.canUpgrade(...)
BuildingRules.calculateCost(...)
BuildingRules.calculateDuration(...)
```

---

# 14. Game Engine Architecture

---

## 14.1 Game Engine Responsibilities

The game engine contains pure gameplay logic.

It should calculate:

- Building costs
- Building durations
- Production rates
- Storage capacity
- Research requirements
- Travel times
- Battle outcomes
- Loot amounts
- Happiness effects
- Population growth
- Corruption penalties
- Alliance bonuses

---

## 14.2 Game Engine Design

Create a separate package:

```md id="game-engine-package"
packages/
game-engine/
buildings/
resources/
research/
population/
movement/
combat/
trade/
alliance/
balance/
```

This allows:

- Shared logic between API and simulations
- Unit testing
- Balance testing
- Future admin simulators
- Future battle simulator

---

## 14.3 Pure Functions

Game formulas should be pure functions when possible.

Example:

```ts id="building-cost-formula"
function calculateBuildingCost(
  buildingType: BuildingType,
  level: number,
  worldSpeed: number,
): ResourceCost {
  const baseCost = BUILDING_DEFINITIONS[buildingType].baseCost;
  const multiplier = Math.pow(1.6, level - 1);

  return {
    wood: Math.floor(baseCost.wood * multiplier),
    marble: Math.floor(baseCost.marble * multiplier),
  };
}
```

---

## 14.4 Balance Config

Do not hardcode all values in logic.

Use configuration files:

```md id="balance-config"
balance/
buildings.json
resources.json
research.json
units.json
ships.json
pve.json
combat.json
world.json
```

Benefits:

- Easier balancing
- Easier testing
- Easier admin tools later
- No need to rewrite logic for every adjustment

---

# 15. Resource Architecture

---

## 15.1 Resource Types

Initial resources:

- Wood
- Gold
- Marble
- Wine
- Crystal
- Sulfur

---

## 15.2 Resource State

Each city owns its resource balance.

```md id="resource-state"
city_id
wood
gold
marble
wine
crystal
sulfur
last_calculated_at
```

---

## 15.3 Production Calculation

Production depends on:

- Workers
- Building levels
- Island resource
- Research bonuses
- Event bonuses
- Alliance bonuses
- Premium bonuses, limited
- Happiness
- Corruption

---

## 15.4 Resource Spending

All spending must be transactional.

Example: starting building upgrade.

```md id="spending-transaction"
BEGIN TRANSACTION

1. Lock city_resources row
2. Recalculate resources
3. Validate balance
4. Deduct cost
5. Insert resource transaction logs
6. Create building upgrade timer
7. Commit

END TRANSACTION
```

---

## 15.5 Resource Transaction Types

```md id="resource-transaction-types"
production
building_cost
research_cost
unit_training_cost
transport_sent
transport_received
trade_sent
trade_received
loot_lost
loot_gained
quest_reward
event_reward
admin_adjustment
premium_purchase
```

---

# 16. Building Architecture

---

## 16.1 Building Definitions

Each building has:

- Type
- Name
- Description
- Max level
- Base cost
- Cost multiplier
- Base duration
- Duration multiplier
- Requirements
- Effects per level

Example:

```json id="building-definition-example"
{
  "type": "warehouse",
  "name": "Warehouse",
  "maxLevel": 40,
  "baseCost": {
    "wood": 80,
    "marble": 20
  },
  "baseDurationSeconds": 120,
  "costMultiplier": 1.55,
  "durationMultiplier": 1.35,
  "effects": {
    "storageCapacityPerLevel": 1000,
    "protectedResourcesPerLevel": 100
  }
}
```

---

## 16.2 Building Upgrade Flow

```md id="building-upgrade-flow"
Player clicks upgrade
|
Frontend sends request
|
Backend validates ownership
|
Backend recalculates resources
|
Backend validates requirements
|
Backend deducts resources
|
Backend sets building status to upgrading
|
Backend creates delayed job
|
Frontend shows timer
|
Worker completes upgrade
|
Backend creates report
|
WebSocket notifies player
```

---

# 17. Research Architecture

---

## 17.1 Research Definitions

Each technology has:

- ID
- Name
- Branch
- Description
- Cost
- Duration
- Requirements
- Unlocks
- Effects

Example:

```json id="research-definition-example"
{
  "id": "basic_navigation",
  "name": "Basic Navigation",
  "branch": "navigation",
  "cost": {
    "researchPoints": 100
  },
  "durationSeconds": 1800,
  "requirements": [],
  "unlocks": ["trade_ships", "colonization_prerequisite"],
  "effects": {
    "shipSpeedBonus": 0.05
  }
}
```

---

## 17.2 Research Flow

```md id="research-flow"
Player starts research
|
Backend validates requirements
|
Backend assigns research job
|
Research timer starts
|
Worker completes research
|
Technology becomes unlocked
|
Player receives report
|
New features become available
```

---

# 18. Movement Architecture

---

## 18.1 Movement Types

- Transport
- Colonization
- PvE attack
- PvP attack
- Reinforcement
- Return
- Trade delivery
- Spy mission
- Naval blockade

---

## 18.2 Movement Lifecycle

```md id="movement-lifecycle"
created
scheduled
in_transit
arrived
resolved
returning
completed
cancelled
failed
```

---

## 18.3 Movement Flow

```md id="movement-flow"
Player sends movement
|
Backend validates action
|
Backend calculates travel time
|
Backend reserves units/ships/resources
|
Movement is created
|
Arrival job is scheduled
|
Worker processes arrival
|
Result is applied
|
Report is generated
|
Return movement is created if needed
```

---

## 18.4 Movement Rules

- Movement must belong to a world
- Origin and destination must be valid
- Player must own origin city
- Resources/units must be available
- Ships must have enough capacity
- Travel time depends on distance and speed
- Movement arrival must be idempotent
- Movement state must be auditable

---

# 19. Combat Architecture

---

## 19.1 Combat Design Goal

Combat should be strategic but not destructive.

Players should be able to lose battles without losing months of progress.

---

## 19.2 Combat Inputs

Battle calculation uses:

- Attacker units
- Defender units
- Wall level
- Unit stats
- Research bonuses
- Morale
- Terrain or island bonuses, optional
- Alliance bonuses, optional
- Randomness, limited
- PvE camp level, if PvE

---

## 19.3 Combat Output

Battle produces:

- Winner
- Loser
- Casualties
- Surviving units
- Loot amount
- Morale change
- Battle report
- Return movement

---

## 19.4 Combat Flow

```md id="combat-flow"
Army arrives
|
Worker loads attacker and defender state
|
Backend locks relevant rows
|
Combat engine calculates result
|
Casualties are applied
|
Loot is calculated
|
Resources are transferred or reserved
|
Battle report is created
|
Notifications are sent
|
Surviving army returns
```

---

## 19.5 Combat Formula Strategy

Start simple.

Recommended MVP formula:

```md id="simple-combat-formula"
attackerPower = sum(unit.attack _ quantity) _ attackerBonuses
defenderPower = sum(unit.defense _ quantity) _ defenderBonuses + wallBonus

winner = higher total power

casualties are proportional to enemy power
loot is capped by warehouse protection
```

Later, improve with:

- Rounds
- Front line
- Ranged line
- Siege
- Morale
- Naval formations
- Support units

---

# 20. Trade Architecture

---

## 20.1 Trade Types

- Internal city transport
- Direct player transport
- Marketplace offer
- Alliance trade
- Event trade

---

## 20.2 Marketplace Flow

```md id="marketplace-flow"
Player creates offer
|
Backend validates resources
|
Resources are reserved
|
Offer appears in marketplace
|
Another player accepts
|
Backend validates ships and distance
|
Trade movement is created
|
Resources arrive after travel time
|
Trade report is generated
```

---

## 20.3 Anti-Abuse Trade Checks

The system should flag:

- Very unfair exchange rates
- Repeated one-way trades
- New accounts feeding old accounts
- Same IP accounts trading heavily
- Marketplace trades designed to bypass limits

---

# 21. Alliance Architecture

---

## 21.1 Alliance Core Features

- Alliance creation
- Member management
- Roles
- Permissions
- Applications
- Chat
- Announcements
- Shared reports
- Donations
- Projects
- Rankings

---

## 21.2 Permissions Model

Use role-based permissions.

Example permissions:

```md id="alliance-permissions"
manage_members
manage_roles
send_announcement
edit_profile
accept_applications
kick_members
manage_diplomacy
start_project
view_reports
declare_war
sign_peace
```

---

## 21.3 Alliance Project Flow

```md id="alliance-project-flow"
Leader starts alliance project
|
Members donate resources
|
Donation transactions are logged
|
Project progress increases
|
Project completes
|
Alliance bonus activates
|
Members receive report
```

---

# 22. Notification Architecture

---

## 22.1 Notification Types

- Building completed
- Research completed
- Trade arrived
- Army arrived
- Battle report
- Incoming attack
- Message received
- Alliance announcement
- Event started
- Event ending
- Warehouse full

---

## 22.2 Notification Channels

- In-game
- WebSocket
- Email
- Browser push later

---

## 22.3 Notification Flow

```md id="notification-flow"
Game event occurs
|
Notification service creates notification
|
Notification saved in database
|
WebSocket event sent if player online
|
Email/push job created if enabled
|
Player sees notification
```

---

# 23. Analytics Architecture

---

## 23.1 Analytics Events

Track important actions:

```md id="analytics-events"
user_registered
world_joined
tutorial_started
tutorial_completed
city_created
building_upgrade_started
building_upgrade_completed
research_started
research_completed
transport_sent
trade_offer_created
trade_completed
alliance_joined
pve_attack_sent
pve_battle_completed
pvp_attack_sent
pvp_battle_completed
premium_purchase_completed
```

---

## 23.2 Analytics Storage

Early stage:

- Store analytics events in PostgreSQL

Later:

- Move high-volume analytics to dedicated event storage
- Use ClickHouse, BigQuery, or similar analytics database
- Keep aggregated metrics in PostgreSQL for admin dashboard

---

## 23.3 Important Dashboards

- Registration funnel
- Tutorial funnel
- D1/D7/D30 retention
- Resource economy
- Building progression
- Research progression
- Trade volume
- Alliance activity
- PvP impact
- Monetization
- Anti-cheat flags

---

# 24. Security Architecture

---

## 24.1 Security Principles

- Never trust client data
- Validate every action server-side
- Use transactions for economy changes
- Log sensitive actions
- Rate-limit critical endpoints
- Protect admin routes
- Store passwords securely
- Sanitize user-generated content
- Prevent multi-account abuse
- Use HTTPS everywhere

---

## 24.2 Authorization Rules

Every request must verify:

- User is authenticated
- Player belongs to requested world
- City belongs to player
- Alliance permission exists
- Admin permission exists, if admin action
- Action is allowed by game state

---

## 24.3 Rate Limiting

Rate-limit:

- Login
- Registration
- Password reset
- Messaging
- Marketplace creation
- Worker assignment
- Map search
- Combat commands
- Admin actions

---

## 24.4 Admin Security

Admin dashboard needs:

- Separate admin roles
- Strong authentication
- Audit logs
- IP allowlist, optional
- Two-factor authentication, recommended
- No direct database editing from UI
- All admin changes logged

---

# 25. Anti-Cheat Architecture

---

## 25.1 Anti-Cheat Goals

Prevent:

- Bot automation
- Multi-accounting
- Resource pushing
- Marketplace abuse
- Repeated bullying attacks
- Scripted gameplay
- Payment fraud

---

## 25.2 Anti-Cheat Signals

Collect:

- IP address hash
- Device/browser fingerprint hash
- Login frequency
- Action frequency
- Trade patterns
- Attack patterns
- Resource transfer patterns
- Session duration
- Repeated identical actions
- Marketplace price anomalies

---

## 25.3 Risk Scoring

Each suspicious behavior increases a risk score.

Example:

```md id="risk-score-example"
same_ip_trade = +20
unfair_trade_ratio = +30
new_account_sending_many_resources = +40
high_frequency_actions = +25
repeated_attacks_on_same_target = +15
```

Admin reviews accounts above a threshold.

---

# 26. DevOps Architecture

---

## 26.1 Local Development

Use Docker Compose:

```md id="local-docker-services"
frontend
backend-api
worker
postgres
redis
minio
mailhog
nginx
```

---

## 26.2 Environments

Use separate environments:

- Local
- Development
- Staging
- Beta
- Production

---

## 26.3 CI/CD Pipeline

Pipeline steps:

- Install dependencies
- Type check
- Lint
- Unit tests
- Backend tests
- Frontend build
- Migration validation
- Docker build
- Security scan
- Deploy to staging
- Run smoke tests
- Manual approval for production
- Deploy production

---

## 26.4 Deployment Architecture

Early production:

```md id="early-production-deployment"
[ VPS / Cloud Instance ]

- Nginx
- Frontend container
- API container
- Worker container
- PostgreSQL
- Redis
- MinIO or S3
```

Later production:

```md id="later-production-deployment"
[ Load Balancer ]
|
[ API Containers ] ---- [ Redis ]
|
[ Worker Containers ]
|
[ Managed PostgreSQL ]
|
[ Object Storage / CDN ]
```

---

# 27. Observability

---

## 27.1 Logs

Log:

- API errors
- Worker errors
- Payment events
- Admin actions
- Suspicious activity
- Failed jobs
- Timer delays
- Long database queries

---

## 27.2 Metrics

Track:

- API response time
- Error rate
- Active players
- Online players
- Job queue size
- Job failure rate
- Worker processing time
- Database CPU
- Redis memory
- WebSocket connections
- Resource production totals
- Battle count
- Trade count

---

## 27.3 Alerts

Create alerts for:

- API down
- Worker down
- Job queue stuck
- High error rate
- Database connection exhaustion
- Redis memory high
- Payment webhook failure
- Unusual resource creation
- High failed login rate

---

# 28. Scaling Plan

---

## 28.1 Stage 1 — Prototype

One server:

- Frontend
- API
- Worker
- PostgreSQL
- Redis

Good for:

- Development
- Internal testing
- Solo prototype

---

## 28.2 Stage 2 — Alpha

Separate containers:

- Frontend
- API
- Worker
- PostgreSQL
- Redis

Good for:

- Small multiplayer tests
- Dozens to hundreds of players

---

## 28.3 Stage 3 — Beta

Separate services:

- Multiple API instances
- Multiple workers
- Separate database
- Separate Redis
- CDN
- Monitoring

Good for:

- Thousands of users
- Real multiplayer testing

---

## 28.4 Stage 4 — Public Launch

Production-grade:

- Load balancer
- Horizontal API scaling
- Horizontal worker scaling
- Managed PostgreSQL
- Redis cluster or managed Redis
- CDN
- Backups
- Monitoring
- Alerting
- Admin tools
- Incident process

---

## 28.5 Stage 5 — Large Scale

Possible future architecture:

- Separate Game API
- Separate Realtime Gateway
- Separate Combat Service
- Separate Trade Service
- Separate Analytics Pipeline
- Partitioned database by world
- Read replicas
- Dedicated admin database views
- Dedicated analytics database

---

# 29. Backup and Recovery

---

## 29.1 Backup Strategy

Back up:

- PostgreSQL
- Object storage
- Balance config
- Environment config
- Deployment config

Backup frequency:

- Daily full backup
- Hourly incremental backup for production
- Before major migrations
- Before major balance changes

---

## 29.2 Recovery Requirements

The team should be able to:

- Restore database
- Restore specific world
- Restore specific player state, if possible
- Roll back deployment
- Re-run failed jobs safely
- Replay missed timer completions
- Audit resource loss

---

# 30. Game Configuration Architecture

---

## 30.1 Config Types

Use configuration for:

- Building costs
- Building times
- Research costs
- Research times
- Unit stats
- Unit costs
- Resource rates
- World speed
- Event bonuses
- Premium limits

---

## 30.2 Config Storage

Early:

- JSON files versioned in Git

Later:

- Admin-editable configuration
- Versioned balance configs
- Config approval workflow
- Config rollback

---

## 30.3 Config Safety

Every config change should have:

- Version number
- Author
- Approval
- Effective date
- Rollback option
- Simulation before activation

---

# 31. Testing Architecture

---

## 31.1 Test Types

Required tests:

- Unit tests
- Integration tests
- API tests
- Worker tests
- Game formula tests
- Economy tests
- Combat simulation tests
- Security tests
- Load tests
- Regression tests

---

## 31.2 Critical Test Areas

Test heavily:

- Resource spending
- Resource production
- Building completion
- Research completion
- Movement arrival
- Battle resolution
- Trade completion
- Marketplace validation
- Alliance permissions
- Admin actions
- Payment callbacks

---

## 31.3 Simulation Tests

Create automated simulations for:

- First 24 hours
- First 7 days
- First 30 days
- Resource inflation
- PvE rewards
- PvP loot
- Marketplace economy
- Alliance donations

---

# 32. Recommended Development Order

---

## 32.1 Technical Order

Build in this order:

1. Project setup
2. Database schema
3. Auth placeholder
4. Player and city creation
5. Resource system
6. Building system
7. Timer/job system
8. Research system
9. Tutorial
10. Map
11. Colonization
12. Transport
13. PvE
14. Accounts
15. Multiplayer world
16. Messaging
17. Marketplace
18. Alliances
19. Scouting
20. PvP
21. Admin dashboard
22. Anti-cheat
23. Notifications
24. Events
25. Monetization
26. Production readiness

---

# 33. Recommended First Technical MVP

## Version 0.1

Must include:

- React frontend
- TypeScript backend
- PostgreSQL
- Redis
- One worker service
- One player
- One city
- Resource production
- Building upgrades
- Timers
- Offline calculation
- Basic research
- Basic tutorial

Do not include yet:

- WebSocket
- Multiplayer
- PvP
- Marketplace
- Alliances
- Payments

---

# 34. Recommended Folder Structure

```md id="monorepo-structure"
game-project/
apps/
web/
api/
worker/
admin/

packages/
game-engine/
shared-types/
ui/
config/

infrastructure/
docker/
nginx/
migrations/
scripts/

docs/
product/
architecture/
api/
balance/
operations/

tests/
simulations/
load/
e2e/
```

---

# 35. AI Agent Architecture for Development

---

## 35.1 Product Owner Agent

Responsibilities:

- Sprint planning
- Acceptance criteria
- Backlog refinement
- Priority decisions
- MVP protection
- Scope control

---

## 35.2 Game Architect Agent

Responsibilities:

- Overall architecture
- Module boundaries
- Data flow
- Scaling strategy
- Service split decisions
- Technical risks

---

## 35.3 Backend Agent

Responsibilities:

- API implementation
- Business logic
- Database transactions
- Worker jobs
- Security validation

---

## 35.4 Frontend Agent

Responsibilities:

- React screens
- UI state
- API integration
- Timer display
- Responsive design

---

## 35.5 Game Economy Agent

Responsibilities:

- Production rates
- Upgrade costs
- Research costs
- Resource sinks
- Inflation prevention

---

## 35.6 Combat Agent

Responsibilities:

- Unit stats
- Battle formula
- PvE balance
- PvP protection
- Battle reports

---

## 35.7 QA Agent

Responsibilities:

- Test cases
- Regression tests
- Gameplay validation
- Bug reproduction
- Acceptance testing

---

## 35.8 DevOps Agent

Responsibilities:

- Docker
- CI/CD
- Monitoring
- Backups
- Deployment
- Scaling

---

## 35.9 Security and Anti-Abuse Agent

Responsibilities:

- Authentication security
- Authorization
- Rate limiting
- Anti-cheat signals
- Abuse detection
- Admin audit logs

---

# 36. Key Architecture Rules

---

## 36.1 Rule 1 — Backend Is Always Authoritative

The frontend displays state.

The backend decides state.

---

## 36.2 Rule 2 — Every Economy Change Is Logged

Every resource gain or loss must create a transaction record.

---

## 36.3 Rule 3 — Timers Must Survive Restarts

Timers must be stored in the database.

The queue is a helper, not the only source of truth.

---

## 36.4 Rule 4 — Jobs Must Be Idempotent

Running the same job twice must not duplicate rewards or upgrades.

---

## 36.5 Rule 5 — Start Modular, Not Distributed

Do not start with microservices.

Start with a clean modular monolith.

---

## 36.6 Rule 6 — World ID Everywhere

Most multiplayer data should include `world_id`.

---

## 36.7 Rule 7 — Configuration Must Be Versioned

Balance changes must be traceable and reversible.

---

## 36.8 Rule 8 — Admin Tools Are Core Product

Admin tools are not optional for a multiplayer game.

---

## 36.9 Rule 9 — Anti-Cheat Starts Early

Add logs and detection before public multiplayer.

---

## 36.10 Rule 10 — Scale Only After Measuring

Do not add complex infrastructure before the product proves retention.

---

# 37. Final Recommended Architecture

The recommended architecture is:

```md id="final-recommended-architecture"
Frontend:
React + TypeScript + Vite

Backend:
Node.js + TypeScript + NestJS/Fastify

Database:
PostgreSQL

Cache / Queue:
Redis + BullMQ

Realtime:
Socket.IO or WebSocket

Storage:
S3-compatible storage / MinIO

Infrastructure:
Docker first, managed cloud later

Architecture Style:
Modular monolith first, service-oriented later

Game State:
Database as source of truth

Timers:
Database timestamps + job queue + fallback scanner

Economy:
Transactional updates + resource ledger

Scaling:
World-based partitioning later
```

---

# 38. Final Architecture Summary

This project should be built like a serious long-term multiplayer system, but it should start small.

The first version should not try to be a full MMO.

The first version should prove:

> One player can log in, grow a city, wait for timers, spend resources, research technologies, and feel motivated to return.

The architecture should then grow step by step:

```md id="architecture-growth-path"
Solo City
↓
Solo Empire
↓
World Map
↓
PvE
↓
Multiplayer Visibility
↓
Trade
↓
Alliances
↓
PvP
↓
Live Events
↓
Monetization
↓
Public Launch
```

The most important technical decision is:

> Use a modular monolith with strong domain boundaries, reliable timers, transactional resource updates, and audit logs from the beginning.

This gives the project enough simplicity to start fast and enough structure to scale later.

---
