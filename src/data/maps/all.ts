import { rounded, type PathCmd } from '../../sim/path';
import type { MapDef } from './types';

/** Koch curve (level n) from a to b, bulging to the left of the direction of travel. */
function koch(ax: number, ay: number, bx: number, by: number, n: number): [number, number][] {
  if (n === 0) return [[ax, ay], [bx, by]];
  const dx = (bx - ax) / 3;
  const dy = (by - ay) / 3;
  const p1: [number, number] = [ax + dx, ay + dy];
  const p3: [number, number] = [ax + 2 * dx, ay + 2 * dy];
  const c = Math.cos(-Math.PI / 3);
  const s = Math.sin(-Math.PI / 3);
  const p2: [number, number] = [p1[0] + dx * c - dy * s, p1[1] + dx * s + dy * c];
  const pts = [
    ...koch(ax, ay, p1[0], p1[1], n - 1),
    ...koch(p1[0], p1[1], p2[0], p2[1], n - 1).slice(1),
    ...koch(p2[0], p2[1], p3[0], p3[1], n - 1).slice(1),
    ...koch(p3[0], p3[1], bx, by, n - 1).slice(1),
  ];
  return pts;
}

/** One arm of a double Archimedean spiral that drains into the centre. */
function spiralArm(phase: number, entry: [number, number]): PathCmd[] {
  const cx = 640;
  const cy = 360;
  const r0 = 330;
  const k = 32;
  const cmds: PathCmd[] = [['M', entry[0], entry[1]]];
  for (let t = 0; t <= 8.6; t += 0.04) {
    const r = r0 - k * t;
    if (r < 58) break;
    const a = phase + t;
    cmds.push(['L', cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return cmds;
}

export const gridline: MapDef = {
  id: 'gridline',
  name: 'Gridline',
  tier: 'Beginner',
  blurb: 'One long, winding lane. Plenty of room to build.',
  paths: [
    rounded(
      [
        [-40, 130],
        [260, 130],
        [260, 330],
        [120, 330],
        [120, 560],
        [520, 560],
        [520, 250],
        [760, 250],
        [760, 600],
        [1000, 600],
        [1000, 130],
        [1150, 130],
        [1150, 420],
        [1330, 420],
      ],
      44,
    ),
  ],
  water: [],
  obstacles: [],
  unlock: null,
  accent: 0x2ff3ff,
};

export const unitCircle: MapDef = {
  id: 'unit-circle',
  name: 'Unit Circle',
  tier: 'Beginner',
  blurb: 'A long spiral that drains into the origin. Build in the rings.',
  paths: [
    [
      ['M', -40, 360],
      ['L', 340, 360],
      ['A', 640, 360, 300, 180, 360],
      ['A', 695, 360, 245, 0, 180],
      ['A', 640, 360, 190, 180, 360],
      ['A', 695, 360, 135, 0, 180],
      ['A', 640, 360, 80, 180, 360],
    ],
  ],
  water: [],
  obstacles: [],
  unlock: null,
  accent: 0xb45cff,
};

export const parallel: MapDef = {
  id: 'parallel',
  name: 'Parallel',
  tier: 'Intermediate',
  blurb: 'Two lanes that never meet. Shapes alternate between them.',
  paths: [
    rounded([[-40, 170], [300, 170], [300, 300], [620, 300], [620, 150], [960, 150], [960, 300], [1320, 300]], 40),
    rounded([[-40, 550], [300, 550], [300, 420], [620, 420], [620, 570], [960, 570], [960, 420], [1320, 420]], 40),
  ],
  water: [],
  obstacles: [],
  unlock: null,
  accent: 0x39ff88,
};

export const hypotenuseLake: MapDef = {
  id: 'hypotenuse',
  name: 'Hypotenuse Lake',
  tier: 'Intermediate',
  blurb: 'The lane rings a right-triangle lake. Water towers welcome.',
  paths: [rounded([[-40, 360], [250, 360], [250, 640], [960, 640], [500, 110], [1320, 110]], 46)],
  water: [
    { type: 'poly', points: [330, 255, 330, 575, 740, 575] },
    { type: 'circle', x: 1120, y: 430, r: 95 },
  ],
  obstacles: [],
  unlock: null,
  accent: 0x3db8ff,
};

export const monoliths: MapDef = {
  id: 'monoliths',
  name: 'Monoliths',
  tier: 'Advanced',
  blurb: 'Solid blocks stand between the lanes and block line of sight.',
  paths: [rounded([[-40, 600], [200, 600], [200, 140], [480, 140], [480, 580], [800, 580], [800, 140], [1080, 140], [1080, 500], [1320, 500]], 40)],
  water: [],
  obstacles: [
    { type: 'rect', x: 285, y: 250, w: 110, h: 250 },
    { type: 'rect', x: 575, y: 200, w: 130, h: 290 },
    { type: 'rect', x: 885, y: 250, w: 110, h: 250 },
    { type: 'rect', x: 1150, y: 200, w: 90, h: 200 },
  ],
  unlock: null,
  accent: 0xffb02e,
};

export const tangent: MapDef = {
  id: 'tangent',
  name: 'Tangent',
  tier: 'Advanced',
  blurb: 'A short S-curve that kisses three pools.',
  paths: [
    [
      ['M', -40, 360],
      ['L', 160, 360],
      ['A', 320, 360, 160, 180, 360],
      ['A', 640, 360, 160, 180, 0],
      ['A', 960, 360, 160, 180, 360],
      ['L', 1320, 360],
    ],
  ],
  water: [
    { type: 'circle', x: 320, y: 360, r: 105 },
    { type: 'circle', x: 640, y: 360, r: 105 },
    { type: 'circle', x: 960, y: 360, r: 105 },
  ],
  obstacles: [],
  unlock: 'first-boss',
  accent: 0x2ff3ff,
};

export const mobius: MapDef = {
  id: 'mobius',
  name: 'Möbius',
  tier: 'Advanced',
  blurb: 'The lane loops and crosses itself in the middle.',
  paths: [rounded([[-40, 560], [260, 560], [260, 160], [500, 160], [780, 560], [1020, 560], [1020, 160], [780, 160], [500, 560], [500, 760]], 50)],
  water: [],
  obstacles: [],
  unlock: 'medium-win',
  accent: 0xff4fd8,
};

export const kochSnowflake: MapDef = {
  id: 'koch',
  name: 'Koch Snowflake',
  tier: 'Advanced',
  blurb: 'A jagged fractal lane. Every corner is a choke point.',
  paths: [rounded([[-40, 590], ...koch(60, 590, 1220, 590, 2), [1330, 590]], 26)],
  water: [],
  obstacles: [],
  unlock: 'shatter-25k',
  accent: 0x9fe8ff,
};

export const archipelago: MapDef = {
  id: 'archipelago',
  name: 'Archipelago',
  tier: 'Expert',
  blurb: 'Mostly water. Fight over a handful of islands.',
  paths: [rounded([[-40, 140], [520, 140], [520, 600], [880, 600], [880, 140], [1320, 140]], 46)],
  water: [{ type: 'rect', x: 0, y: 0, w: 1280, h: 720 }],
  land: [
    { type: 'circle', x: 300, y: 330, r: 95 },
    { type: 'rect', x: 600, y: 230, w: 220, h: 260 },
    { type: 'circle', x: 1060, y: 360, r: 100 },
    { type: 'circle', x: 220, y: 600, r: 90 },
    { type: 'circle', x: 1120, y: 620, r: 70 },
  ],
  obstacles: [],
  unlock: 'medals-8',
  accent: 0x3db8ff,
};

export const vanishingPoint: MapDef = {
  id: 'vanishing',
  name: 'Vanishing Point',
  tier: 'Expert',
  blurb: 'Two lanes rush together into one short run.',
  paths: [rounded([[-40, 90], [420, 90], [640, 360], [1320, 360]], 60), rounded([[-40, 630], [420, 630], [640, 360], [1320, 360]], 60)],
  water: [],
  obstacles: [
    { type: 'rect', x: 760, y: 170, w: 120, h: 110 },
    { type: 'rect', x: 760, y: 440, w: 120, h: 110 },
  ],
  unlock: 'hard-win',
  accent: 0xff3d6e,
};

export const singularity: MapDef = {
  id: 'singularity',
  name: 'Singularity',
  tier: 'Expert',
  blurb: 'Two spiral arms feed a black hole. Tight rings, no mercy.',
  paths: [spiralArm(0, [1320, 360]), spiralArm(Math.PI, [-40, 360])],
  water: [],
  obstacles: [{ type: 'circle', x: 640, y: 360, r: 34 }],
  unlock: 'sphere',
  accent: 0xc0a0ff,
};
