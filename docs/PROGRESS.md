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
