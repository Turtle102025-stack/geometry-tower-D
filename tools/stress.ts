/** Rich-player check: same build order, but with bonus cash each round, to see if late rounds are beatable at all. */
import { readFileSync } from 'node:fs';
import { parseArgs, Runner, type Layout } from './lib';
import type { DifficultyId } from '../src/data/difficulty';
const args = parseArgs(process.argv.slice(2));
const layout = JSON.parse(readFileSync(args.layout ?? 'tools/layouts/full.json', 'utf8')) as Layout;
const r = new Runner(args.map ?? 'gridline', (args.difficulty ?? 'hard') as DifficultyId, layout, 1);
const g = r.g;
const bonus = +(args.bonus ?? 5000);
for (let round = 1; round <= g.finalRound; round++) {
  g.money += bonus;
  r.buy();
  const lives = g.lives;
  g.startRound();
  let guard = 0;
  while (g.state === 'running' && guard++ < 60 * 900) {
    if (guard % 60 === 0) r.buy();
    g.step();
    g.events.clear();
  }
  if (lives !== g.lives || round % 10 === 0) console.log(`round ${round}: lives ${g.lives} (lost ${lives - g.lives}), towers ${g.towers.length}, time ${(guard / 60).toFixed(0)}s`);
  if (g.state === 'lost') { console.log('LOST at round', round); break; }
  if (g.state === 'won') { console.log('WON'); break; }
}
console.log(g.towers.map((t) => `${t.def.id} ${t.tierA}/${t.tierB}`).join(', '));
