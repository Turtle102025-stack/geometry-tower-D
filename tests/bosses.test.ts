import { describe, it, expect } from 'vitest';
import { damageShape } from '../src/sim/shapesys';
import { BOSSES } from '../src/data/bosses';
import { specRbe } from '../src/data/shapes';
import { attack } from '../src/data/towers/types';
import { applyStatus } from '../src/sim/combat';
import { newGame, put, alive, run } from './helpers';

describe('bosses', () => {
  it('take damage as HP, not sides', () => {
    const g = newGame();
    const c = put(g, 'cube');
    damageShape(g, c, 50, 'sharp', null, null);
    expect(c.alive).toBe(true);
    expect(c.hp).toBe(BOSSES[0].hp - 50);
  });

  it('burst into a swarm of smaller shapes when destroyed', () => {
    const g = newGame();
    const c = put(g, 'cube');
    damageShape(g, c, 10_000, 'explosive', null, null);
    expect(c.alive).toBe(false);
    const kids = alive(g);
    expect(kids).toHaveLength(6);
    expect(kids.every((k) => k.kind === 0 && k.rank === 8)).toBe(true);
    expect(g.stats.bossesKilled).toBe(1);
    expect(g.bossKills.cube).toBe(1);
  });

  it('bigger bosses burst into smaller bosses', () => {
    const g = newGame();
    const o = put(g, 'octahedron');
    damageShape(g, o, 1e6, 'energy', null, null);
    const kids = alive(g);
    expect(kids.filter((k) => k.kind === 1)).toHaveLength(3);
    expect(kids.filter((k) => k.kind === 0)).toHaveLength(4);
  });

  it('cost their whole remaining swarm in lives when they escape', () => {
    const g = newGame();
    g.lives = 10_000;
    const c = put(g, 'cube', 1255);
    const lives = g.lives;
    c.hp -= 100;
    run(g, 60 * 3);
    expect(lives - g.lives).toBe(specRbe('cube') - 100);
  });

  it('cannot be frozen solid, only slowed', () => {
    const g = newGame();
    const c = put(g, 'cube');
    applyStatus(g, null, attack({ kind: 'pulse', freeze: 2, dmgType: 'cold' }), c);
    expect(c.freeze).toBe(0);
    expect(c.slow).toBeGreaterThan(0);
    expect(c.slowMul).toBeLessThan(1);
  });

  it('pays a bounty when destroyed', () => {
    const g = newGame();
    const c = put(g, 'cube');
    const before = g.money;
    damageShape(g, c, 10_000, 'sharp', null, null);
    expect(g.money - before).toBeGreaterThanOrEqual(Math.round(BOSSES[0].hp * 0.25));
  });

  it('every boss has valid children', () => {
    for (const b of BOSSES) {
      expect(b.hp).toBeGreaterThan(0);
      for (const c of b.children) expect(specRbe(c.spec)).toBeGreaterThan(0);
    }
  });
});
