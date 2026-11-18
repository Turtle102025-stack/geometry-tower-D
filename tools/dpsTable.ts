/**
 * Damage-per-cost table for every tower and upgrade.
 *   npm run dps-table [-- --tower pencil] [--md docs/BALANCE_TABLE.md]
 * Each build is measured in two arenas on a straight test lane:
 *   crowd: a dense stream of octagons walking past the tower (sides broken per second)
 *   boss:  a stunned, unkillable Cube right in front of the tower (damage per second)
 * "per $1k" columns divide by the build's total Medium price; "step" columns show what the
 * latest upgrade added per $1k it cost. Outliers are flagged.
 */
import { writeFileSync } from 'node:fs';
import type { MapDef } from '../src/data/maps/types';
import { TOWER_LIST } from '../src/data/towers';
import type { TowerDef } from '../src/data/towers/types';
import { Game } from '../src/sim/game';
import { spawnSpec } from '../src/sim/shapesys';
import { parseArgs } from './lib';

const lane: MapDef = {
  id: 'dps-lane',
  name: 'DPS lane',
  tier: 'Beginner',
  blurb: '',
  paths: [[['M', -20, 360], ['L', 1300, 360]]],
  water: [],
  obstacles: [],
  unlock: null,
  accent: 0,
};
const waterLane: MapDef = { ...lane, id: 'dps-water', water: [{ type: 'rect', x: 600, y: 230, w: 80, h: 80 }] };
const mapFor = (def: TowerDef) => (def.water ? waterLane : lane);

const COMBOS: [number, number][] = [
  [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [4, 2],
  [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 2],
];

function build(def: TowerDef, a: number, b: number, g: Game) {
  const t = g.placeTower(def.id, 640, 270)!;
  if (!t) throw new Error(`could not place ${def.id}`);
  let cost = g.towerPrice(def);
  for (let i = 0; i < b; i++) {
    cost += g.upgradePrice(t, 1);
    g.upgrade(t, 1);
  }
  for (let i = 0; i < a; i++) {
    cost += g.upgradePrice(t, 0);
    g.upgrade(t, 0);
  }
  return { t, cost };
}

function crowd(def: TowerDef, a: number, b: number): { dps: number; cost: number } {
  const g = new Game({ map: mapFor(def), difficulty: 'medium', mode: 'sandbox', seed: 5 });
  const { t, cost } = build(def, a, b, g);
  g.sandboxSpawn('oct', 800, 0.05);
  for (let i = 0; i < 60 * 5; i++) g.step();
  const s0 = t.sides;
  for (let i = 0; i < 60 * 30; i++) g.step();
  return { dps: (t.sides - s0) / 30, cost };
}

function boss(def: TowerDef, a: number, b: number): number {
  const g = new Game({ map: mapFor(def), difficulty: 'medium', mode: 'sandbox', seed: 5 });
  const { t } = build(def, a, b, g);
  const s = spawnSpec(g, 'cube', 0, 660);
  s.hp = s.maxHp = 1e9;
  s.stun = 1e9;
  for (let i = 0; i < 60 * 2; i++) g.step();
  const s0 = t.sides;
  for (let i = 0; i < 60 * 20; i++) {
    s.stun = 1e9;
    g.step();
  }
  return (t.sides - s0) / 20;
}

const args = parseArgs(process.argv.slice(2));
const UPGRADE_DESC = new Map<string, string>();
for (const d of TOWER_LIST) for (const p of d.paths) for (const u of p.upgrades) UPGRADE_DESC.set(d.name + u.name, u.desc);
const rows: { tower: string; tiers: string; cost: number; crowd: number; boss: number; cEff: number; bEff: number; step: string; flag: string; up: string }[] = [];
for (const def of TOWER_LIST) {
  if (args.tower && args.tower !== def.id) continue;
  const base = new Map<string, { dps: number; cost: number; boss: number }>();
  for (const [a, b] of COMBOS) {
    const c = crowd(def, a, b);
    const bd = boss(def, a, b);
    base.set(`${a}/${b}`, { dps: c.dps, cost: c.cost, boss: bd });
    // previous combo along the purchase order (path B first, then A, as built)
    const prevKey = a > 0 ? `${a - 1}/${b}` : b > 0 ? `${a}/${b - 1}` : '';
    const prev = prevKey ? base.get(prevKey) : undefined;
    let step = '';
    let up = '';
    if (prev) {
      const dc = c.cost - prev.cost;
      const sc = ((c.dps - prev.dps) / dc) * 1000;
      const sb = ((bd - prev.boss) / dc) * 1000;
      step = `${sc.toFixed(1)} / ${sb.toFixed(1)}`;
      up = a > 0 ? def.paths[0].upgrades[a - 1].name : def.paths[1].upgrades[b - 1].name;
    }
    rows.push({ tower: def.name, tiers: `${a}/${b}`, cost: c.cost, crowd: c.dps, boss: bd, cEff: (c.dps / c.cost) * 1000, bEff: (bd / c.cost) * 1000, step, flag: '', up });
  }
}
// flag outliers against the median efficiency of damage-dealing builds
const effs = rows.map((r) => Math.max(r.cEff, r.bEff)).filter((x) => x > 0).sort((x, y) => x - y);
const median = effs[Math.floor(effs.length / 2)] || 1;
for (const r of rows) {
  const e = Math.max(r.cEff, r.bEff);
  if (e > median * 2.5) r.flag = 'OP?';
  if (r.step) {
    const [sc, sb] = r.step.split(' / ').map(Number);
    const utility = /range|ghost|armor|ability|longer|further/i.test(r.up + ' ' + (UPGRADE_DESC.get(r.tower + r.up) ?? ''));
    if (Math.max(sc, sb) < median * 0.2) r.flag = (r.flag ? r.flag + ' ' : '') + (utility ? 'utility' : 'weak step');
  }
}
const header = '| Tower | Tiers | Upgrade bought | Cost | Crowd sides/s | Boss dmg/s | Crowd per $1k | Boss per $1k | Step gain per $1k (crowd / boss) | Flag |';
const lines = [header, '|---|---|---|---:|---:|---:|---:|---:|---|---|'];
for (const r of rows) {
  lines.push(`| ${r.tower} | ${r.tiers} | ${r.up} | ${r.cost} | ${r.crowd.toFixed(1)} | ${r.boss.toFixed(1)} | ${r.cEff.toFixed(1)} | ${r.bEff.toFixed(1)} | ${r.step} | ${r.flag} |`);
}
const md = `Median efficiency: ${median.toFixed(1)} per $1k\n\n${lines.join('\n')}\n`;
console.log(md);
if (args.md) writeFileSync(args.md, `# Damage per cost (generated by \`npm run dps-table\`)\n\n${md}`);
