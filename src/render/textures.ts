import { Graphics, Rectangle, Texture, type Renderer } from 'pixi.js';
import { RANKS, splitCount } from '../data/shapes';
import { MOD } from '../sim/types';
import { PALETTE, dashedPoly, lighten, neonCircle, neonLine, neonPoly, neonStroke, regularPoly } from './neon';

/** Modifiers that change a shape's base texture (regrow is drawn as an animated halo). */
export const VISUAL_MODS = MOD.ARMOR | MOD.GHOST | MOD.CRYSTAL | MOD.SHADOW | MOD.SPLIT;

const RES = 2;

/**
 * Every shape/projectile/particle look is drawn once with vector Graphics, baked into a
 * texture, and then rendered as cheap batched sprites.
 */
export class TextureBank {
  private shapes = new Map<number, Texture>();
  private projs = new Map<string, Texture>();
  readonly glow: Texture;
  readonly ring: Texture;
  readonly shard: Texture;
  readonly spark: Texture;
  readonly dot: Texture;
  readonly square: Texture;

  constructor(private renderer: Renderer) {
    this.glow = this.bake(this.radialGlow(), 40);
    this.ring = this.bake(new Graphics().circle(0, 0, 30).stroke({ width: 3, color: 0xffffff }), 34);
    this.shard = this.bake(new Graphics().poly([-7, -1.6, 7, 0, -7, 1.6]).fill({ color: 0xffffff }), 8);
    this.spark = this.bake(new Graphics().circle(0, 0, 2.2).fill({ color: 0xffffff }).circle(0, 0, 4).fill({ color: 0xffffff, alpha: 0.3 }), 5);
    this.dot = this.bake(new Graphics().circle(0, 0, 3).fill({ color: 0xffffff }), 4);
    this.square = this.bake(new Graphics().rect(-4, -4, 8, 8).fill({ color: 0xffffff }), 4);
  }

  private radialGlow(): Graphics {
    const g = new Graphics();
    for (let i = 10; i >= 1; i--) g.circle(0, 0, i * 3.6).fill({ color: 0xffffff, alpha: 0.05 + (10 - i) * 0.012 });
    return g;
  }

  /** Bakes a graphics object centred on (0,0) within a square of half-size `half`. */
  bake(g: Graphics, half: number, res = RES): Texture {
    const t = this.renderer.generateTexture({
      target: g,
      resolution: res,
      antialias: true,
      frame: new Rectangle(-half, -half, half * 2, half * 2),
    });
    g.destroy();
    return t;
  }

  shape(rank: number, mods: number): Texture {
    const key = rank * 64 + (mods & VISUAL_MODS);
    let t = this.shapes.get(key);
    if (!t) {
      t = this.bake(drawShape(rank, mods & VISUAL_MODS), 34);
      this.shapes.set(key, t);
    }
    return t;
  }

  projectile(style: string): Texture {
    let t = this.projs.get(style);
    if (!t) {
      const [g, half] = drawProjectile(style);
      t = this.bake(g, half);
      this.projs.set(style, t);
    }
    return t;
  }
}

