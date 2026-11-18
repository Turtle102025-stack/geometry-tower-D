import { describe, it, expect } from 'vitest';
import { Progress, levelForXp, xpProgress } from '../src/app/progress';
import { defaultProfile } from '../src/save/storage';
import { MAPS } from '../src/data/maps';
import { TOWERS } from '../src/data/towers';
import { Game } from '../src/sim/game';

function fakeGame(map = MAPS.gridline, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
  return new Game({ map, difficulty, seed: 1 });
}

describe('progression', () => {
  it('levels follow the XP table', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(149)).toBe(1);
    expect(levelForXp(150)).toBe(2);
    expect(levelForXp(5500)).toBe(10);
    expect(levelForXp(7000)).toBe(11);
    const p = xpProgress(200);
    expect(p.level).toBe(2);
    expect(p.into).toBe(50);
  });

  it('XP unlocks towers', () => {
    const prof = defaultProfile();
    const pr = new Progress(prof, () => {});
    expect(pr.isTowerUnlocked(TOWERS.pencil)).toBe(true);
    expect(pr.isTowerUnlocked(TOWERS.tesseract)).toBe(false);
    prof.xp = 10_000;
    expect(pr.isTowerUnlocked(TOWERS.tesseract)).toBe(true);
  });

  it('winning awards a medal, XP and can unlock a map through an achievement', () => {
    const prof = defaultProfile();
    let saves = 0;
    const pr = new Progress(prof, () => saves++);
    const g = fakeGame();
    pr.gameStarted(g);
    expect(pr.isMapUnlocked(MAPS.mobius)).toBe(false);
    pr.victory(g);
    expect(prof.medals.gridline?.medium).toBe(true);
    expect(prof.xp).toBeGreaterThan(0);
    expect(prof.achievements).toContain('medium-win');
    expect(prof.achievements).toContain('first-win');
    expect(pr.isMapUnlocked(MAPS.mobius)).toBe(true);
    expect(pr.drainMessages().some((m) => m.includes('Möbius'))).toBe(true);
    expect(saves).toBeGreaterThan(0);
  });

  it('boss kills count toward achievements', () => {
    const prof = defaultProfile();
    const pr = new Progress(prof, () => {});
    const g = fakeGame();
    pr.gameStarted(g);
    g.bossKills.cube = 1;
    pr.roundCleared(g, 30);
    expect(prof.totals.bosses.cube).toBe(1);
    expect(pr.isMapUnlocked(MAPS.tangent)).toBe(true);
  });

  it('sandbox games never award progress', () => {
    const prof = defaultProfile();
    const pr = new Progress(prof, () => {});
    const g = new Game({ map: MAPS.gridline, difficulty: 'medium', mode: 'sandbox', seed: 1 });
    pr.gameStarted(g);
    pr.roundCleared(g, 10);
    pr.victory(g);
    expect(prof.xp).toBe(0);
    expect(prof.medals).toEqual({});
  });
});
