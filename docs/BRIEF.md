# Geometry Tower D — Project Brief

This is the original brief for the game, followed by the decisions made during
planning (Phase 1). Future work should follow both.

---

## What I want
A tower defense game that runs in the browser, in the style of Bloons TD 5, but the enemies are geometric shapes instead of balloons. Shapes travel along a path, I want 5 different levels and I place and upgrade towers to destroy them before they reach the end. It should feel fast, colorful and satisfying, with hundreds of shapes shattering on screen in later rounds.

## Originality
- Everything is original: no balloons, no monkeys, and no names, tower designs, art or sounds from Bloons or any other game. Genre mechanics (layered enemies, upgrade paths, hidden enemies, boss enemies) are fine to use.
- Art is drawn in code (vector shapes on canvas) in one clean, consistent style. No downloaded or copied images.

## The shapes (the heart of the game)
- Layers are sides: each hit knocks off one side. A hexagon becomes a pentagon, then a square, then a triangle, and then it shatters. Each rank has its own color, and shapes with more sides move faster. Ranks go up to octagons.
- Some shapes split: when destroyed, they break into 2 or more smaller shapes instead of one.
- Special types, each easy to recognize at a glance:
  - Armored (metallic): immune to sharp damage.
  - Ghost (dashed, see-through outline): only towers with detection can target them.
  - Regrowing (pulsing glow): grows sides back if not finished off.
  - Crystal (icy white): immune to freezing.
  - Shadow (black): immune to explosions.
- Bosses are 3D solids (cube, octahedron, dodecahedron, icosahedron). They rotate as they move, show cracks as they take damage, and burst into a swarm of smaller shapes when destroyed. Add one huge final boss.

## Towers
- About 12 towers covering these roles: basic single-target shooter, rapid fire, 360° burst, explosive splash, freeze/slow, long-range sniper, an energy beam that hurts armored shapes, detection/support (reveals ghosts in range), a tower that buffs nearby towers, an income generator, a water-only tower, and one expensive late-game tower.
- Stats: damage, pierce (how many shapes one shot can hit), attack speed, range, damage type (sharp, explosive, cold, energy) and whether it can see ghosts.
- Upgrades work like Bloons TD 5: two paths with 4 tiers each. One path can go up to tier 4, and the other only up to tier 2. Every upgrade visibly changes the tower, and tier 4 upgrades should feel dramatic.
- Each tower has a targeting priority: first, last, strongest or closest. Selling a tower refunds 80% (tunable).

## Rounds, economy and modes
- Money for every layer destroyed, plus a bonus at the end of each round. Escaping shapes cost lives, and stronger shapes cost more.
- Difficulties: Easy, Medium and Hard, with different round counts, tower prices and starting lives. Freeplay unlocks after winning.
- Rounds are hand-designed in a data file, introduce new shape types gradually, and include boss rounds at milestones. A generator creates the freeplay rounds.
- Sandbox mode: unlimited money and lives, and I can spawn any shape. (It's also my testing tool.)
- Maps get harder as you go. Some have two paths, water, or obstacles that block line of sight.
- Player XP unlocks towers and maps. Medals for beating each map on each difficulty.
- Save progress and games in progress to localStorage.

## Content targets
- MVP: 3 maps, 6 towers with full upgrade paths, Easy mode (40 rounds), the core shapes and special types, and 1 boss.
- Full version: ~12 towers, 8+ maps, all 3 difficulties and all bosses.

## Architecture
- TypeScript + Vite. Render the game on a canvas (use PixiJS if it helps performance); menus and panels in HTML/CSS.
- Keep game logic separate from rendering and run it on a fixed timestep, so 1x/2x/3x speed and pausing behave the same every time.
- It must hold 60 fps with 1,000+ shapes and projectiles on screen. Use a spatial grid for targeting and collisions, and object pooling.
- Data-driven content: towers, upgrades, shapes, rounds and maps live in data files. Map paths are defined as points and curves.
- Vitest tests for the game logic: side stripping, splitting, immunities, upgrade path rules, economy and round spawning.

## Balance tools
- A headless simulator that runs a scripted tower layout through every round and reports where lives are lost, plus a damage-per-cost table for every tower and upgrade. Use it to find upgrades that are overpowered or not worth buying.

## UI and game feel
- Tower shop sidebar with prices. When placing a tower, show its range circle, green if the spot is valid and red if not.
- Clicking a placed tower opens an upgrade panel with both paths, their costs and descriptions, the targeting priority, a sell button and stats such as how many shapes it has destroyed.
- Top bar showing round, lives and money. A big Start Round / fast-forward button, with an auto-start option.
- Satisfying feedback: shards fly off when a side breaks, a bigger shatter when a shape is destroyed, screen shake when a boss dies, and crisp sound effects made with the Web Audio API.
- Main menu, map select, settings (sound, effects quality), and win/lose screens with stats.
- Desktop first, but usable on a touch-screen tablet.

## Build plan
1. Plan.
2. Setup: git repo, GitHub Pages deploy via GitHub Actions, this brief and CLAUDE.md.
3. Core loop: one map, shapes following the path with the side system, one tower, money, lives, 10 rounds and sandbox mode. Tests.
4. Towers: 6 towers with both upgrade paths, targeting priorities and selling.
5. All shape types and the first boss; 40 Easy rounds.
6. Game feel and UI: shatter effects, sound, speed controls, menus, saving.
7. More maps, Medium and Hard, freeplay; the balance simulator and a balance pass.
8. The remaining towers and bosses, XP unlocks, medals, and polish.

---

# Decisions from planning (Phase 1)

| Topic | Decision |
|---|---|
| Repository | Public (required for free GitHub Pages). Work is pushed straight to `main`; every push deploys. |
| Phase flow | No sign-off needed between phases — finish a phase, commit, push, start the next. Give the playable link when the game is done. |
| Maps | **5 maps available from the start, plus 6 maps unlocked by in-game achievements** (11 total). |
| Art style | **Neon blueprint**: glowing neon outlines on a dark navy blueprint grid. One consistent style for shapes, towers, maps, effects and UI. |
| Audience | Teens who like tower defense. **Not** edutainment: no lessons or fact cards. Tone is punchy and game-like. |
| Abilities | Yes: about 4 tier-4 upgrades have click-to-activate abilities with cooldowns. |
| Final boss | **The Sphere** — "the shape with infinite sides". A huge faceted globe. |

## Shape rules
- Ranks: Triangle (3) red-pink, Square (4) orange, Pentagon (5) yellow, Hexagon (6) green, Heptagon (7) blue, Octagon (8) violet. More sides = faster.
- Hits to destroy = sides − 2 (a triangle shatters in one hit; a hexagon takes 4).
- Heptagons and octagons always split into 2 shapes of the rank below. The *Split* modifier (visible fracture lines) makes any shape split the same way.
- Ghost, Regrow, Crystal and Shadow stay with a shape as it loses sides and pass to split children. Armor is a shell: the first non-sharp hit cracks it off.
- An escaping shape costs lives equal to the hits it had left (including children).

## Towers (geometry-class theme)
Pencil, Point Plotter, Compass, Eraser Mortar, Ice Cube, Vector (MVP), then Laser Pointer, Projector, Chalkboard, Golden Ratio, Protractor Boat, Tesseract.

## Bosses
Cube → Octahedron → Dodecahedron → Icosahedron → The Sphere (final).

## Difficulties
| | Rounds | Lives | Prices |
|---|---|---|---|
| Easy | 40 | 200 | ×0.85 |
| Medium | 60 | 150 | ×1.0 |
| Hard | 80 | 100 | ×1.1 |
