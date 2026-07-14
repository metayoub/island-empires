# Sprint 28 Process Simplification Audit

This audit tracks common beta workflows and the Sprint 28 simplification applied or planned.

| Workflow | Current steps | Pain points | New simplified flow | Pages/components changed |
| --- | --- | --- | --- | --- |
| First building upgrade | Open city, inspect building, upgrade | Detail state was easy to miss | Click building hotspot, review effect/cost/time, upgrade in panel | `CityViewPage`, `BuildingDetailPanel` |
| Assign workers | Navigate to overview, find worker panel | Leaves visual city context | Use city overview for full assignment; city panel keeps upgrade context clear | `CityDashboard`, city detail copy |
| Start research | Open research page from nav | Academy lacked a direct contextual cue | Click Academy and use the research shortcut | `BuildingDetailPanel`, `ResearchPage` |
| Create marketplace offer | Open marketplace from nav, create offer | Trading intent starts at Trading Post but required navigation | Click Trading Post, choose Create Offer shortcut | `TradingPostPanel`, `MarketplacePage` |
| Send resources | Open transport from nav, select origin | Too many page hops after inspecting Trading Post | Click Trading Post, choose Send Resources shortcut | `TradingPostPanel`, `TransportPage` |
| Join alliance | Open alliance page, browse/apply | Search and comparison were limited | Use advanced alliance search or alliance page | `AdvancedSearchPage`, `AlliancesPage` |
| Send message | Open messages | No city dependency | No change in Sprint 28 | `MessagesPage` |
| Train army | Open city, click Barracks | Existing panel was buried in details | Barracks detail keeps training inline | `BuildingDetailPanel` |
| Send PvE attack | Navigate to map/PvE target | Context switch required | Barracks panel keeps combat entry visible | `BuildingDetailPanel`, `WorldMapPage` |
| Send PvP attack | Navigate through island/city target | Targeting remains map-based | Search city/player first, then use map target flow | `AdvancedSearchPage`, `IslandPage` |
| Train ships | Open city, click Shipyard | Existing panel needed clearer access | Shipyard detail exposes ship training inline | `BuildingDetailPanel` |
| Send naval attack | Navigate to naval/map flow | Context switch required | Shipyard detail keeps naval entry visible | `BuildingDetailPanel` |
| Submit feedback | Open feedback affordance | Already available in beta shell | No change in Sprint 28 | `BetaFeedbackButton` |
| Claim event reward | Open events page | Discoverability depends on nav | Events remains a direct nav item | `LiveEventsPage` |
| Support project | Open Support Project | No city dependency | Keep donation/supporter flow separate from gameplay | `SupportProjectPage` |

## Sprint 28 Notes

- Rankings expose aggregate scores only and avoid private resource, unit, spy, or city-balance details.
- Overall rankings are computed from live component scores instead of stored score fields: city development, research, army strength, and a compressed economy score. Alliance overall also includes project completion and contribution progress.
- City rankings use a development score rather than raw city count: city level, population, happiness, weighted building levels, milestone thresholds, infrastructure category coverage, specialization depth, and a modest expansion bonus.
- Advanced search returns public DTOs only.
- Trading Post shortcuts reduce the need to return to city overview before marketplace and transport actions.
- City district labels and clearer hotspots make the visual layout easier to scan.
