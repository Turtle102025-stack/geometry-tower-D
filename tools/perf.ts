/** Headless performance check: ms per sim step with a crowded field. */
import { Game } from '../src/sim/game';
import { MAPS } from '../src/data/maps';
import { spawnSpec } from '../src/sim/shapesys';

const g = new Game({ map: MAPS.gridline, difficulty: 'medium', mode: 'sandbox', seed: 3 });
const spots: [number, number][] = [];
for (let x = 60; x < 1240; x += 70) for (let y = 60; y < 700; y += 70) spots.push([x, y]);
let placed = 0;
const ids = ['pencil'];
for (const [x, y] of spots) {
  const id = ids[placed % ids.length];
  const t = g.placeTower(id, x, y);
  if (t) {
    placed++;
    g.upgrade(t, 1);
    g.upgrade(t, 1);
    g.upgrade(t, 1);
  }
  if (placed >= 60) break;
}
const path = g.paths[0];
for (let i = 0; i < 1500; i++) spawnSpec(g, i % 3 ? 'oct.armor' : 'hex.crystal', 0, (i / 1500) * path.length * 0.9);
for (let i = 0; i < 30; i++) g.step();
let max = 0;
const t0 = performance.now();
const N = 600;
for (let i = 0; i < N; i++) {
  const s = performance.now();
  g.step();
  max = Math.max(max, performance.now() - s);
  if (g.shapes.length < 1000) for (let k = 0; k < 50; k++) spawnSpec(g, 'oct.armor', 0, Math.random() * path.length * 0.8);
}
const avg = (performance.now() - t0) / N;
console.log(`towers=${g.towers.length} shapes=${g.shapes.length} projectiles=${g.projectiles.length}`);
console.log(`avg ${avg.toFixed(2)} ms/step, worst ${max.toFixed(2)} ms (budget at 3x speed: ~5ms)`);
