# Building Costs

Sprint 11 uses the live `BUILDING_UPGRADE_CONFIG` formula:

`upgrade cost = floor(base cost * cost multiplier ^ current level)`

From current building level 10 onward, upgrades also add advanced material pressure on top of
the base wood/gold curve:

- Levels 10-19 add marble based on the current wood/gold upgrade value.
- Levels 20-29 add marble plus crystal and sulfur.
- Levels 30+ add marble, crystal, sulfur, and wine.

Costs below are for the upgrade from level 0 to level 1 unless noted. Early game balance should keep Warehouse, City Hall, Academy, Tavern, and Barracks reachable in Days 1-3 while making Palace a Day 5-6 goal.

| Building | Base cost | Multiplier | Early target |
| --- | ---: | ---: | --- |
| City Hall | 120 wood, 50 gold | 1.60 | Day 1 upgrade choice |
| Warehouse | 100 wood, 40 gold | 1.50 | Day 1 first safe upgrade |
| Academy | 150 wood, 80 gold | 1.70 | Day 1-2 research unlock |
| Tavern | 120 wood, 60 gold | 1.50 | Day 2 happiness support |
| Barracks | 150 wood, 60 gold | 1.60 | Day 3 military unlock |
| Port | 180 wood, 100 gold | 1.60 | Optional before transport sprint |
| Palace | 300 wood, 200 gold | 2.00 | Day 5-6 milestone |

First iteration notes:

- Starting resources of 500 wood and 300 gold allow two early civic upgrades without waiting.
- Academy plus scientists creates the first long-term planning decision.
- Palace is intentionally affordable only after early production upgrades or PvE rewards.
- Post-level-10 upgrades should require access to advanced resources, so a Warehouse level 11
  upgrade is no longer only wood/gold; it also requires marble.
