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

/** Freeplay: generated rounds whose total "hits to clear" grows with the round number. */
export function generateRound(n: number, seed = 0): RoundDef {
  const rng = new Rng(seed * 7919 + n * 104729 + 17);
  const budget = Math.round(14000 * Math.pow(1.085, n - 60));
  const groups: SpawnGroup[] = [];
  const mods = ['', '.regrow', '.armor', '.ghost', '.shadow', '.crystal', '.ghost.regrow', '.armor.regrow', '.split'];
  const polys = ['hex', 'hept', 'oct'];
  let left = budget;
  let delay = 0;
  // bosses every 5 rounds, scaling up
  if (n % 5 === 0) {
    const tier = n >= 100 ? 'sphere' : n >= 90 ? 'icosahedron' : n >= 75 ? 'dodecahedron' : 'octahedron';
    const each = specRbe(tier);
    const count = Math.max(1, Math.min(12, Math.floor((budget * 0.55) / each)));
    groups.push({ spec: tier, count, interval: 2.2, delay: 4, path: -1 });
    left -= count * each;
  }
  let guard = 0;
  while (left > 0 && guard++ < 12) {
    const spec = rng.pick(polys) + rng.pick(mods);
    const each = specRbe(spec);
    const count = Math.max(4, Math.min(120, Math.floor((left * rng.range(0.25, 0.6)) / each)));
    groups.push({ spec, count, interval: Math.max(0.04, rng.range(0.06, 0.2)), delay, path: -1 });
    left -= count * each;
    delay += rng.range(1, 4);
  }
  if (n % 3 === 0) {
    const each = specRbe('cube');
    const count = Math.min(30, Math.max(2, Math.floor(budget / 40 / each)));
    groups.push({ spec: rng.next() < 0.5 ? 'cube' : 'octahedron', count, interval: 1.2, delay: delay + 2, path: -1 });
  }
  return { groups };
}