export function drawShape(rank: number, mods: number): Graphics {
  const def = RANKS[rank];
  const r = def.radius;
  const g = new Graphics();
  const pts = regularPoly(rank, r);
  const ghost = (mods & MOD.GHOST) !== 0;
  let stroke = def.color;
  if (mods & MOD.CRYSTAL) {
    stroke = 0xe8fbff;
    g.poly(pts).fill({ color: 0xcff6ff, alpha: ghost ? 0.15 : 0.5 });
    // facets
    for (let i = 0; i < rank; i++) g.moveTo(0, 0).lineTo(pts[i * 2], pts[i * 2 + 1]);
    g.stroke({ width: 1, color: 0xffffff, alpha: 0.55 });
    g.poly(regularPoly(rank, r * 0.45)).stroke({ width: 1, color: PALETTE.ice, alpha: 0.7 });
  } else if (mods & MOD.SHADOW) {
    stroke = PALETTE.shadowRim;
    g.poly(pts).fill({ color: 0x020205, alpha: ghost ? 0.4 : 0.96 });
    // faint rank-color inner rim so the rank still reads
    g.poly(regularPoly(rank, r - 3)).stroke({ width: 1.2, color: def.color, alpha: 0.45 });
  } else {
    g.poly(pts).fill({ color: def.color, alpha: ghost ? 0.06 : 0.2 });
    g.poly(regularPoly(rank, r * 0.55)).stroke({ width: 1, color: def.color, alpha: ghost ? 0.2 : 0.4 });
  }
  if (ghost) {
    g.poly(pts).stroke({ width: 5, color: stroke, alpha: 0.08 });
    dashedPoly(g, pts, 5, 4);
    g.stroke({ width: 2.4, color: stroke, alpha: 0.9, cap: 'round' });
  } else {
    g.poly(pts);
    neonStroke(g, stroke, 2.4, 1);
  }
  if (mods & MOD.ARMOR) {
    // steel plates bolted onto every side
    const inset = regularPoly(rank, r - 1.5);
    for (let i = 0; i < rank; i++) {
      const x1 = inset[i * 2];
      const y1 = inset[i * 2 + 1];
      const x2 = inset[((i + 1) % rank) * 2];
      const y2 = inset[((i + 1) % rank) * 2 + 1];
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const ax = x1 + (x2 - x1) * 0.15;
      const ay = y1 + (y2 - y1) * 0.15;
      const bx = x1 + (x2 - x1) * 0.85;
      const by = y1 + (y2 - y1) * 0.85;
      g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 5.5, color: 0x5d6b80, alpha: 1, cap: 'round' });
      g.moveTo(ax, ay).lineTo(bx, by).stroke({ width: 3, color: PALETTE.steel, alpha: 1, cap: 'round' });
      g.circle(mx, my, 1.4).fill({ color: 0x2a3344 });
    }
    g.poly(pts).stroke({ width: 1.2, color: 0xffffff, alpha: 0.7 });
  }
  if (splitCount(rank, mods) >= 2) {
    // fracture lines
    const a = 0.4 + rank * 0.3;
    const x1 = Math.cos(a) * r * 0.85;
    const y1 = Math.sin(a) * r * 0.85;
    g.moveTo(-x1, -y1)
      .lineTo(-x1 * 0.3 + y1 * 0.18, -y1 * 0.3 - x1 * 0.18)
      .lineTo(x1 * 0.25 - y1 * 0.15, y1 * 0.25 + x1 * 0.15)
      .lineTo(x1, y1)
      .stroke({ width: 1.6, color: 0xffffff, alpha: 0.85, cap: 'round', join: 'round' });
  }
  return g;
}

const RAINBOW = [0xff3d6e, 0xff8a1f, 0xffe23d, 0x39ff88, 0x3db8ff, 0xb45cff];

