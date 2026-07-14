# Database Schema V1

## Purpose

This schema supports Sprint 0 and the first playable solo city prototype for Island Empires.

It is designed for PostgreSQL, a modular monolith backend, and later migration to multiplayer worlds without rewriting core data ownership.

## Scope

V1 covers:

- Accounts and players
- Worlds and islands
- Cities
- Player resources and storage
- Building levels and construction timers
- Research progress and timers
- Basic action queue integrity
- Audit timestamps

V1 does not cover:

- Combat
- Trade
- Alliances
- Payments
- Messaging
- Admin tools
- Analytics events

Those systems should be added in later schema versions.

## Naming Rules

- Use `snake_case` table and column names.
- Use UUID primary keys for player-owned entities.
- Use string IDs for static config references, such as `city_hall`, `wood`, or `basic_engineering`.
- Store canonical balance data in JSON config first, then seed database lookup tables if needed.
- Store all timestamps as `timestamptz`.
- Keep resource amounts as integers.

## Extensions

```sql
create extension if not exists "pgcrypto";
```

## Enum Types

```sql
create type construction_status as enum (
  'queued',
  'in_progress',
  'completed',
  'cancelled'
);

create type research_status as enum (
  'available',
  'in_progress',
  'completed',
  'locked'
);
```

## Tables

### users

Authentication identity. Sprint 0 can create placeholder users until full auth exists.

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text not null,
  password_hash text,
  is_guest boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### players

Game profile owned by a user.

```sql
create table players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  public_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
```

### worlds

World container for future multiplayer separation.

```sql
create table worlds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  speed_multiplier numeric(6, 2) not null default 1.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### islands

Map location container. V1 only needs one starter island.

```sql
create table islands (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references worlds(id) on delete cascade,
  name text not null,
  x integer not null,
  y integer not null,
  biome text not null default 'temperate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (world_id, x, y)
);
```

### cities

Player city. City level is derived from `city_hall` level but cached for fast display.

```sql
create table cities (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  world_id uuid not null references worlds(id) on delete cascade,
  island_id uuid references islands(id) on delete set null,
  name text not null,
  level integer not null default 1 check (level >= 1),
  population integer not null default 25 check (population >= 0),
  happiness integer not null default 50 check (happiness >= 0 and happiness <= 100),
  last_production_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index cities_player_id_idx on cities(player_id);
create index cities_world_id_idx on cities(world_id);
```

### city_resources

Current resource balances per city.

```sql
create table city_resources (
  city_id uuid not null references cities(id) on delete cascade,
  resource_id text not null,
  amount integer not null default 0 check (amount >= 0),
  storage_capacity integer not null default 0 check (storage_capacity >= 0),
  protected_capacity integer not null default 0 check (protected_capacity >= 0),
  updated_at timestamptz not null default now(),
  primary key (city_id, resource_id)
);
```

### city_buildings

Current building levels per city.

```sql
create table city_buildings (
  city_id uuid not null references cities(id) on delete cascade,
  building_id text not null,
  level integer not null default 0 check (level >= 0),
  updated_at timestamptz not null default now(),
  primary key (city_id, building_id)
);
```

### construction_jobs

One row per building upgrade timer.

V1 should enforce one active construction per city. Later research can unlock additional slots.

```sql
create table construction_jobs (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id) on delete cascade,
  building_id text not null,
  from_level integer not null check (from_level >= 0),
  to_level integer not null check (to_level > from_level),
  status construction_status not null default 'queued',
  cost jsonb not null,
  duration_seconds integer not null check (duration_seconds > 0),
  started_at timestamptz,
  completes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index construction_jobs_city_status_idx on construction_jobs(city_id, status);
create index construction_jobs_completes_at_idx on construction_jobs(completes_at)
  where status = 'in_progress';
```

### player_research

Completed and in-progress research state per player.

```sql
create table player_research (
  player_id uuid not null references players(id) on delete cascade,
  research_id text not null,
  status research_status not null default 'available',
  level integer not null default 0 check (level >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, research_id)
);
```

### research_jobs

One row per active research timer.

V1 should enforce one active research job per player.

```sql
create table research_jobs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  research_id text not null,
  from_level integer not null default 0 check (from_level >= 0),
  to_level integer not null check (to_level > from_level),
  status research_status not null default 'in_progress',
  cost jsonb not null,
  duration_seconds integer not null check (duration_seconds > 0),
  started_at timestamptz not null default now(),
  completes_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Indexes:

```sql
create index research_jobs_player_status_idx on research_jobs(player_id, status);
create index research_jobs_completes_at_idx on research_jobs(completes_at)
  where status = 'in_progress';
```

### game_events

Internal event log for idempotent worker processing.

```sql
create table game_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
```

Indexes:

```sql
create index game_events_unprocessed_idx on game_events(created_at)
  where processed_at is null;
create index game_events_aggregate_idx on game_events(aggregate_type, aggregate_id);
```

## Static Config References

The following columns reference IDs from balance JSON files:

| Column | Config file |
| --- | --- |
| `city_resources.resource_id` | `spec/config/balance/resources.json` |
| `city_buildings.building_id` | `spec/config/balance/buildings.json` |
| `construction_jobs.building_id` | `spec/config/balance/buildings.json` |
| `player_research.research_id` | `spec/config/balance/research.json` |
| `research_jobs.research_id` | `spec/config/balance/research.json` |

## V1 Seed Requirements

The seed system should create:

- One active world using `world.json`.
- One starter island.
- One guest user or development user.
- One player.
- One default city named `New Haven`.
- Starting resources from `resources.json`.
- Starting buildings from `buildings.json`.
- Available research rows from `research.json`.

## Integrity Rules

- Resource production must be calculated from `cities.last_production_at`.
- Resource amount must never exceed `storage_capacity`.
- Building upgrade start must subtract resources once.
- Construction completion must increment the building level once.
- Research start must subtract resources once.
- Research completion must increment research level once.
- Worker jobs must be idempotent using job status and event logging.
- City `level` must update when `city_hall` completes.

## Acceptance Alignment

This schema supports the Sprint 0 acceptance criteria:

- Player can access the game through a user/player record.
- A default city can be created.
- City name and level are stored.
- Resource bar data is available from `city_resources`.
- Buildings are available from `city_buildings`.
- Data can be loaded from backend APIs.

