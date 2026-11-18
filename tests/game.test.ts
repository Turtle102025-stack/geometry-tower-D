import { describe, it, expect } from 'vitest';
import { canUpgradePath, isLegalTiers } from '../src/sim/towerStats';
import { buildSpawnQueue, parseRound, getRound } from '../src/sim/rounds';
import { ROUNDS } from '../src/data/rounds';
import { findTargets } from '../src/sim/combat';
import { roundBonus, priceFor, DIFFICULTIES } from '../src/data/difficulty';
import { TOWER_LIST } from '../src/data/towers';
import { newGame, put, run, alive } from './helpers';
import { Game } from '../src/sim/game';
import { lineMap } from './helpers';
import { Path } from '../src/sim/path';

describe('upgrade path rules', () => {
  it('allows one path to tier 4 and the other only to tier 2', () => {
    expect(canUpgradePath(0, 0, 0)).toBe(true);
    expect(canUpgradePath(3, 2, 0)).toBe(true);
    expect(canUpgradePath(4, 2, 0)).toBe(false);
    expect(canUpgradePath(3, 2, 1)).toBe(false);
    expect(canUpgradePath(2, 2, 1)).toBe(true);
    expect(canUpgradePath(2, 3, 0)).toBe(false);
    expect(canUpgradePath(1, 3, 0)).toBe(true);
    expect(canUpgradePath(3, 1, 1)).toBe(true);
    expect(isLegalTiers(4, 2)).toBe(true);
    expect(isLegalTiers(3, 3)).toBe(false);
  });

  it('the game enforces the rule and charges for upgrades', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('pencil', 300, 300)!;
    expect(t).toBeTruthy();
    expect(g.upgrade(t, 0)).toBe(true);
    expect(g.upgrade(t, 0)).toBe(true);
    expect(g.upgrade(t, 0)).toBe(true);
    expect(g.upgrade(t, 1)).toBe(true);
    expect(g.upgrade(t, 1)).toBe(true);
    expect(g.upgrade(t, 1)).toBe(false); // path B capped at 2
    expect(g.upgrade(t, 0)).toBe(true);
    expect(g.upgrade(t, 0)).toBe(false); // max tier 4
    expect([t.tierA, t.tierB]).toEqual([4, 2]);
  });

  it('every tower has two paths of four upgrades with costs and descriptions', () => {
    for (const def of TOWER_LIST) {
      expect(def.paths).toHaveLength(2);
      for (const p of def.paths) {
        expect(p.upgrades).toHaveLength(4);
        for (const u of p.upgrades) {
          expect(u.cost).toBeGreaterThan(0);
          expect(u.desc.length).toBeGreaterThan(5);
        }
      }
    }
  });
});

describe('economy', () => {
  it('prices scale with difficulty', () => {
    expect(priceFor(200, DIFFICULTIES.easy)).toBe(170);
    expect(priceFor(200, DIFFICULTIES.medium)).toBe(200);
    expect(priceFor(200, DIFFICULTIES.hard)).toBe(220);
  });

  it('placing costs money and selling refunds 80%', () => {
    const g = newGame();
    const start = g.money;
    const t = g.placeTower('pencil', 300, 300)!;
    expect(g.money).toBe(start - 200);
    g.upgrade(t, 0);
    const spent = 200 + 120;
    expect(g.money).toBe(start - spent);
    g.sell(t);
    expect(g.money).toBe(start - spent + Math.floor(spent * 0.8));
    expect(g.towers).toHaveLength(0);
  });

  it('cannot place without enough money or on the path', () => {
    const g = newGame();
    g.money = 10;
    expect(g.placeTower('pencil', 300, 300)).toBeNull();
    g.money = 1000;
    expect(g.placeTower('pencil', 300, 360)).toBeNull(); // on the lane
    expect(g.placeTower('pencil', 100, 100)).toBeNull(); // water
    expect(g.placeTower('pencil', 300, 300)).toBeTruthy();
    expect(g.placeTower('pencil', 305, 300)).toBeNull(); // overlapping
  });

  it('pays the round bonus when a round is cleared', () => {
    const g = newGame();
    g.startRound();
    for (const s of g.shapes) s.alive = false;
    // drain spawns by destroying everything as it appears
    for (let i = 0; i < 60 * 60 && g.state === 'running'; i++) {
      g.step();
      for (const s of g.shapes) s.alive = false;
    }
    expect(g.state).toBe('idle');
    expect(g.completed).toBe(1);
    expect(g.money).toBe(650 + roundBonus(1));
  });

  it('escaping shapes cost lives equal to their remaining hits', () => {
    const g = newGame();
    put(g, 'hex', 1200);
    const lives = g.lives;
    run(g, 60);
    expect(g.lives).toBe(lives - 4);
  });

  it('sandbox mode never runs out of money or lives', () => {
    const g = newGame({ mode: 'sandbox' });
    const m = g.money;
    g.placeTower('pencil', 300, 300);
    expect(g.money).toBe(m);
    put(g, 'oct', 1250);
    run(g, 60);
    expect(g.lives).toBe(g.diff.lives);
  });
});