/** Projectile looks. All point along +x. Returns graphics and half-size. */
export function drawProjectile(style: string): [Graphics, number] {
  const g = new Graphics();
  switch (style) {
    case 'pencil':
    case 'steel':
    case 'color': {
      const body = style === 'color' ? 0xffffff : 0xffd23f;
      g.rect(-9, -2.2, 12, 4.4).fill({ color: body, alpha: 0.9 });
      g.poly([3, -2.2, 9, 0, 3, 2.2]).fill({ color: 0xf2c89b });
      g.poly([7, -0.8, 10, 0, 7, 0.8]).fill({ color: style === 'steel' ? 0xdfe8f5 : 0x333344 });
      g.rect(-9, -2.2, 12, 4.4).stroke({ width: 0.8, color: lighten(body, 0.5) });
      return [g, 12];
    }
    case 'diamond':
      g.poly([-14, 0, 0, -4, 14, 0, 0, 4]).fill({ color: 0xd8fbff, alpha: 0.9 });
      g.poly([-14, 0, 0, -4, 14, 0, 0, 4]);
      neonStroke(g, 0x7ff6ff, 1.4);
      return [g, 18];
    case 'rainbow':
      g.rect(-9, -2.2, 12, 4.4).fill({ color: 0xffffff });
      g.poly([3, -2.2, 10, 0, 3, 2.2]).fill({ color: 0xffffff, alpha: 0.85 });
      return [g, 12];
    case 'dot':
      g.circle(0, 0, 3.2).fill({ color: 0xffffff });
      g.circle(0, 0, 5.5).fill({ color: 0x5ff3ff, alpha: 0.35 });
      return [g, 7];
    case 'bigdot':
      g.circle(0, 0, 4.5).fill({ color: 0xffffff });
      g.circle(0, 0, 8).fill({ color: 0x5ff3ff, alpha: 0.35 });
      return [g, 10];
    case 'needle':
      g.moveTo(-8, 0).lineTo(8, 0).stroke({ width: 1.6, color: 0xdfe8f5 });
      g.circle(-8, 0, 1.6).fill({ color: 0xffffff });
      return [g, 10];
    case 'hotneedle':
      g.moveTo(-8, 0).lineTo(9, 0);
      neonStroke(g, 0xff7a3d, 1.6);
      return [g, 12];
    case 'shell':
      g.roundRect(-8, -5, 16, 10, 2).fill({ color: 0xff7eb6 });
      g.rect(-8, -5, 7, 10).fill({ color: 0x4fb3ff });
      g.roundRect(-8, -5, 16, 10, 2).stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
      return [g, 10];
    case 'crumb':
      g.roundRect(-4, -3, 8, 6, 1).fill({ color: 0xff9ec8 });
      return [g, 6];
    case 'arrow':
      g.moveTo(-14, 0).lineTo(10, 0);
      neonStroke(g, 0x8cff3a, 2);
      g.poly([14, 0, 6, -5, 6, 5]).fill({ color: 0xd8ffb0 });
      return [g, 18];
    case 'bigarrow':
      g.moveTo(-18, 0).lineTo(12, 0);
      neonStroke(g, 0xffffff, 3.2);
      g.poly([20, 0, 8, -8, 8, 8]).fill({ color: 0xffffff });
      return [g, 24];
    case 'minarrow':
      g.moveTo(-7, 0).lineTo(5, 0).stroke({ width: 1.6, color: 0xb8ff7a });
      g.poly([8, 0, 3, -3, 3, 3]).fill({ color: 0xd8ffb0 });
      return [g, 10];
    case 'shard':
      g.poly([-6, 0, 0, -3, 7, 0, 0, 3]).fill({ color: 0xcff6ff, alpha: 0.9 });
      g.poly([-6, 0, 0, -3, 7, 0, 0, 3]).stroke({ width: 1, color: 0xffffff });
      return [g, 9];
    case 'line':
      g.moveTo(-26, 0).lineTo(26, 0);
      neonStroke(g, 0x5ff3ff, 2.6);
      return [g, 30];
    case 'cannon':
      neonCircle(g, 0, 0, 4.5, 0xffb02e, 1.4, 0.6);
      return [g, 9];
    case 'pi':
      g.moveTo(-5, -4).lineTo(5, -4).moveTo(-2.5, -4).lineTo(-3, 5).moveTo(2.5, -4).lineTo(3, 5);
      neonStroke(g, 0xffd23f, 1.6);
      return [g, 10];
    case 'boat':
      g.moveTo(-8, 0).lineTo(8, 0).stroke({ width: 2, color: 0xffe9a8 });
      g.poly([11, 0, 6, -3, 6, 3]).fill({ color: 0xffffff });
      return [g, 12];
    case 'energy':
      g.circle(0, 0, 3).fill({ color: 0xffffff });
      g.circle(0, 0, 6).fill({ color: 0xff4fd8, alpha: 0.35 });
      return [g, 8];
    default:
      neonLine(g, -6, 0, 6, 0, 0xffffff, 2);
      return [g, 9];
  }
}

export function rainbowColor(i: number): number {
  return RAINBOW[((i % RAINBOW.length) + RAINBOW.length) % RAINBOW.length];
}

export { neonPoly };
