import { describe, it, expect } from 'vitest';
import { MAP_LIST } from '../src/data/maps';
import { TOWERS } from '../src/data/towers';
import { Game } from '../src/sim/game';
import { WORLD_W, WORLD_H } from '../src/sim/constants';
import { ACHIEVEMENT_BY_ID } from '../src/data/achievements';

describe('maps', () => {
  it('has 5 starting maps and 6 unlockable maps', () => {
    expect(MAP_LIST.filter((m) => !m.unlock)).toHaveLength(5);
    expect(MAP_LIST.filter((m) => m.unlock)).toHaveLength(6);
    for (const m of MAP_LIST) if (m.unlock) expect(ACHIEVEMENT_BY_ID[m.unlock]).toBeTruthy();
  });

  for (const map of MAP_LIST) {
    describe(map.name, () => {
      const g = new Game({ map, difficulty: 'medium', mode: 'sandbox', seed: 1 });

      it('paths are long enough and start at the edge of the screen', () => {
        for (const p of g.paths) {
          expect(p.length).toBeGreaterThan(1200);
          const x = p.xs[0];
          const y = p.ys[0];
          expect(x <= 0 || y <= 0 || x >= WORLD_W || y >= WORLD_H).toBe(true);
        }
      });

      it('has plenty of room to build', () => {
        let spots = 0;
        for (let x = 30; x < WORLD_W; x += 40) for (let y = 30; y < WORLD_H; y += 40) if (g.checkPlacement(TOWERS.pencil, x, y).ok) spots++;
        expect(spots).toBeGreaterThan(40);
      });

      it('shapes walk the whole path and escape', () => {
        const h = new Game({ map, difficulty: 'medium', seed: 1 });
        h.lives = 1e6;
        h.sandboxSpawn('oct', g.paths.length, 0.1);
        let leaked = 0;
        for (let i = 0; i < 60 * 60 && leaked < g.paths.length; i++) {
          h.step();
          for (let k = 0; k < h.events.length; k++) if (h.events.get(k).type === 5) leaked++;
          h.events.clear();
        }
        expect(leaked).toBe(g.paths.length);
      });
    });
  }
});
