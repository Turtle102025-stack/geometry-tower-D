/** Shared helpers for the headless balance tools. */
import { MAPS } from '../src/data/maps';
import { TOWERS } from '../src/data/towers';
import type { DifficultyId } from '../src/data/difficulty';
import { Game } from '../src/sim/game';
import { computeStats } from '../src/sim/towerStats';
import type { Tower } from '../src/sim/types';

export type Action =
  | { place: string; id: string; x?: number; y?: number; water?: boolean }
  | { upgrade: string; path: 0 | 1; times?: number }
  | { target: string; mode: 'first' | 'last' | 'strong' | 'close' }
  | { sell: string };

export interface Layout {
  name: string;
  /** Actions are bought in order, as soon as they are affordable. */
  actions: Action[];
}

export function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      out[k] = v;
    }
  }
  return out;
}

/**
 * Finds the free spot where a tower's range covers the most path. Path samples are
 * weighted so spots that see several lanes or corners score higher.
 */
export function bestSpot(g: Game, defId: string): { x: number; y: number } | null {
  const def = TOWERS[defId];
  const range = Math.min(400, computeStats(def, 0, 0).range);
  let best: { x: number; y: number } | null = null;
  let bestScore = -1;
  for (let x = 30; x < 1250; x += 14) {
    for (let y = 30; y < 700; y += 14) {
      if (!g.checkPlacement(def, x, y).ok) continue;
      let score = 0;
      for (const p of g.paths) {
        for (let i = 0; i < p.count; i += 4) {
          const dx = p.xs[i] - x;
          const dy = p.ys[i] - y;
          if (dx * dx + dy * dy <= range * range) score += 1 + 0.4 * (i / p.count);
        }
      }
      if (range >= 400) score = 1000 - Math.hypot(x - 640, y - 360) * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  return best;
}

export class Runner {
  readonly g: Game;
  private queue: Action[];
  readonly towers = new Map<string, Tower>();
  readonly log: string[] = [];

  constructor(mapId: string, difficulty: DifficultyId, layout: Layout, seed = 1) {
    const map = MAPS[mapId];
    if (!map) throw new Error(`Unknown map ${mapId}. Maps: ${Object.keys(MAPS).join(', ')}`);
    this.g = new Game({ map, difficulty, seed });
    this.queue = layout.actions.flatMap((a) => ('upgrade' in a && a.times ? Array.from({ length: a.times }, () => ({ ...a, times: 1 })) : [a]));
  }

  /** Buys as many queued actions as money allows (in order). */
  buy(): void {
    const g = this.g;
    while (this.queue.length) {
      const a = this.queue[0];
      if ('place' in a) {
        const def = TOWERS[a.place];
        if (!g.canAfford(g.towerPrice(def))) return;
        const spot = a.x !== undefined && a.y !== undefined ? { x: a.x, y: a.y } : bestSpot(g, a.place);
        if (!spot) {
          this.log.push(`no spot for ${a.place}`);
          this.queue.shift();
          continue;
        }
        const t = g.placeTower(a.place, spot.x, spot.y);
        if (!t) return;
        this.towers.set(a.id, t);
      } else if ('upgrade' in a) {
        const t = this.towers.get(a.upgrade);
        if (!t || !g.canUpgrade(t, a.path)) {
          this.queue.shift();
          continue;
        }
        if (!g.canAfford(g.upgradePrice(t, a.path))) return;
        g.upgrade(t, a.path);
      } else if ('target' in a) {
        const t = this.towers.get(a.target);
        if (t) g.setTargeting(t, a.mode);
      } else if ('sell' in a) {
        const t = this.towers.get(a.sell);
        if (t) g.sell(t);
      }
      this.queue.shift();
    }
  }
}
