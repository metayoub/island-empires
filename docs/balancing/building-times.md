# Building Times

Sprint 11 uses the live `BUILDING_UPGRADE_CONFIG` formula:

`upgrade seconds = floor(base duration * duration multiplier ^ current level / world speed)`

Current world speed is 1 in development.

| Building | Level 1 time | Multiplier | Early-game feel |
| --- | ---: | ---: | --- |
| Warehouse | 45s | 1.40 | Immediate feedback |
| City Hall | 60s | 1.50 | Short Day 1 action |
| Tavern | 75s | 1.40 | Short Day 2 action |
| Academy | 90s | 1.50 | Noticeable but not blocking |
| Barracks | 90s | 1.50 | Military unlock on Day 3 |
| Port | 120s | 1.50 | Secondary route |
| Palace | 180s | 1.80 | Major milestone |

First iteration notes:

- Current timers are intentionally short for development validation.
- For production launch, the same economy curve can support longer world-speed settings.
- Only one active construction per city creates the main early planning constraint.
