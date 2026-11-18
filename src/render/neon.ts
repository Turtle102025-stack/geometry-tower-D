import type { Graphics } from 'pixi.js';

/** Shared neon-blueprint palette. */
export const PALETTE = {
  bg: 0x060d1f,
  bg2: 0x0a1838,
  grid: 0x2ff3ff,
  cyan: 0x2ff3ff,
  panel: 0x0b1530,
  white: 0xffffff,
  steel: 0xc8d3e6,
  ice: 0x9fe8ff,
  shadowRim: 0x8c7ab8,
};

export function lighten(color: number, amt: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const f = (c: number) => Math.min(255, Math.round(c + (255 - c) * amt));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

export function darken(color: number, amt: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const f = (c: number) => Math.round(c * (1 - amt));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

export function regularPoly(sides: number, r: number, rot = -Math.PI / 2, cx = 0, cy = 0): number[] {
  const pts: number[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

/** Layered strokes that read as a glowing neon tube. Call after building a path. */
export function neonStroke(g: Graphics, color: number, width = 2, glow = 1): Graphics {
  if (glow > 0) {
    g.stroke({ width: width + 7 * glow, color, alpha: 0.1, join: 'round', cap: 'round' });
    g.stroke({ width: width + 3.5 * glow, color, alpha: 0.22, join: 'round', cap: 'round' });
  }
  g.stroke({ width, color, alpha: 1, join: 'round', cap: 'round' });
  g.stroke({ width: Math.max(0.6, width * 0.38), color: lighten(color, 0.75), alpha: 0.85, join: 'round', cap: 'round' });
  return g;
}

export function neonPoly(g: Graphics, pts: number[], color: number, width = 2, fillAlpha = 0.16, glow = 1): Graphics {
  if (fillAlpha > 0) g.poly(pts).fill({ color, alpha: fillAlpha });
  g.poly(pts);
  return neonStroke(g, color, width, glow);
}

export function neonCircle(g: Graphics, x: number, y: number, r: number, color: number, width = 2, fillAlpha = 0.14, glow = 1): Graphics {
  if (fillAlpha > 0) g.circle(x, y, r).fill({ color, alpha: fillAlpha });
  g.circle(x, y, r);
  return neonStroke(g, color, width, glow);
}

export function neonLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, width = 2, glow = 1): Graphics {
  g.moveTo(x1, y1).lineTo(x2, y2);
  return neonStroke(g, color, width, glow);
}

/** Dashed closed polygon outline (used for ghosts). */
export function dashedPoly(g: Graphics, pts: number[], dash: number, gap: number): Graphics {
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const x1 = pts[i * 2];
    const y1 = pts[i * 2 + 1];
    const x2 = pts[((i + 1) % n) * 2];
    const y2 = pts[((i + 1) % n) * 2 + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    for (let d = 0; d < len; d += dash + gap) {
      const e = Math.min(len, d + dash);
      g.moveTo(x1 + ux * d, y1 + uy * d).lineTo(x1 + ux * e, y1 + uy * e);
    }
  }
  return g;
}
