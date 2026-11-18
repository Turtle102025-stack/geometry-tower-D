/**
 * Headless balance simulator.
 *   npm run sim -- --map gridline --difficulty easy --layout tools/layouts/standard.json [--seed 1] [--rounds 40] [--quiet]
 * Plays a scripted layout through every round and reports where lives are lost.
 */
import { readFileSync } from 'node:fs';
import { EV } from '../src/sim/events';
import { RANKS } from '../src/data/shapes';
import { BOSSES } from '../src/data/bosses';
import { MOD_KEYS, MOD_BY_KEY } from '../src/sim/types';
import type { DifficultyId } from '../src/data/difficulty';
import { parseArgs, Runner, type Layout } from './lib';

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log('npm run sim -- --map <id> --difficulty easy|medium|hard --layout <file.json> [--seed n] [--rounds n] [--quiet]');
  process.exit(0);
}
const layoutPath = args.layout ?? 'tools/layouts/standard.json';
const layout = JSON.parse(readFileSync(layoutPath, 'utf8')) as Layout;
const difficulty = (args.difficulty ?? 'easy') as DifficultyId;
const r = new Runner(args.map ?? 'gridline', difficulty, layout, +(args.seed ?? 1));
const g = r.g;
const last = +(args.rounds ?? g.finalRound);

function leakName(kind: number, code: number): string {
  if (kind > 0) return BOSSES[kind - 1].name;
  const rank = Math.floor(code / 64);
  const mods = code % 64;
  return [...MOD_KEYS.filter((k) => mods & MOD_BY_KEY[k]), RANKS[rank]?.key ?? '?'].join('.');
}

console.log(`Layout "${layout.name}" on ${g.map.name} (${g.diff.name}), ${last} rounds\n`);
console.log('round  lives  lost  money   towers  leaked');
let totalLost = 0;
const leakTotals = new Map<string, number>();
for (let round = 1; round <= last; round++) {
  r.buy();
  g.startRound();
  const leaks = new Map<string, number>();
  let lost = 0;
  let guard = 0;
  while (g.state === 'running' && guard++ < 60 * 600) {
    if (guard % 30 === 0) r.buy();
    g.step();
    for (let i = 0; i < g.events.length; i++) {
      const e = g.events.get(i);
      if (e.type === EV.LEAK) {
        const n = leakName(e.b, e.c);
        leaks.set(n, (leaks.get(n) ?? 0) + e.a);
        leakTotals.set(n, (leakTotals.get(n) ?? 0) + e.a);
        lost += e.a;
      }
    }
    g.events.clear();
  }
  totalLost += lost;
  const leakStr = [...leaks].map(([k, v]) => `${k}:${v}`).join(' ');
  if (!args.quiet || lost > 0 || g.state === 'lost')
    console.log(
      `${String(round).padStart(5)}  ${String(Math.max(0, g.lives)).padStart(5)}  ${String(lost).padStart(4)}  ${String(Math.floor(g.money)).padStart(6)}  ${String(g.towers.length).padStart(6)}  ${leakStr}`,
    );
  if (g.state === 'lost') {
    console.log(`\nLOST on round ${round}.`);
    break;
  }
  if (g.state === 'won') {
    console.log(`\nWON with ${g.lives} lives left.`);
    break;
  }
}
console.log(`\nTotal lives lost: ${totalLost}`);
if (leakTotals.size) console.log('Leaks by shape: ' + [...leakTotals].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(', '));
console.log('Towers: ' + g.towers.map((t) => `${t.def.name} ${t.tierA}/${t.tierB} (${t.sides} sides)`).join('; '));
