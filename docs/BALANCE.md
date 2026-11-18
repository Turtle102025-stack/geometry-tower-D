# Balance notes

Tools:
- `npm run sim -- --map <id> --difficulty easy|medium|hard --layout tools/layouts/<file>.json [--quiet]`
  plays a scripted build order (towers auto-placed on the spot that covers the most lane, respecting line of sight)
  through every round and prints where lives were lost and which shapes leaked.
- `npm run dps-table [-- --md docs/BALANCE_TABLE.md]` measures every tower build on a test lane:
  sides broken per second against a dense octagon stream, and damage per second against an unkillable boss,
  each divided by the build's price. "Step gain" shows what the most recent upgrade added per $1k.

## Pass 1 (Phase 7) — findings and changes
| Finding | Change |
|---|---|
| Pencil Diamond Point and Rainbow Volley + Graphite Core were ~3× the median efficiency — too strong for the cheapest tower. | Diamond Point damage 6→5, pierce 45→30, cost 4300→4700. Rainbow Volley fires ×0.75 (was ×0.6), cost 3400→3700. |
| Vector top tier did less boss damage than a Point Cloud — backwards for a sniper. | Big Magnitude: 12 dmg, ×3 vs bosses, faster. Infinite Magnitude: 40 dmg, ×4 vs bosses, fires ×0.7. Base fires every 1.5 s (was 1.7). |
| Split Vector / Vector Field were poor value. | Split Vector cost 2450→1950 and pierce 3; Vector Field pierce 4, cost 6600→6100. |
| Compass early tiers were the weakest buys in the game; More Needles added nothing on straight lanes. | Base pierce 1→2, fires every 1.05 s; More Needles also adds travel. Perfect Circle re-hit 0.22→0.3 s, cost 3900→4300. |
| Cryo Burst (Ice 0/3) was the most efficient build per dollar. | Fires ×0.75 (was ×0.6), cost 1050→1150. |
| Industrial Eraser (Eraser 3/0) was very efficient for its price. | +1 damage (was +2) but +10 pierce, cost 1550→1700. Heavy Eraser now also throws a bit faster. |
| Coordinate Lock (Plotter 0/3) was a weak step. | Also +1 pierce. |
| Ghost waves caused almost all lost lives for the scripted layouts on Easy. | Fewer ghosts in rounds 22, 26, 29, 35, 39 and 49; first-appearance tips now tell the player which upgrades see ghosts. |

Remaining "weak step" flags are utility upgrades (range, ghost detection, armor piercing, abilities),
which the arena cannot score.

## Simulator results after pass 1 (6 MVP towers, `strong.json`)
| Map (tier) | Easy |
|---|---|
| Gridline (Beginner) | Won, 0 lives lost |
| Unit Circle (Beginner) | Won, 0 lost |
| Hypotenuse Lake (Intermediate) | Won, 5 lost |
| Koch Snowflake (Advanced) | Won, 0 lost |
| Archipelago (Expert) | Won, 25 lost |
| Singularity (Expert) | Won, 3 lost |
| Parallel (Intermediate) | Lost round 34 (two short lanes punish a one-lane build order) |
| Monoliths (Advanced) | Lost round 34 (blockers halve tower coverage) |
| Vanishing Point (Expert) | Won, 153 lost |

Medium with only the 6 MVP towers falls around round 49 to heavy ghost/boss waves; Medium and Hard are tuned
with the full 12-tower roster in Phase 8.
