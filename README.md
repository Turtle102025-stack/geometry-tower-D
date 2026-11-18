# Geometry Tower D

A neon tower defense game where the enemies are geometric shapes — every hit knocks off a side.

**Play:** https://turtle102025-stack.github.io/geometry-tower-D/

- 12 towers with two 4-tier upgrade paths each, 4 tier-4 abilities
- Shapes from triangles to octagons, plus Armored, Ghost, Regrowing, Crystal, Shadow and Splitting types
- 5 Platonic-solid bosses ending with The Sphere
- 11 maps (5 from the start, 6 unlocked by achievements), Easy / Medium / Hard, freeplay and sandbox
- Everything drawn and synthesized in code: no image or audio files

**Controls:** click a tower in the shop, then the map to place it (tablet: tap, then ✔ PLACE).
Space = start round / fast-forward · P = pause · 1–0 = pick tower · `,` `.` = upgrade · T = targeting · Delete = sell.

## Run it on your own computer
1. Install [Node.js](https://nodejs.org) (version 22 or newer).
2. In a terminal, inside this folder:
   ```bash
   npm install
   ```
3. Start the game:
   ```bash
   npm run dev
   ```
4. Open the address it prints (usually http://localhost:5173).

## Other commands
- `npm test` — run the game-logic tests
- `npm run build` — make the production version in `dist/`
- `npm run sim` — headless balance simulator
- `npm run dps-table` — damage-per-cost table for every tower and upgrade

See `docs/BRIEF.md` for the design brief and `CLAUDE.md` for the project rules.
