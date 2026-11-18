import { describe, it, expect } from 'vitest';
import { TOWER_LIST, TOWERS } from '../src/data/towers';
import { computeStats } from '../src/sim/towerStats';
import { newGame, put, run, alive } from './helpers';
import { MOD } from '../src/sim/types';

describe('tower data', () => {
  it('every legal upgrade combination builds valid stats', () => {
    for (const def of TOWER_LIST) {
      for (let a = 0; a <= 4; a++)
        for (let b = 0; b <= 4; b++) {
          if (a > 2 && b > 2) continue;
          const s = computeStats(def, a, b);
          expect(s.range).toBeGreaterThan(0);
          for (const atk of s.attacks) {
            expect(atk.interval).toBeGreaterThan(0);
            expect(atk.pierce).toBeGreaterThan(0);
          }
        }
    }
  });

  it('upgrades never mutate the base stats of other towers', () => {
    const def = TOWERS.pencil;
    const before = computeStats(def, 0, 0).attacks[0].pierce;
    computeStats(def, 4, 2);
    expect(computeStats(def, 0, 0).attacks[0].pierce).toBe(before);
  });
});

describe('attacks', () => {
  it('Compass fires a ring of needles in every direction', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('compass', 600, 300)!;
    put(g, 'tri', 600);
    g.step();
    expect(g.projectiles.length).toBe(t.stats.attacks[0].count);
  });

  it('Eraser Mortar damages several shapes with one blast', () => {
    const g = newGame({ mode: 'sandbox' });
    g.placeTower('eraser', 600, 280);
    for (let i = 0; i < 6; i++) put(g, 'hex', 590 + i * 4);
    for (const s of g.shapes) s.stun = 99;
    run(g, 60 * 2);
    const hurt = g.shapes.filter((s) => s.alive && s.rank < 6).length + g.stats.shapesDestroyed;
    expect(hurt).toBeGreaterThanOrEqual(4);
  });

  it('Eraser blasts cannot hurt Shadow shapes', () => {
    const g = newGame({ mode: 'sandbox' });
    g.placeTower('eraser', 600, 280);
    const s = put(g, 'hex.shadow', 600);
    s.stun = 99;
    run(g, 60 * 3);
    expect(s.rank).toBe(6);
  });

  it('Ice Cube freezes nearby shapes but not Crystal ones', () => {
    const g = newGame({ mode: 'sandbox' });
    g.placeTower('ice', 600, 320);
    const a = put(g, 'hex', 600);
    const b = put(g, 'hex.crystal', 610);
    g.step();
    expect(a.freeze).toBeGreaterThan(0);
    expect(b.freeze).toBe(0);
  });

  it('Vector needs Night Sight to snipe ghosts', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('vector', 100, 600)!;
    const ghost = put(g, 'hex.ghost', 900);
    ghost.stun = 99;
    run(g, 60 * 3);
    expect(ghost.rank).toBe(6);
    g.upgrade(t, 1);
    run(g, 60 * 3);
    expect(ghost.alive === false || ghost.rank < 6).toBe(true);
  });

  it('Vector Field spawns arrows on hit', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('vector', 100, 600)!;
    for (let i = 0; i < 4; i++) g.upgrade(t, 1);
    const s = put(g, 'oct', 900);
    s.stun = 99;
    g.step();
    expect(g.projectiles.length).toBeGreaterThanOrEqual(10);
  });

  it('Perfect Circle blades shred shapes passing through', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('compass', 600, 300)!;
    for (let i = 0; i < 4; i++) g.upgrade(t, 0);
    expect(t.stats.attacks.some((a) => a.kind === 'orbit')).toBe(true);
    put(g, 'hex', 200);
    run(g, 60 * 10);
    expect(alive(g)).toHaveLength(0);
  });

  it('Cluster Crumbs set off extra explosions', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('eraser', 600, 280)!;
    g.upgrade(t, 1);
    g.upgrade(t, 1);
    g.upgrade(t, 1);
    const s = put(g, 'oct', 600);
    s.stun = 99;
    run(g, 60 * 1.5);
    expect(g.pending.length + g.stats.sidesBroken).toBeGreaterThan(2);
  });

  it('Steel Nib pencils can hurt Armored shapes', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('pencil', 600, 310)!;
    const s = put(g, 'hex.armor', 600);
    s.stun = 99;
    run(g, 60 * 2);
    expect(s.mods & MOD.ARMOR).toBeTruthy();
    for (let i = 0; i < 3; i++) g.upgrade(t, 0);
    run(g, 60 * 2);
    expect(s.alive === false || !(s.mods & MOD.ARMOR)).toBe(true);
  });

  it('abilities trigger and go on cooldown', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('ice', 600, 300)!;
    for (let i = 0; i < 4; i++) g.upgrade(t, 0);
    expect(t.stats.ability).toBe('absoluteZero');
    const s = put(g, 'hex', 100);
    expect(g.useAbility(t)).toBe(true);
    expect(s.freeze).toBeGreaterThan(0);
    expect(g.useAbility(t)).toBe(false);
    expect(t.abilityCd).toBeGreaterThan(0);
  });
});

