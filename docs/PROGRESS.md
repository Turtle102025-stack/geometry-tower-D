# Build progress

How to try each phase. The easiest way is the live link:
**https://turtle102025-stack.github.io/geometry-tower-D/** (updates a minute or two after every push).
To run locally instead: `npm install`, then `npm run dev`, then open http://localhost:5173.

## Phase 2 — Setup
- Vite + TypeScript + PixiJS project, GitHub Actions deploy to GitHub Pages, brief and rules saved.
- **Test:** the link shows the game page.

## Phase 3 — Core loop
- Game engine: fixed 60 Hz simulation, shapes that lose one side per hit, splitting heptagons/octagons,
  money per side, lives lost by escaping shapes, round flow with 10 rounds, sandbox mode.
- One map (Gridline) and one tower (Pencil) with both upgrade paths.
- **Test:**
  1. Press **PLAY → Gridline → EASY**.
  2. Click the Pencil in the right-hand shop, move over the map (green circle = valid spot, red = invalid), click to place.
  3. Press **START ROUND**. Press it again during a round to cycle 1× / 2× / 3× speed.
  4. Click your tower to open the upgrade panel: buy upgrades, change targeting, sell.
  5. Main menu → **SANDBOX**: spawn any shape (pick a shape, modifiers, then SPAWN).
- `npm test` runs 37 logic tests (side stripping, splitting, immunities, upgrade rules, economy, rounds, determinism).

## Phase 4 — Towers
- Six towers, each with two 4-tier upgrade paths (one path can reach tier 4, the other tier 2):
  **Pencil** (basic), **Point Plotter** (rapid fire), **Compass** (360° burst), **Eraser Mortar** (explosive splash),
  **Ice Cube** (freeze), **Vector** (map-wide sniper). Every tier changes the tower's look; tier 4s glow.
- Tier-4 abilities: *The Great Rub-Out* (Eraser) and *Absolute Zero* (Ice Cube) appear as buttons at the bottom of the map.
- Targeting (First / Last / Strong / Close) and selling (80% refund) in the upgrade panel.
- **Test:** place each tower, click it, buy upgrades on both paths — once one path passes tier 2 the other shows
  "PATH CAPPED" after tier 2. Keyboard: `,` and `.` buy upgrades, `T` cycles targeting, `Delete` sells.
- `npm test`: 49 tests.

## Phase 5 — Shape types, first boss, 40 Easy rounds
- Special shapes, each readable at a glance: **Armored** (steel plates, immune to sharp), **Ghost** (dashed
  see-through outline, needs detection), **Regrowing** (pulsing glow), **Crystal** (icy white, immune to cold),
  **Shadow** (black, immune to explosions), **Splitting** (fracture lines; breaks into two smaller shapes).
- **Cube** boss: a rotating 3D solid that cracks as it takes damage and bursts into six octagons.
  (All five bosses already render; the rest arrive in later rounds.)
- 40 hand-designed rounds introduce one new type at a time; round 30 is the Cube's debut, round 40 the Cube convoy.
- First version of the headless simulator: `npm run sim -- --map gridline --difficulty easy`.
- **Test:** play Easy on Gridline; or in Sandbox pick a modifier (armor, ghost…) and spawn it, or press "Cube".
- `npm test`: 56 tests (bosses added).

## Phase 6 — Game feel & UI
- Shards fly off every broken side, bigger shatters on destroyed shapes, armor shells crack apart in steel
  shards, explosions ring out, and bosses detonate with a flash and screen shake.
- Sound effects synthesized live with the Web Audio API (no audio files), rate-limited so huge waves stay crisp.
- Speed: START ROUND button doubles as fast-forward (1× → 2× → 3×), pause button / `P`, AUTO-start toggle.
- Boss health bar, low-lives red warning glow, round and boss banners.
- Menus: main menu with floating shapes, map select with thumbnails and medals, difficulty picker,
  settings (volume, sound on/off, effects quality, screen shake, FPS), achievements, pause menu,
  victory / defeat screens with stats and XP.
- Saving: your profile (XP, medals, achievements, settings) and the game in progress (saved at the start
  of every round) live in the browser's localStorage. Pick the map again and press CONTINUE.
- Tablet: tap a tower, tap the map to preview, then ✔ PLACE.
- **Test:** play a few rounds, open ☰ → QUIT TO MENU, then PLAY → same map → CONTINUE.

## Phase 7 — Maps, Medium & Hard, freeplay, balance tools
- **11 maps**: 5 from the start (Gridline, Unit Circle, Parallel, Hypotenuse Lake, Monoliths — getting harder),
  6 unlocked by achievements (Tangent, Möbius, Koch Snowflake, Archipelago, Vanishing Point, Singularity).
  Two-lane maps, water/islands, blockers that cut line of sight, a self-crossing loop and a double spiral.
- **Rounds 41–80** for Medium (ends at 60 with the Dodecahedron) and Hard (ends at 80 with The Sphere).
- **Freeplay**: after a win, CONTINUE IN FREEPLAY plays the rest of the hand-made rounds and then endless
  generated rounds that keep getting harder (bosses get more HP after round 80).
- **Balance tools**: `npm run sim` and `npm run dps-table`; findings in `docs/BALANCE.md`.
- New-type tips: the first time a round brings a new shape type, a tip explains how to beat it.
- **Test:** PLAY → any of the first five maps → MEDIUM or HARD. Locked maps show what unlocks them.
- `npm test`: 90 tests (every map is checked for valid lanes, building room and shapes reaching the exit).