describe('rounds', () => {
  it('parses the round DSL', () => {
    const r = parseRound('20 tri 0.5 | 4 sq.ghost 1 +6 p1');
    expect(r.groups).toHaveLength(2);
    expect(r.groups[1]).toMatchObject({ count: 4, spec: 'sq.ghost', interval: 1, delay: 6, path: 1 });
    expect(() => parseRound('20 blob 0.5')).toThrow();
  });

  it('all hand-made rounds are valid', () => {
    for (const r of ROUNDS) expect(() => parseRound(r)).not.toThrow();
  });

  it('builds a time-sorted spawn queue', () => {
    const q = buildSpawnQueue(parseRound('3 tri 1 | 2 sq 0.5 +0.25'));
    expect(q.map((e) => e.spec)).toEqual(['tri', 'sq', 'sq', 'tri', 'tri']);
    expect(q.map((e) => e.time)).toEqual([0, 0.25, 0.75, 1, 2]);
  });

  it('spawns every shape of a round over time', () => {
    const g = newGame();
    g.startRound();
    const total = buildSpawnQueue(getRound(1)).length;
    let seen = 0;
    const ids = new Set<number>();
    for (let i = 0; i < 60 * 40; i++) {
      g.step();
      for (const s of g.shapes) if (!ids.has(s.id)) ids.add(s.id);
    }
    seen = ids.size;
    expect(seen).toBe(total);
  });

  it('generates freeplay rounds deterministically', () => {
    const a = getRound(120, 7);
    const b = getRound(120, 7);
    expect(a).toEqual(b);
    expect(a.groups.length).toBeGreaterThan(0);
  });
});

describe('targeting', () => {
  it('picks first / last / strongest / closest', () => {
    const g = newGame();
    const t = g.placeTower('pencil', 600, 300)!;
    const back = put(g, 'tri', 560);
    const front = put(g, 'tri', 700);
    const strong = put(g, 'hex', 640);
    const near = put(g, 'sq', 625);
    const pick = (mode: 'first' | 'last' | 'strong' | 'close') =>
      findTargets(g, t, { mode, count: 1, range: 300 })[0];
    expect(pick('first')).toBe(front);
    expect(pick('last')).toBe(back);
    expect(pick('strong')).toBe(strong);
    expect(pick('close')).toBe(near);
  });

  it('towers without detection cannot target ghosts', () => {
    const g = newGame();
    const t = g.placeTower('pencil', 600, 300)!;
    put(g, 'hex.ghost', 600);
    expect(findTargets(g, t, { mode: 'first', count: 1, range: 300 })).toHaveLength(0);
    t.stats.detect = true;
    expect(findTargets(g, t, { mode: 'first', count: 1, range: 300 })).toHaveLength(1);
  });
});

describe('simulation', () => {
  it('a pencil destroys shapes that walk past it', () => {
    const g = newGame();
    g.placeTower('pencil', 400, 320);
    put(g, 'tri', 100);
    run(g, 60 * 8);
    expect(alive(g)).toHaveLength(0);
    expect(g.stats.shapesDestroyed).toBe(1);
  });

  it('is deterministic: same seed and inputs give the same result', () => {
    const play = () => {
      const g = new Game({ map: lineMap, difficulty: 'medium', seed: 9 });
      g.autoStart = true;
      g.placeTower('pencil', 400, 320);
      g.placeTower('pencil', 700, 400);
      g.startRound();
      run(g, 60 * 90);
      return [g.money, g.lives, g.completed, g.stats.sidesBroken, g.nextShapeId];
    };
    expect(play()).toEqual(play());
  });

  it('save snapshots restore towers, money and progress', () => {
    const g = newGame();
    const t = g.placeTower('pencil', 400, 320)!;
    g.upgrade(t, 1);
    g.completed = 5;
    const snap = JSON.parse(JSON.stringify(g.snapshot()));
    const h = Game.restore(snap, lineMap);
    expect(h.money).toBe(g.money);
    expect(h.completed).toBe(5);
    expect(h.towers).toHaveLength(1);
    expect(h.towers[0].tierB).toBe(1);
  });
});

describe('paths', () => {
  it('samples lines and reports positions by distance', () => {
    const p = new Path([['M', 0, 0], ['L', 300, 0], ['L', 300, 400]]);
    expect(p.length).toBeCloseTo(700, 0);
    const v = { x: 0, y: 0 };
    p.pointAt(150, v);
    expect(v.x).toBeCloseTo(150, 0);
    p.pointAt(500, v);
    expect(v.x).toBeCloseTo(300, 0);
    expect(v.y).toBeCloseTo(200, 0);
    expect(p.distanceTo(150, 30)).toBeCloseTo(30, 0);
  });
});
