import { MOD, MOD_BY_KEY, MOD_KEYS, type ModKey } from '../sim/types';
import { BOSSES, BOSS_INDEX } from './bosses';

export interface RankDef {
  sides: number;
  name: string;
  key: string;
  color: number;
  /** Units per second. */
  speed: number;
  radius: number;
  /** Shapes this rank breaks into when it loses a side (0/1 = just loses the side). */
  split: number;
}

/** Shape ranks. More sides = faster. Hits to destroy = sides - 2. */
export const RANKS: Record<number, RankDef> = {
  3: { sides: 3, name: 'Triangle', key: 'tri', color: 0xff3d6e, speed: 78, radius: 16, split: 0 },
  4: { sides: 4, name: 'Square', key: 'sq', color: 0xff8a1f, speed: 98, radius: 16, split: 0 },
  5: { sides: 5, name: 'Pentagon', key: 'pent', color: 0xffe23d, speed: 122, radius: 17, split: 0 },
  6: { sides: 6, name: 'Hexagon', key: 'hex', color: 0x39ff88, speed: 150, radius: 18, split: 0 },
  7: { sides: 7, name: 'Heptagon', key: 'hept', color: 0x3db8ff, speed: 172, radius: 19, split: 2 },
  8: { sides: 8, name: 'Octagon', key: 'oct', color: 0xb45cff, speed: 190, radius: 20, split: 2 },
};
export const MIN_RANK = 3;
export const MAX_RANK = 8;

export const RANK_BY_KEY: Record<string, number> = Object.fromEntries(
  Object.values(RANKS).map((r) => [r.key, r.sides]),
);

/** Seconds without being hit before a regrowing shape gains a side back. */
export const REGROW_TIME = 2.4;
/** Number of shapes a Split-modified shape breaks into. */
export const SPLIT_COUNT = 2;

/** Modifiers inherited by children / lower ranks. Armor is a shell and is never inherited. */
export const INHERITED_MODS = MOD.GHOST | MOD.REGROW | MOD.CRYSTAL | MOD.SHADOW;

export const MOD_LABELS: Record<ModKey, string> = {
  armor: 'Armored',
  ghost: 'Ghost',
  regrow: 'Regrowing',
  crystal: 'Crystal',
  shadow: 'Shadow',
  split: 'Splitting',
};

export function splitCount(rank: number, mods: number): number {
  if (rank <= MIN_RANK) return 0;
  if (mods & MOD.SPLIT) return SPLIT_COUNT;
  return RANKS[rank].split;
}

const rbeMemo = new Map<number, number>();
/** "Hits to clear": how many hits a polygon (and everything it splits into) can absorb. */
export function polyRbe(rank: number, mods: number): number {
  const key = rank * 64 + mods;
  const hit = rbeMemo.get(key);
  if (hit !== undefined) return hit;
  const armor = mods & MOD.ARMOR ? 1 : 0;
  let v: number;
  if (rank <= MIN_RANK) v = armor + 1;
  else {
    const k = splitCount(rank, mods);
    const childMods = mods & INHERITED_MODS;
    v = armor + 1 + (k >= 2 ? k * polyRbe(rank - 1, childMods) : polyRbe(rank - 1, childMods));
  }
  rbeMemo.set(key, v);
  return v;
}

export type ParsedSpec = { boss: false; rank: number; mods: number } | { boss: true; bossIndex: number };

const specMemo = new Map<string, ParsedSpec>();
/** Parses "hex", "hex.ghost.regrow", "sq.armor", "cube" ... */
export function parseSpec(spec: string): ParsedSpec {
  const hit = specMemo.get(spec);
  if (hit) return hit;
  const parts = spec.trim().split('.');
  const head = parts[0];
  let out: ParsedSpec;
  if (head in BOSS_INDEX) {
    out = { boss: true, bossIndex: BOSS_INDEX[head] };
  } else {
    const rank = RANK_BY_KEY[head];
    if (!rank) throw new Error(`Unknown shape "${head}" in spec "${spec}"`);
    let mods = 0;
    for (const p of parts.slice(1)) {
      if (!(MOD_KEYS as readonly string[]).includes(p)) throw new Error(`Unknown modifier "${p}" in spec "${spec}"`);
      mods |= MOD_BY_KEY[p as ModKey];
    }
    out = { boss: false, rank, mods };
  }
  specMemo.set(spec, out);
  return out;
}

export function specRbe(spec: string): number {
  const p = parseSpec(spec);
  if (p.boss) return bossRbe(p.bossIndex);
  return polyRbe(p.rank, p.mods);
}

const bossMemo = new Map<number, number>();
export function bossRbe(index: number): number {
  const hit = bossMemo.get(index);
  if (hit !== undefined) return hit;
  const b = BOSSES[index - 1];
  let v = b.hp;
  for (const c of b.children) v += c.count * specRbe(c.spec);
  bossMemo.set(index, v);
  return v;
}

export function specLabel(spec: string): string {
  const p = parseSpec(spec);
  if (p.boss) return BOSSES[p.bossIndex - 1].name;
  const mods = MOD_KEYS.filter((k) => p.mods & MOD_BY_KEY[k]).map((k) => MOD_LABELS[k]);
  return [...mods, RANKS[p.rank].name].join(' ');
}

/** One-line tips shown the first time a round introduces a shape type. */
export const TYPE_TIPS: Record<string, string> = {
  hept: 'HEPTAGONS split into two hexagons when hit.',
  oct: 'OCTAGONS split into two heptagons when hit.',
  armor: 'ARMORED shapes ignore sharp hits. Use explosions, energy or armor-piercing upgrades.',
  ghost: 'GHOST shapes can only be targeted by towers that see ghosts (Graph Scope, Night Sight…).',
  regrow: 'REGROWING shapes rebuild their sides if you don’t finish them off.',
  crystal: 'CRYSTAL shapes are immune to cold and freezing.',
  shadow: 'SHADOW shapes are drawn in permanent marker: explosions can’t touch them.',
  split: 'SPLITTING shapes (fracture lines) break into two smaller shapes.',
  cube: 'BOSS: the Cube bursts into six octagons when destroyed.',
  octahedron: 'BOSS: the Octahedron bursts into three Cubes.',
  dodecahedron: 'BOSS: the Dodecahedron bursts into three Octahedrons.',
  icosahedron: 'BOSS: the Icosahedron bursts into two Dodecahedrons.',
  sphere: 'FINAL BOSS: The Sphere — the shape with infinite sides.',
};

/** Tip keys that appear in a list of specs (rank keys for hept/oct, modifier keys, boss keys). */
export function tipKeysForSpecs(specs: string[]): string[] {
  const out = new Set<string>();
  for (const spec of specs) {
    const parts = spec.split('.');
    for (const p of parts) if (p in TYPE_TIPS) out.add(p);
  }
  return [...out];
}
