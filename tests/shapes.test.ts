import { describe, it, expect } from 'vitest';
import { damageShape } from '../src/sim/shapesys';
import { polyRbe, parseSpec, REGROW_TIME, specRbe } from '../src/data/shapes';
import { MOD } from '../src/sim/types';
import { newGame, put, alive, run } from './helpers';
import { attack } from '../src/data/towers/types';

describe('side stripping', () => {
  it('each hit knocks off one side', () => {
    const g = newGame();
    const s = put(g, 'hex');
    damageShape(g, s, 1, 'sharp', null, null);
    expect(s.rank).toBe(5);
    damageShape(g, s, 1, 'sharp', null, null);
    expect(s.rank).toBe(4);
    damageShape(g, s, 1, 'sharp', null, null);
    expect(s.rank).toBe(3);
    expect(s.alive).toBe(true);
    damageShape(g, s, 1, 'sharp', null, null);
    expect(s.alive).toBe(false);
    expect(g.stats.shapesDestroyed).toBe(1);
    expect(g.stats.sidesBroken).toBe(4);
  });

  it('a triangle shatters in one hit', () => {
    const g = newGame();
    const s = put(g, 'tri');
    damageShape(g, s, 1, 'sharp', null, null);
    expect(s.alive).toBe(false);
  });

  it('extra damage strips several sides at once', () => {
    const g = newGame();
    const s = put(g, 'hex');
    damageShape(g, s, 3, 'sharp', null, null);
    expect(s.rank).toBe(3);
    damageShape(g, s, 5, 'sharp', null, null);
    expect(s.alive).toBe(false);
  });

  it('shapes speed up with more sides', () => {
    const g = newGame();
    const tri = put(g, 'tri');
    const hex = put(g, 'hex');
    const oct = put(g, 'oct');
    expect(hex.speed).toBeGreaterThan(tri.speed);
    expect(oct.speed).toBeGreaterThan(hex.speed);
  });

  it('pays money for every side broken', () => {
    const g = newGame();
    const before = g.money;
    const s = put(g, 'pent');
    damageShape(g, s, 3, 'sharp', null, null);
    expect(g.money - before).toBe(3);
  });
});

describe('splitting', () => {
  it('heptagons split into two hexagons', () => {
    const g = newGame();
    const s = put(g, 'hept');
    damageShape(g, s, 1, 'sharp', null, null);
    expect(s.alive).toBe(false);
    const rest = alive(g);
    expect(rest).toHaveLength(2);
    expect(rest.every((c) => c.rank === 6)).toBe(true);
  });

  it('octagons split twice down to four hexagons with overflow damage', () => {
    const g = newGame();
    const s = put(g, 'oct');
    damageShape(g, s, 2, 'sharp', null, null);
    const rest = alive(g);
    expect(rest).toHaveLength(4);
    expect(rest.every((c) => c.rank === 6)).toBe(true);
  });

  it('the Split modifier makes small shapes split too, but children do not split again', () => {
    const g = newGame();
    const s = put(g, 'sq.split');
    damageShape(g, s, 1, 'sharp', null, null);
    const rest = alive(g);
    expect(rest).toHaveLength(2);
    expect(rest.every((c) => c.rank === 3 && !(c.mods & MOD.SPLIT))).toBe(true);
  });

  it('children inherit ghost/regrow/crystal/shadow but not armor', () => {
    const g = newGame();
    const s = put(g, 'hept.ghost.regrow');
    s.mods |= MOD.CRYSTAL;
    damageShape(g, s, 1, 'energy', null, null);
    for (const c of alive(g)) {
      expect(c.mods & MOD.GHOST).toBeTruthy();
      expect(c.mods & MOD.REGROW).toBeTruthy();
      expect(c.mods & MOD.CRYSTAL).toBeTruthy();
      expect(c.mods & MOD.ARMOR).toBeFalsy();
    }
  });

  it('hits-to-clear (RBE) accounts for splits and armor', () => {
    expect(polyRbe(3, 0)).toBe(1);
    expect(polyRbe(4, 0)).toBe(2);
    expect(polyRbe(6, 0)).toBe(4);
    expect(polyRbe(7, 0)).toBe(9);
    expect(polyRbe(8, 0)).toBe(19);
    expect(polyRbe(4, MOD.ARMOR)).toBe(3);
    expect(polyRbe(4, MOD.SPLIT)).toBe(3);
    expect(specRbe('cube')).toBe(260 + 6 * 19);
  });
});

describe('immunities', () => {
  it('armored shapes ignore sharp damage', () => {
    const g = newGame();
    const s = put(g, 'hex.armor');
    damageShape(g, s, 5, 'sharp', null, null);
    expect(s.rank).toBe(6);
    expect(s.mods & MOD.ARMOR).toBeTruthy();
  });

  it('non-sharp damage cracks the armor shell off first', () => {
    const g = newGame();
    const s = put(g, 'hex.armor');
    damageShape(g, s, 1, 'explosive', null, null);
    expect(s.mods & MOD.ARMOR).toBeFalsy();
    expect(s.rank).toBe(6);
    damageShape(g, s, 1, 'sharp', null, null);
    expect(s.rank).toBe(5);
  });

  it('armor-piercing sharp attacks can hurt armored shapes', () => {
    const g = newGame();
    const s = put(g, 'hex.armor');
    damageShape(g, s, 2, 'sharp', null, attack({ kind: 'dart', pierceArmor: true }));
    expect(s.mods & MOD.ARMOR).toBeFalsy();
    expect(s.rank).toBe(5);
  });

  it('crystal shapes ignore cold damage and freezing', () => {
    const g = newGame();
    const s = put(g, 'hex.crystal');
    damageShape(g, s, 3, 'cold', null, null);
    expect(s.rank).toBe(6);
    damageShape(g, s, 1, 'sharp', null, null);
    expect(s.rank).toBe(5);
  });

  it('shadow shapes ignore explosions', () => {
    const g = newGame();
    const s = put(g, 'hex.shadow');
    damageShape(g, s, 3, 'explosive', null, null);
    expect(s.rank).toBe(6);
    damageShape(g, s, 1, 'energy', null, null);
    expect(s.rank).toBe(5);
  });
});

describe('regrow', () => {
  it('regrows a side after a while without being hit, up to its starting rank', () => {
    const g = newGame();
    const s = put(g, 'hex.regrow');
    damageShape(g, s, 2, 'sharp', null, null);
    expect(s.rank).toBe(4);
    run(g, Math.ceil(REGROW_TIME * 60) + 2);
    expect(s.rank).toBe(5);
    run(g, Math.ceil(REGROW_TIME * 60) + 2);
    expect(s.rank).toBe(6);
    run(g, Math.ceil(REGROW_TIME * 60) * 2);
    expect(s.rank).toBe(6);
  });
});

describe('specs', () => {
  it('parses shape specs with modifiers', () => {
    const p = parseSpec('pent.ghost.armor');
    expect(p.boss).toBe(false);
    if (!p.boss) {
      expect(p.rank).toBe(5);
      expect(p.mods).toBe(MOD.GHOST | MOD.ARMOR);
    }
    expect(parseSpec('cube').boss).toBe(true);
    expect(() => parseSpec('blob')).toThrow();
    expect(() => parseSpec('hex.sparkly')).toThrow();
  });
});
