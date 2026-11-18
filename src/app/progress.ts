import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements';
import type { DifficultyId } from '../data/difficulty';
import { MAP_LIST } from '../data/maps';
import type { MapDef } from '../data/maps/types';
import { TOWER_LIST } from '../data/towers';
import type { TowerDef } from '../data/towers/types';
import type { Game } from '../sim/game';
import type { Profile } from '../save/storage';

/** Total XP needed to reach each level (index 0 = level 1). */
export const LEVEL_XP = [0, 150, 400, 750, 1200, 1800, 2500, 3300, 4300, 5500];

export function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) lvl = i + 1;
  if (xp >= LEVEL_XP[LEVEL_XP.length - 1]) lvl += Math.floor((xp - LEVEL_XP[LEVEL_XP.length - 1]) / 1500);
  return lvl;
}

export function xpProgress(xp: number): { level: number; into: number; need: number } {
  const level = levelForXp(xp);
  const cur = level - 1 < LEVEL_XP.length ? LEVEL_XP[level - 1] : LEVEL_XP[LEVEL_XP.length - 1] + (level - LEVEL_XP.length) * 1500;
  const next = level < LEVEL_XP.length ? LEVEL_XP[level] : cur + 1500;
  return { level, into: xp - cur, need: next - cur };
}

const DIFF_XP: Record<DifficultyId, number> = { easy: 1, medium: 1.25, hard: 1.5 };
const WIN_XP: Record<DifficultyId, number> = { easy: 150, medium: 300, hard: 500 };

export function xpForRound(round: number, diff: DifficultyId): number {
  return Math.round((8 + round) * DIFF_XP[diff]);
}

/** Tracks XP, totals, medals and achievements. */
export class Progress {
  private last = { shapes: 0, sides: 0, abilities: 0 };
  private lastBoss: Record<string, number> = {};
  private gameXp = 0;
  private messages: string[] = [];

  constructor(
    readonly profile: Profile,
    private persist: () => void,
  ) {}

  get level(): number {
    return levelForXp(this.profile.xp);
  }

  isTowerUnlocked(def: TowerDef): boolean {
    return this.level >= def.unlockLevel;
  }

  isMapUnlocked(map: MapDef): boolean {
    return !map.unlock || this.profile.achievements.includes(map.unlock);
  }

  mapUnlockText(map: MapDef): string {
    const a = map.unlock ? ACHIEVEMENT_BY_ID[map.unlock] : null;
    return a ? `${a.name}: ${a.desc}` : '';
  }

  gameStarted(g: Game): void {
    this.last = { shapes: g.stats.shapesDestroyed, sides: g.stats.sidesBroken, abilities: g.stats.abilitiesUsed };
    this.lastBoss = { ...g.bossKills };
    this.gameXp = 0;
    if (g.mode === 'normal') {
      this.profile.totals.games++;
      this.persist();
    }
  }

  /** Folds the game's counters into the profile since the last call. */
  private absorb(g: Game): void {
    if (g.mode !== 'normal') return;
    const t = this.profile.totals;
    t.shapes += g.stats.shapesDestroyed - this.last.shapes;
    t.sides += g.stats.sidesBroken - this.last.sides;
    t.abilities += g.stats.abilitiesUsed - this.last.abilities;
    for (const [k, v] of Object.entries(g.bossKills)) t.bosses[k] = (t.bosses[k] ?? 0) + v - (this.lastBoss[k] ?? 0);
    this.last = { shapes: g.stats.shapesDestroyed, sides: g.stats.sidesBroken, abilities: g.stats.abilitiesUsed };
    this.lastBoss = { ...g.bossKills };
  }

  private addXp(xp: number): void {
    const before = this.level;
    this.profile.xp += xp;
    this.gameXp += xp;
    const after = this.level;
    if (after > before) {
      this.messages.push(`Level ${after}!`);
      for (const d of TOWER_LIST) if (d.unlockLevel > before && d.unlockLevel <= after) this.messages.push(`New tower: ${d.name}`);
    }
  }

  roundCleared(g: Game, round: number): void {
    if (g.mode !== 'normal') return;
    this.absorb(g);
    this.profile.totals.roundsCleared++;
    this.profile.totals.bestRound = Math.max(this.profile.totals.bestRound, round);
    this.addXp(xpForRound(round, g.diff.id));
    for (const t of g.towers) if (t.tierA >= 4 || t.tierB >= 4) this.profile.totals.tier4 = Math.max(this.profile.totals.tier4, 1);
    this.checkAchievements();
    this.persist();
  }

  victory(g: Game): void {
    if (g.mode !== 'normal') return;
    this.absorb(g);
    const m = (this.profile.medals[g.map.id] ??= {});
    if (!m[g.diff.id]) this.messages.push(`${g.diff.name} medal on ${g.map.name}`);
    m[g.diff.id] = true;
    this.profile.totals.wins++;
    this.addXp(WIN_XP[g.diff.id]);
    this.checkAchievements();
    this.persist();
  }

  defeat(g: Game): void {
    if (g.mode !== 'normal') return;
    this.absorb(g);
    this.checkAchievements();
    this.persist();
  }

  checkAchievements(): void {
    for (const a of ACHIEVEMENTS) {
      if (this.profile.achievements.includes(a.id)) continue;
      if (!a.check(this.profile)) continue;
      this.profile.achievements.push(a.id);
      this.messages.push(`Achievement: ${a.name}`);
      for (const m of MAP_LIST) if (m.unlock === a.id) this.messages.push(`New map: ${m.name}`);
    }
  }

  lastGameXp(): number {
    return this.gameXp;
  }

  drainMessages(): string[] {
    const m = this.messages;
    this.messages = [];
    return m;
  }

  peekMessages(): string[] {
    return this.messages;
  }
}
