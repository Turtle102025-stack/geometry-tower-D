import { Graphics } from 'pixi.js';
import { PALETTE, lighten, neonCircle, neonLine, neonPoly, neonStroke, regularPoly } from './neon';
import { rainbowColor } from './textures';

export interface TowerArt {
  base: Graphics;
  head: Graphics;
  /** Head rotates to face targets. */
  aims: boolean;
  /** Tier-4 glow aura. */
  aura: boolean;
  /** Head spins continuously (radians/sec) instead of aiming. */
  spin: number;
}

type ArtFn = (a: number, b: number, color: number) => TowerArt;

/** Platform shared by all towers: dim plate + tier pips. */
export function plate(g: Graphics, sides: number, r: number, color: number, a: number, b: number, rot = -Math.PI / 2): void {
  const pts = regularPoly(sides, r, rot);
  g.poly(pts).fill({ color: PALETTE.panel, alpha: 0.95 });
  neonPoly(g, pts, color, 1.6, 0.08, 0.7);
  // tier pips: path A on the left, path B on the right
  for (let i = 0; i < 4; i++) {
    const angA = Math.PI * (0.62 + i * 0.09);
    const angB = Math.PI * (0.38 - i * 0.09);
    const rr = r + 5;
    if (i < a) g.circle(Math.cos(angA) * rr, Math.sin(angA) * rr, 2).fill({ color: lighten(color, 0.4) });
    if (i < b) g.circle(Math.cos(angB) * rr, Math.sin(angB) * rr, 2).fill({ color: 0xffffff });
  }
}

function art(base: Graphics, head: Graphics, aims = true, aura = false, spin = 0): TowerArt {
  return { base, head, aims, aura, spin };
}

/** One pencil pointing along +x. */
function pencilShape(g: Graphics, ox: number, oy: number, ang: number, body: number, tip: 'graphite' | 'fine' | 'steel' | 'diamond', core: boolean, len = 1): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const P = (x: number, y: number): [number, number] => [ox + x * c - y * s, oy + x * s + y * c];
  const pts = (arr: [number, number][]) => arr.flatMap(([x, y]) => P(x * len, y));
  // eraser + ferrule
  g.poly(pts([[-14, -4], [-10, -4], [-10, 4], [-14, 4]])).fill({ color: 0xff7eb6 });
  g.poly(pts([[-10, -4.4], [-7, -4.4], [-7, 4.4], [-10, 4.4]])).fill({ color: 0xb8c4d6 });
  // body
  g.poly(pts([[-7, -4], [6, -4], [6, 4], [-7, 4]])).fill({ color: body, alpha: 0.95 });
  g.poly(pts([[-7, -4], [6, -4], [6, 4], [-7, 4]]));
  neonStroke(g, body, 1.2, 0.6);
  if (core) {
    const [x1, y1] = P(-7 * len, 0);
    const [x2, y2] = P(6 * len, 0);
    neonLine(g, x1, y1, x2, y2, 0xffffff, 1, 0.8);
  }
  // wood cone
  g.poly(pts([[6, -4], [13, -1.4], [13, 1.4], [6, 4]])).fill({ color: 0xf2c89b });
  const tipLen = tip === 'graphite' ? 3 : tip === 'fine' ? 6 : tip === 'steel' ? 6 : 9;
  const tipColor = tip === 'steel' ? 0xdfe8f5 : tip === 'diamond' ? 0xd8fbff : 0x3a3a50;
  g.poly(pts([[13, -1.4], [13 + tipLen, 0], [13, 1.4]])).fill({ color: tipColor });
  if (tip === 'diamond' || tip === 'steel') {
    g.poly(pts([[13, -1.4], [13 + tipLen, 0], [13, 1.4]]));
    neonStroke(g, tip === 'diamond' ? 0x7ff6ff : 0xffffff, 1, tip === 'diamond' ? 1.4 : 0.5);
  }
}

const pencilArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 6, 17, color, a, b, 0);
  if (b >= 1) {
    // speed chevrons on the plate
    for (const sx of [-1, 1]) {
      base.moveTo(-6, sx * 11).lineTo(-1, sx * 13).lineTo(4, sx * 11);
      neonStroke(base, color, 1, 0.4);
    }
  }
  const head = new Graphics();
  const tip = a >= 4 ? 'diamond' : a >= 3 ? 'steel' : a >= 1 ? 'fine' : 'graphite';
  const core = a >= 2;
  const count = b >= 4 ? 8 : b >= 3 ? 4 : b >= 2 ? 2 : 1;
  const spread = b >= 4 ? 1.2 : b >= 3 ? 0.55 : 0.2;
  for (let i = 0; i < count; i++) {
    const off = count === 1 ? 0 : spread * (i / (count - 1) - 0.5);
    const body = b >= 3 ? rainbowColor(i) : 0xffd23f;
    const oy = count === 2 ? (i === 0 ? -5 : 5) : 0;
    pencilShape(head, 0, oy, off, body, tip, core, b >= 4 ? 0.85 : 1);
  }
  if (a >= 4) {
    // diamond sparkle halo
    for (let k = 0; k < 4; k++) {
      const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(ang) * 22;
      const y = Math.sin(ang) * 22;
      head.poly([x, y - 3, x + 2, y, x, y + 3, x - 2, y]).fill({ color: 0xd8fbff });
    }
  }
  return art(base, head, true, a >= 4 || b >= 4);
};

const fallbackArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 8, 16, color, a, b);
  const head = new Graphics();
  neonCircle(head, 0, 0, 8, color, 2, 0.3);
  neonLine(head, 0, 0, 14, 0, color, 2);
  return art(base, head, true, a >= 4 || b >= 4);
};

const REGISTRY: Record<string, ArtFn> = {
  pencil: pencilArt,
};

export function registerTowerArt(id: string, fn: ArtFn): void {
  REGISTRY[id] = fn;
}

export function buildTowerArt(id: string, a: number, b: number, color: number): TowerArt {
  return (REGISTRY[id] ?? fallbackArt)(a, b, color);
}
