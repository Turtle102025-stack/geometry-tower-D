# Geometry Tower D — rules for working in this repo

Browser tower defense game. Enemies are geometric shapes whose **sides are their layers**.
Full brief and planning decisions: `docs/BRIEF.md`. Read it before changing gameplay.

## Hard rules
- **Originality**: no names, art, sounds, tower designs or round sequences from Bloons or any other game.
  Genre mechanics are fine. All art is drawn in code (vector shapes); never add downloaded images or audio files.
- **Art style**: neon blueprint — glowing neon outlines on a dark navy grid. Keep every new visual in this style.
- **Audience**: teens who like tower defense. Not edutainment; no lessons/fact cards.
- **Sim/render separation**: `src/sim/` is pure game logic. It must never import from `src/render`, `src/ui`,
  `src/audio`, `pixi.js`, or touch the DOM / `window` / `Math.random` / `Date`. Randomness comes from the seeded RNG
  in `src/sim/rng.ts`. The sim talks to the outside world only through `game.events` and its public methods.
- **Fixed timestep**: the sim advances only via `Game.tick()` (60 ticks per game-second). Speed-up runs more ticks
  per frame; pause runs none. Never use real time inside the sim.
- **Data-driven content**: towers + upgrades (`src/data/towers/`), shapes and bosses (`src/data/shapes.ts`,
  `src/data/bosses.ts`), rounds (`src/data/rounds.ts`), maps (`src/data/maps/`), difficulty (`src/data/difficulty.ts`).
  Add content there, not as special cases in the engine.
- **Upgrade rule**: two paths × 4 tiers. Only one path may go above tier 2 (so 4/2, 2/4, 3/1 … are legal, 3/3 is not).
- **Performance**: must hold 60 fps with 1,000+ shapes and projectiles. Use the spatial grid (`src/sim/grid.ts`) for
  any "what is near X" query, avoid allocations in per-tick hot loops, reuse pooled objects, and render shapes as
  sprites from cached textures (`src/render/textures.ts`).
- **Saves** are versioned (`src/save/storage.ts`). If you change a saved structure, bump the version and migrate.

## Commands
- `npm run dev` — local dev server
- `npm test` — Vitest (sim logic tests live in `tests/`)
- `npm run typecheck` — TypeScript check
- `npm run build` — production build into `dist/`
- `npm run sim -- --help` — headless balance simulator
- `npm run dps-table` — damage-per-cost table for every tower/upgrade

## Workflow
- Push to `main`; GitHub Actions (`.github/workflows/deploy.yml`) tests, builds and deploys to GitHub Pages.
- Add/adjust Vitest tests whenever sim rules change. Run `npm test` and `npm run typecheck` before committing.
- After balance changes, run the simulator and dps table and note notable findings in `docs/BALANCE.md`.