describe('support, income and late towers', () => {
  it('Projector reveals ghosts so other towers can target them', () => {
    const g = newGame({ mode: 'sandbox' });
    const pencil = g.placeTower('pencil', 600, 310)!;
    const ghost = put(g, 'hex.ghost', 600);
    ghost.stun = 99;
    run(g, 60);
    expect(ghost.rank).toBe(6);
    g.placeTower('projector', 680, 300);
    run(g, 60 * 2);
    expect(ghost.alive === false || ghost.rank < 6).toBe(true);
    expect(pencil.sides).toBeGreaterThan(0);
  });

  it('Floodlight strips ghosts anywhere on the map', () => {
    const g = newGame({ mode: 'sandbox' });
    const p = g.placeTower('projector', 100, 600)!;
    for (let i = 0; i < 4; i++) g.upgrade(p, 0);
    const ghost = put(g, 'hex.ghost', 1100);
    g.step();
    expect(ghost.mods & MOD.GHOST).toBeFalsy();
  });

  it('Chalkboard speeds up towers in range and gives a discount', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('pencil', 600, 300)!;
    const before = g.upgradePrice(t, 0);
    const cb = g.placeTower('chalkboard', 660, 290)!;
    expect(t.buff.rate).toBeCloseTo(0.15);
    g.upgrade(cb, 1);
    g.upgrade(cb, 1);
    expect(t.buff.discount).toBeCloseTo(0.1);
    expect(g.upgradePrice(t, 0)).toBeLessThan(before);
    g.sell(cb);
    expect(t.buff.rate).toBe(0);
  });

  it('Golden Ratio pays out at the end of every round', () => {
    const g = newGame();
    g.money = 5000;
    g.placeTower('golden', 600, 300);
    const before = g.money;
    g.startRound();
    for (let i = 0; i < 60 * 60 && g.state === 'running'; i++) {
      g.step();
      for (const s of g.shapes) s.alive = false;
    }
    expect(g.money - before).toBe(90 + 101);
  });

  it('Protractor Boat can only be placed on water', () => {
    const g = newGame({ mode: 'sandbox' });
    expect(g.placeTower('boat', 600, 300)).toBeNull();
    expect(g.placeTower('boat', 100, 100)).toBeTruthy();
    expect(g.placeTower('pencil', 150, 150)).toBeNull();
  });

  it('Laser beams heat up on the same target', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('laser', 600, 310)!;
    g.upgrade(t, 1);
    g.upgrade(t, 1);
    const c = put(g, 'cube', 600);
    c.stun = 99;
    c.hp = c.maxHp = 1e6;
    run(g, 60 * 3);
    expect(t.beams[0][0].heat).toBeGreaterThan(3);
  });

  it('Tesseract Pocket Dimension folds shapes backwards', () => {
    const g = newGame({ mode: 'sandbox' });
    const t = g.placeTower('tesseract', 600, 300)!;
    for (let i = 0; i < 3; i++) g.upgrade(t, 1);
    t.stats.attacks[0].damage = 0;
    const s = put(g, 'oct', 620);
    s.stun = 99;
    const d0 = s.dist;
    run(g, 3);
    expect(s.dist).toBeLessThan(d0);
  });
});
