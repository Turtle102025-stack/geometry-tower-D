export type SolidKind = 'cube' | 'octahedron' | 'dodecahedron' | 'icosahedron' | 'sphere';

export interface BossDef {
  key: string;
  name: string;
  solid: SolidKind;
  hp: number;
  speed: number;
  radius: number;
  color: number;
  /** Shapes it bursts into when destroyed. */
  children: { spec: string; count: number }[];
  /** Screen shake strength on death. */
  shake: number;
}

/** Bosses are Platonic solids, plus the final boss. Index in this array + 1 = Shape.kind. */
export const BOSSES: BossDef[] = [
  {
    key: 'cube',
    name: 'Cube',
    solid: 'cube',
    hp: 260,
    speed: 46,
    radius: 30,
    color: 0xff6a4d,
    children: [{ spec: 'oct', count: 6 }],
    shake: 8,
  },
  {
    key: 'octahedron',
    name: 'Octahedron',
    solid: 'octahedron',
    hp: 900,
    speed: 38,
    radius: 38,
    color: 0xff4fd8,
    children: [{ spec: 'cube', count: 3 }, { spec: 'oct.armor', count: 4 }],
    shake: 12,
  },
  {
    key: 'dodecahedron',
    name: 'Dodecahedron',
    solid: 'dodecahedron',
    hp: 2800,
    speed: 30,
    radius: 46,
    color: 0xffb02e,
    children: [{ spec: 'octahedron', count: 3 }, { spec: 'oct.regrow', count: 6 }],
    shake: 16,
  },
  {
    key: 'icosahedron',
    name: 'Icosahedron',
    solid: 'icosahedron',
    hp: 9500,
    speed: 24,
    radius: 54,
    color: 0x8cff3a,
    children: [{ spec: 'dodecahedron', count: 2 }, { spec: 'oct.shadow', count: 8 }],
    shake: 20,
  },
  {
    key: 'sphere',
    name: 'The Sphere',
    solid: 'sphere',
    hp: 55000,
    speed: 16,
    radius: 72,
    color: 0xffffff,
    children: [{ spec: 'icosahedron', count: 2 }, { spec: 'dodecahedron', count: 2 }],
    shake: 32,
  },
];

export const BOSS_INDEX: Record<string, number> = Object.fromEntries(BOSSES.map((b, i) => [b.key, i + 1]));
