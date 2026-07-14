# Progression Blockers Report

The debug endpoint `GET /api/debug/economy/progression-blockers` reports live blockers for the development player.

Tracked blockers:

| Blocker | Detection | Recommendation |
| --- | --- | --- |
| Research blocked | Academy below level 1 and low research points | Build Academy and assign scientists |
| PvE blocked | Barracks below level 1 | Build Barracks by Day 3 |
| No first army | Barracks exists but no Spearmen | Train 5-8 Spearmen |
| Palace not ready | Palace below level 1 and low wood/gold | Save for Day 5-6 Palace |
| Storage full | Resource near early Warehouse capacity | Spend or upgrade Warehouse |

Manual review:

- Not enough wood to upgrade Warehouse: expected only after aggressive unit training.
- Not enough gold to train units: acceptable if player overbuilds, but PvE rewards should recover it.
- Academy not built: clear blocker and should be surfaced by guide plus debug report.
- Barracks not built: PvE blocker, acceptable until Day 3.
- Palace too expensive: acceptable before Day 5, blocker if still present on Day 7.
