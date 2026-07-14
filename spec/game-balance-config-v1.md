# Game Balance Config V1

## Purpose

The V1 balance config defines the first playable economy for Sprint 0 and early Sprint 1 work.

The config is intentionally small, deterministic, and seed-ready. It should be treated as the source of truth for building costs, building durations, production rates, storage capacity, research costs, research durations, and core building effects.

## Files

| File | Purpose |
| --- | --- |
| `spec/config/balance/resources.json` | Resource definitions, starting amounts, base production, base capacity |
| `spec/config/balance/buildings.json` | Building definitions, levels, costs, durations, effects |
| `spec/config/balance/research.json` | Research definitions, prerequisites, costs, durations, effects |
| `spec/config/balance/world.json` | World speed, starter city, offline cap, queue limits |

## Resource Model

V1 resources:

- `wood`: Basic construction resource.
- `stone`: Basic construction resource.
- `food`: Growth and population resource.
- `gold`: Currency for advanced costs.
- `knowledge`: Research resource produced by Academy.

Starting resources are defined in `resources.json` and copied into `city_resources` when the default city is created.

## Production Formula

Backend production should use this flow:

1. Load elapsed seconds from `cities.last_production_at`.
2. Cap elapsed time by `world.offlineProductionCapHours`.
3. Calculate production per resource:

```text
produced = floor(totalProductionPerHour * elapsedSeconds / 3600)
```

4. Add to city resources.
5. Clamp each resource to its current storage capacity.
6. Update `cities.last_production_at`.

Production comes from:

- Resource base production in `resources.json`.
- Production building effects in `buildings.json`.
- Research multipliers in `research.json`.

## Storage Formula

For each city resource:

```text
storage_capacity = resource.baseStorageCapacity + warehouse.storageBonusByLevel[currentLevel]
protected_capacity = resource.baseProtectedCapacity + warehouse.protectedStorageBonusByLevel[currentLevel]
```

If `resource.type` is `currency` or `research`, it can use the resource base capacity without warehouse protection unless later specs change that rule.

## Duration Formula

Raw building and research durations are stored in config as seconds.

Effective building duration:

```text
effectiveSeconds = ceil(baseSeconds / world.speedMultiplier / cityHallConstructionSpeedMultiplier / researchConstructionSpeedMultiplier)
```

Effective research duration:

```text
effectiveSeconds = ceil(baseSeconds / world.speedMultiplier / academyResearchSpeedMultiplier)
```

Always enforce `world.timing.minimumJobDurationSeconds`.

## Building Effects

### City Hall

City Hall controls:

- Displayed city level.
- Population capacity.
- Small construction speed multiplier.

When a City Hall upgrade completes, backend logic must update `cities.level` to the completed City Hall level.

### Warehouse

Warehouse controls:

- Storage capacity for basic resources.
- Protected storage capacity for future combat/trade loss rules.

When a Warehouse upgrade completes, backend logic must recalculate capacities in `city_resources`.

### Academy

Academy controls:

- Knowledge production per hour.
- Research speed multiplier.
- Access to research prerequisites.

Academy can start at level 0, meaning it must be constructed before research begins.

## Balance Guardrails

- Early upgrades should complete in minutes, not hours.
- The player should be able to start at least one upgrade immediately.
- The player should see clear resource shortages after the first few upgrades.
- No V1 config should require multiplayer systems.
- Every cost resource must exist in `resources.json`.
- Every production resource must exist in `resources.json`.
- Every research prerequisite building must exist in `buildings.json`.
- Every research prerequisite research item must exist in `research.json`.

## Acceptance Alignment

This config supports:

- Default city creation.
- Visible resource bar.
- Visible building list.
- City name and level display.
- Backend-loaded game data.
- Timer-driven building and research actions.

