import { ROUNDS } from '../data/rounds';
import { parseSpec, specRbe } from '../data/shapes';
import { Rng } from './rng';

export interface SpawnGroup {
  spec: string;
  count: number;
  /** Seconds between spawns. */
  interval: number;
  /** Seconds after round start before the first spawn. */
  delay: number;
  /** Force a path index (otherwise spawns alternate across paths). */
  path: number;
}

export interface RoundDef {
  groups: SpawnGroup[];
}

export interface SpawnEvent {
  time: number;
  spec: string;
  path: number;
}

/**
 * Round DSL: groups separated by "|", each "count spec interval [+delay] [pN]".
 * Example: "20 tri 0.5 | 8 sq.ghost 0.7 +6 | 1 cube 1 +12 p0"
 */
export function parseRound(src: string): RoundDef {
  const groups: SpawnGroup[] = [];
  for (const raw of src.split('|')) {
    const tok = raw.trim().split(/\s+/);
    if (tok.length < 3) throw new Error(`Bad round group "${raw}"`);
    const g: SpawnGroup = { count: +tok[0], spec: tok[1], interval: +tok[2], delay: 0, path: -1 };
    for (const t of tok.slice(3)) {
      if (t.startsWith('+')) g.delay = +t.slice(1);
      else if (t.startsWith('p')) g.path = +t.slice(1);
      else throw new Error(`Bad token "${t}" in round group "${raw}"`);
    }
    if (!(g.count > 0) || !(g.interval >= 0)) throw new Error(`Bad numbers in round group "${raw}"`);
    parseSpec(g.spec); // validates
    groups.push(g);
  }
  return { groups };
}

const parsed: RoundDef[] = ROUNDS.map(parseRound);

/** Hand-designed rounds first; the freeplay generator takes over after them. */
export function getRound(n: number, seed = 0): RoundDef {
  if (n >= 1 && n <= parsed.length) return parsed[n - 1];
  return generateRound(n, seed);
}

export function handRoundCount(): number {
  return parsed.length;
}

/** Expands a round into a time-sorted list of spawns. */
export function buildSpawnQueue(round: RoundDef): SpawnEvent[] {
  const out: SpawnEvent[] = [];
  for (const g of round.groups) {
    for (let i = 0; i < g.count; i++) out.push({ time: g.delay + i * g.interval, spec: g.spec, path: g.path });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

export function roundRbe(round: RoundDef): number {
  let sum = 0;
  for (const g of round.groups) sum += g.count * specRbe(g.spec);
  return sum;
}

/** Freeplay: generated rounds whose total "hits to clear" keeps growing after the hand-made ones. */
export function generateRound(n: number, seed = 0): RoundDef {
  const rng = new Rng(seed * 7919 + n * 104729 + 17);
  const budget = n <= 80 ? 3000 * Math.pow(1.06, n - 40) : 70000 * Math.pow(1.07, n - 80);
  const groups: SpawnGroup[] = [];
  let left = budget;
  // bosses take a big share of every generated round
  const pool = n >= 100 ? ['icosahedron', 'dodecahedron'] : n >= 85 ? ['dodecahedron', 'icosahedron'] : n >= 60 ? ['octahedron', 'dodecahedron'] : ['cube', 'octahedron'];
  const boss = n % 10 === 0 && n >= 90 ? 'sphere' : rng.pick(pool);
  const bossEach = specRbe(boss);
  const bossCount = Math.max(1, Math.min(24, Math.floor((budget * rng.range(0.35, 0.6)) / bossEach)));
  groups.push({ spec: boss, count: bossCount, interval: Math.max(0.6, 12 / bossCount), delay: rng.range(2, 6), path: -1 });
  left -= bossCount * bossEach;
  const mods = ['', '.regrow', '.armor', '.ghost', '.shadow', '.crystal', '.ghost.regrow', '.armor.regrow', '.shadow.regrow', '.armor.ghost'];
  const polys = n >= 90 ? ['oct'] : ['hept', 'oct'];
  let delay = 0;
  let guard = 0;
  while (left > budget * 0.05 && guard++ < 8) {
    const spec = rng.pick(polys) + rng.pick(mods);
    const each = specRbe(spec);
    const count = Math.max(10, Math.min(500, Math.floor((left * rng.range(0.3, 0.7)) / each)));
    groups.push({ spec, count, interval: Math.min(0.15, Math.max(0.012, 25 / count)), delay, path: -1 });
    left -= count * each;
    delay += rng.range(2, 6);
  }
  return { groups };
}
