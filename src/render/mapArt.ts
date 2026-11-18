import { Container, Graphics } from 'pixi.js';
import type { Area, MapDef } from '../data/maps/types';
import { PATH_WIDTH, WORLD_H, WORLD_W } from '../sim/constants';
import type { Path } from '../sim/path';
import { PALETTE, lighten, neonStroke } from './neon';

function areaPath(g: Graphics, a: Area, pad = 0): Graphics {
  switch (a.type) {
    case 'rect':
      return g.roundRect(a.x - pad, a.y - pad, a.w + pad * 2, a.h + pad * 2, 6);
    case 'circle':
      return g.circle(a.x, a.y, a.r + pad);
    case 'poly':
      return g.poly(a.points);
  }
}

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function polyline(g: Graphics, p: Path): Graphics {
  g.moveTo(p.xs[0], p.ys[0]);
  for (let i = 2; i < p.count; i += 2) g.lineTo(p.xs[i], p.ys[i]);
  g.lineTo(p.xs[p.count - 1], p.ys[p.count - 1]);
  return g;
}

/** Static map art: blueprint grid, decorative construction marks, lanes, water and blocks. */
export function buildMapArt(map: MapDef, paths: Path[]): { root: Container; water: Graphics } {
  const root = new Container();
  const accent = map.accent;
  const g = new Graphics();
  root.addChild(g);
  // background
  g.rect(0, 0, WORLD_W, WORLD_H).fill({ color: PALETTE.bg });
  g.rect(0, 0, WORLD_W, WORLD_H).fill({ color: PALETTE.bg2, alpha: 0.6 });
  // vignette-ish bands
  for (let i = 0; i < 6; i++) g.rect(0, i * 6, WORLD_W, WORLD_H - i * 12).fill({ color: 0x000000, alpha: 0.025 });
  // grid
  for (let x = 0; x <= WORLD_W; x += 32) g.moveTo(x, 0).lineTo(x, WORLD_H);
  g.stroke({ width: 1, color: PALETTE.grid, alpha: 0.045 });
  for (let y = 0; y <= WORLD_H; y += 32) g.moveTo(0, y).lineTo(WORLD_W, y);
  g.stroke({ width: 1, color: PALETTE.grid, alpha: 0.045 });
  for (let x = 0; x <= WORLD_W; x += 128) g.moveTo(x, 0).lineTo(x, WORLD_H);
  for (let y = 0; y <= WORLD_H; y += 128) g.moveTo(0, y).lineTo(WORLD_W, y);
  g.stroke({ width: 1, color: PALETTE.grid, alpha: 0.11 });

  // decorative construction marks (compass arcs, dimension lines)
  const rnd = seeded(hashStr(map.id));
  const deco = new Graphics();
  root.addChild(deco);
  for (let i = 0; i < 9; i++) {
    const x = rnd() * WORLD_W;
    const y = rnd() * WORLD_H;
    const r = 30 + rnd() * 90;
    const a0 = rnd() * Math.PI * 2;
    deco.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r).arc(x, y, r, a0, a0 + 1 + rnd() * 2.5);
    deco.stroke({ width: 1, color: accent, alpha: 0.12 });
    deco.moveTo(x - 6, y).lineTo(x + 6, y).moveTo(x, y - 6).lineTo(x, y + 6).stroke({ width: 1, color: accent, alpha: 0.2 });
  }
  for (let i = 0; i < 5; i++) {
    const x = rnd() * (WORLD_W - 200) + 50;
    const y = rnd() * (WORLD_H - 60) + 30;
    const w = 60 + rnd() * 140;
    deco.moveTo(x, y).lineTo(x + w, y).moveTo(x, y - 5).lineTo(x, y + 5).moveTo(x + w, y - 5).lineTo(x + w, y + 5);
    deco.stroke({ width: 1, color: accent, alpha: 0.13 });
  }

  // water
  const water = new Graphics();
  root.addChild(water);
  for (const w of map.water) {
    areaPath(water, w).fill({ color: 0x0a3a6e, alpha: 0.75 });
    areaPath(water, w);
    neonStroke(water, 0x3db8ff, 2, 1);
  }
  // hatch lines inside water, clipped by drawing short dashes inside the area bounds
  const hatch = new Graphics();
  root.addChild(hatch);
  for (const w of map.water) {
    const b = areaBounds(w);
    for (let y = b.y + 10; y < b.y + b.h; y += 16) {
      for (let x = b.x + ((y / 16) % 2) * 12; x < b.x + b.w; x += 26) {
        if (insideArea(w, x, y) && insideArea(w, x + 12, y)) {
          hatch.moveTo(x, y).quadraticCurveTo(x + 6, y - 3, x + 12, y);
        }
      }
    }
  }
  hatch.stroke({ width: 1.2, color: 0x7fd8ff, alpha: 0.35 });

  // lanes
  const lane = new Graphics();
  root.addChild(lane);
  for (const p of paths) {
    polyline(lane, p).stroke({ width: PATH_WIDTH + 14, color: accent, alpha: 0.06, join: 'round', cap: 'round' });
    polyline(lane, p).stroke({ width: PATH_WIDTH + 4, color: accent, alpha: 0.75, join: 'round', cap: 'round' });
    polyline(lane, p).stroke({ width: PATH_WIDTH, color: 0x040a18, alpha: 1, join: 'round', cap: 'round' });
    polyline(lane, p).stroke({ width: PATH_WIDTH - 10, color: lighten(PALETTE.bg2, 0.05), alpha: 0.5, join: 'round', cap: 'round' });
  }
  // direction chevrons
  for (const p of paths) {
    for (let d = 60; d < p.length - 30; d += 90) {
      const i = Math.floor(d / 3);
      if (i + 2 >= p.count) break;
      const x = p.xs[i];
      const y = p.ys[i];
      const ang = Math.atan2(p.ys[i + 2] - y, p.xs[i + 2] - x);
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      lane.moveTo(x - c * 5 - s * 7, y - s * 5 + c * 7).lineTo(x + c * 4, y + s * 4).lineTo(x - c * 5 + s * 7, y - s * 5 - c * 7);
    }
    lane.stroke({ width: 2, color: accent, alpha: 0.22, cap: 'round', join: 'round' });
  }

  // obstacles: solid blueprint blocks with section hatching
  const obs = new Graphics();
  root.addChild(obs);
  for (const o of map.obstacles) {
    areaPath(obs, o, 0).fill({ color: 0x000000, alpha: 0.45 });
    areaPath(obs, o, -2).fill({ color: 0x0d1a38, alpha: 1 });
    const b = areaBounds(o);
    for (let k = -b.h; k < b.w; k += 12) {
      const x1 = b.x + k;
      const y1 = b.y + b.h;
      const x2 = b.x + k + b.h;
      const y2 = b.y;
      // clip roughly by sampling
      let started = false;
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const x = x1 + (x2 - x1) * t;
        const y = y1 + (y2 - y1) * t;
        if (insideArea(o, x, y)) {
          if (!started) obs.moveTo(x, y);
          else obs.lineTo(x, y);
          started = true;
        } else started = false;
      }
    }
    obs.stroke({ width: 1, color: accent, alpha: 0.25 });
    areaPath(obs, o, 0);
    neonStroke(obs, lighten(accent, 0.2), 2, 1);
  }

  // entry / exit markers
  const marks = new Graphics();
  root.addChild(marks);
  for (const p of paths) {
    const ex = p.xs[p.count - 1];
    const ey = p.ys[p.count - 1];
    const cx = Math.max(16, Math.min(WORLD_W - 16, ex));
    const cy = Math.max(16, Math.min(WORLD_H - 16, ey));
    marks.circle(cx, cy, 22).fill({ color: 0xff3d6e, alpha: 0.12 });
    marks.circle(cx, cy, 22);
    neonStroke(marks, 0xff3d6e, 1.6, 0.8);
  }
  return { root, water };
}

function areaBounds(a: Area): { x: number; y: number; w: number; h: number } {
  switch (a.type) {
    case 'rect':
      return a;
    case 'circle':
      return { x: a.x - a.r, y: a.y - a.r, w: a.r * 2, h: a.r * 2 };
    case 'poly': {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < a.points.length; i += 2) {
        x0 = Math.min(x0, a.points[i]);
        x1 = Math.max(x1, a.points[i]);
        y0 = Math.min(y0, a.points[i + 1]);
        y1 = Math.max(y1, a.points[i + 1]);
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
  }
}

function insideArea(a: Area, x: number, y: number): boolean {
  switch (a.type) {
    case 'rect':
      return x >= a.x + 3 && x <= a.x + a.w - 3 && y >= a.y + 3 && y <= a.y + a.h - 3;
    case 'circle':
      return (x - a.x) ** 2 + (y - a.y) ** 2 <= (a.r - 4) ** 2;
    case 'poly': {
      const p = a.points;
      let inside = false;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        const xi = p[i];
        const yi = p[i + 1];
        const xj = p[j];
        const yj = p[j + 1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
  }
}
