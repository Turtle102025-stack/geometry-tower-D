import type { MapDef } from '../src/data/maps/types';
import { Game, type GameOptions } from '../src/sim/game';
import { spawnPoly, spawnSpec } from '../src/sim/shapesys';
import { parseSpec } from '../src/data/shapes';

/** A straight horizontal lane across the middle, with a pond in the top-left corner. */
export const lineMap: MapDef = {
  id: 'test-line',
  name: 'Test Line',
  tier: 'Beginner',
  blurb: '',
  paths: [[['M', -20, 360], ['L', 1300, 360]]],
  water: [{ type: 'rect', x: 0, y: 0, w: 200, h: 200 }],
  obstacles: [],
  unlock: null,
  accent: 0xffffff,
};

export function newGame(opts: Partial<GameOptions> = {}): Game {
  return new Game({ map: lineMap, difficulty: 'medium', seed: 42, ...opts });
}

/** Spawns a shape at a given distance along path 0 and refreshes the grid. */
export function put(g: Game, spec: string, dist = 400) {
  const p = parseSpec(spec);
  const s = p.boss ? spawnSpec(g, spec, 0, dist) : spawnPoly(g, p.rank, p.mods, 0, dist, 0);
  g.grid.build(g.shapes, g.shapes.length);
  return s;
}

export function alive(g: Game) {
  return g.shapes.filter((s) => s.alive);
}

export function run(g: Game, ticks: number) {
  for (let i = 0; i < ticks; i++) g.step();
}
