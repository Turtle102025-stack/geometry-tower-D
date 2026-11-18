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
