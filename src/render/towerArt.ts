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


const plotterArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 4, 17, color, a, b, Math.PI / 4);
  if (b >= 3) {
    // graph grid on the plate
    for (let k = -8; k <= 8; k += 4) base.moveTo(k, -9).lineTo(k, 9).moveTo(-9, k).lineTo(9, k);
    base.stroke({ width: 0.8, color, alpha: 0.35 });
  }
  const head = new Graphics();
  const axis = b >= 1 ? 15 : 11;
  // axes
  neonLine(head, -axis, 0, axis, 0, color, 1.4, 0.5);
  neonLine(head, 0, -axis, 0, axis, color, 1.4, 0.5);
  head.poly([axis + 4, 0, axis, -2.5, axis, 2.5]).fill({ color });
  head.poly([0, -axis - 4, -2.5, -axis, 2.5, -axis]).fill({ color });
  // barrels
  const barrels = a >= 3 ? 3 : a >= 1 ? 2 : 1;
  for (let i = 0; i < barrels; i++) {
    const oy = barrels === 1 ? 0 : (i - (barrels - 1) / 2) * 5;
    head.roundRect(2, oy - 2, a >= 2 ? 16 : 13, 4, 2).fill({ color: 0x0b1530 });
    head.roundRect(2, oy - 2, a >= 2 ? 16 : 13, 4, 2);
    neonStroke(head, lighten(color, 0.3), 1.2, 0.6);
  }
  neonCircle(head, 0, 0, 5, color, 1.6, 0.5);
  if (b >= 2) {
    // scope
    neonCircle(head, -6, -8, 4, 0x39ff88, 1.2, 0.2);
    head.moveTo(-10, -8).lineTo(-2, -8).moveTo(-6, -12).lineTo(-6, -4).stroke({ width: 0.8, color: 0x39ff88 });
  }
  if (b >= 4) neonLine(head, 4, 0, 30, 0, 0xffffff, 2.4, 1.4);
  if (a >= 4) {
    for (let k = 0; k < 14; k++) {
      const ang = (k / 14) * Math.PI * 2;
      head.circle(Math.cos(ang) * 21, Math.sin(ang) * 21, 1.6).fill({ color: lighten(color, 0.5) });
    }
  }
  return art(base, head, true, a >= 4 || b >= 4);
};

const compassArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 8, 17, color, a, b);
  if (b >= 4) {
    // spirograph curve etched on the plate
    const pts: number[] = [];
    for (let t = 0; t <= Math.PI * 2 * 5 + 0.01; t += 0.08) {
      const R = 10;
      const r = 3.6;
      const d = 6;
      pts.push((R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t), (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t));
    }
    base.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) base.lineTo(pts[i], pts[i + 1]);
    neonStroke(base, 0xff4fd8, 1, 0.6);
  }
  const head = new Graphics();
  const hot = b >= 2 ? 0xff7a3d : 0xdfe8f5;
  // legs: a V of two compass legs from the hinge
  const legs = a >= 3 ? 4 : 2;
  for (let i = 0; i < legs; i++) {
    const ang = (i / legs) * Math.PI * 2 + 0.4;
    const L = a >= 2 ? 17 : 14;
    neonLine(head, 0, 0, Math.cos(ang) * L, Math.sin(ang) * L, hot, 2, b >= 2 ? 1 : 0.4);
    head.circle(Math.cos(ang) * L, Math.sin(ang) * L, 1.6).fill({ color: 0xffffff });
  }
  // needle studs (more needles with path A)
  const studs = a >= 1 ? 12 : 8;
  for (let k = 0; k < studs; k++) {
    const ang = (k / studs) * Math.PI * 2;
    head.moveTo(Math.cos(ang) * 8, Math.sin(ang) * 8).lineTo(Math.cos(ang) * 11, Math.sin(ang) * 11);
  }
  head.stroke({ width: 1, color: hot, alpha: 0.8 });
  neonCircle(head, 0, 0, 5.5, color, 2, 0.5);
  head.circle(0, 0, 2).fill({ color: 0xffffff });
  if (a >= 4) neonCircle(head, 0, 0, 22, color, 1.2, 0, 0.6);
  return art(base, head, false, a >= 4 || b >= 4, b >= 4 ? 4 : b >= 1 ? 1.6 : 1.1);
};

const eraserArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 4, 19, color, a, b, 0);
  if (b >= 1) {
    // reload springs
    for (const sx of [-12, 12]) {
      base.moveTo(sx, -8);
      for (let k = 0; k < 6; k++) base.lineTo(sx + (k % 2 ? 2.5 : -2.5), -8 + k * 3);
      base.stroke({ width: 1, color: 0xc8d3e6, alpha: 0.8 });
    }
  }
  const head = new Graphics();
  const tubes = b >= 4 ? 3 : 1;
  for (let i = 0; i < tubes; i++) {
    const oy = tubes === 1 ? 0 : (i - 1) * 9;
    head.roundRect(-2, oy - 3.5, 18, 7, 2).fill({ color: 0x18264a });
    head.roundRect(-2, oy - 3.5, 18, 7, 2);
    neonStroke(head, 0xc8d3e6, 1.2, 0.5);
  }
  // the eraser itself
  const w = a >= 3 ? 20 : a >= 1 ? 17 : 15;
  const hh = a >= 3 ? 14 : a >= 1 ? 12 : 10;
  head.roundRect(-w / 2 - 4, -hh / 2, w, hh, 3).fill({ color: 0xff7eb6 });
  head.rect(-w / 2 - 4, -hh / 2, w * 0.42, hh).fill({ color: 0x4fb3ff });
  head.roundRect(-w / 2 - 4, -hh / 2, w, hh, 3);
  neonStroke(head, color, 1.4, a >= 4 ? 1.4 : 0.6);
  if (a >= 3) {
    head.rect(-w / 2 - 4 + w * 0.42, -hh / 2, 2.5, hh).fill({ color: 0xc8d3e6 });
    head.rect(-w / 2 - 4 + w * 0.75, -hh / 2, 2.5, hh).fill({ color: 0xc8d3e6 });
  }
  if (b >= 3) {
    for (let k = 0; k < 5; k++) head.rect(-12 + k * 3, hh / 2 + 2, 2, 2).fill({ color: 0xff9ec8 });
  }
  if (a >= 4) {
    head.moveTo(-w / 2 - 6, -hh / 2 - 4).lineTo(w / 2 - 2, -hh / 2 - 4);
    neonStroke(head, 0xffffff, 1, 1);
  }
  return art(base, head, true, a >= 4 || b >= 4);
};

const iceArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 6, 18, color, a, b);
  if (a >= 2) {
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      const x = Math.cos(ang) * 20;
      const y = Math.sin(ang) * 20;
      base.poly([x, y, x + Math.cos(ang + 1.9) * 4, y + Math.sin(ang + 1.9) * 4, x + Math.cos(ang) * 6, y + Math.sin(ang) * 6]).fill({ color: 0xcff6ff, alpha: 0.8 });
    }
  }
  const head = new Graphics();
  // isometric cube
  const s = a >= 3 ? 11 : a >= 1 ? 10 : 9;
  const top = [0, -s, s * 0.87, -s / 2, 0, 0, -s * 0.87, -s / 2];
  const left = [-s * 0.87, -s / 2, 0, 0, 0, s, -s * 0.87, s / 2];
  const right = [s * 0.87, -s / 2, s * 0.87, s / 2, 0, s, 0, 0];
  const glow = a >= 4 ? 0xffffff : color;
  head.poly(top).fill({ color: 0xe8fbff, alpha: 0.75 });
  head.poly(left).fill({ color: 0x7fd8ff, alpha: 0.55 });
  head.poly(right).fill({ color: 0x3db8ff, alpha: 0.55 });
  for (const f of [top, left, right]) {
    head.poly(f);
    neonStroke(head, glow, 1.3, a >= 4 ? 1.6 : 0.7);
  }
  if (b >= 1) {
    head.moveTo(-3, -4).lineTo(1, 0).lineTo(-1, 4).stroke({ width: 1, color: 0xffffff, alpha: 0.9 });
  }
  if (b >= 2) {
    for (const x of [-6, 0, 6]) head.poly([x - 1.5, s + 1, x + 1.5, s + 1, x, s + 6]).fill({ color: 0xcff6ff });
  }
  if (b >= 4 || a >= 4) {
    // snowflake halo
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      head.moveTo(Math.cos(ang) * 15, Math.sin(ang) * 15).lineTo(Math.cos(ang) * 23, Math.sin(ang) * 23);
    }
    neonStroke(head, b >= 4 ? 0xcff6ff : 0xffffff, 1.2, 0.8);
  }
  return art(base, head, false, a >= 4 || b >= 4, 0.25);
};

const vectorArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 3, 19, color, a, b, -Math.PI / 2);
  const head = new Graphics();
  const thick = a >= 4 ? 3.4 : a >= 3 ? 2.6 : a >= 1 ? 2.2 : 1.8;
  const len = a >= 3 ? 24 : 20;
  head.roundRect(-10, -4, 18, 8, 2).fill({ color: 0x0b1530 });
  head.roundRect(-10, -4, 18, 8, 2);
  neonStroke(head, color, 1.2, 0.5);
  const arrowColor = a >= 4 ? 0xffffff : lighten(color, 0.3);
  neonLine(head, -12, 0, len - 4, 0, arrowColor, thick, a >= 4 ? 1.6 : 0.9);
  head.poly([len + 4, 0, len - 5, -5 - thick, len - 5, 5 + thick]).fill({ color: arrowColor });
  if (a >= 2) head.poly([len + 4, 0, len - 5, -5 - thick, len - 5, 5 + thick]).stroke({ width: 1, color: 0xffffff });
  if (b >= 1) {
    neonCircle(head, -4, -8, 3.5, 0x39ff88, 1.1, 0.25);
  }
  if (b >= 3) {
    // split arrowheads
    for (const sy of [-1, 1]) {
      head.moveTo(len - 6, sy * 4).lineTo(len + 2, sy * 11);
      head.poly([len + 4, sy * 13, len - 1, sy * 8, len + 1, sy * 14]).fill({ color: arrowColor });
    }
    head.stroke({ width: 1.4, color: arrowColor });
  }
  if (b >= 4) {
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const x = Math.cos(ang) * 22;
      const y = Math.sin(ang) * 22;
      head.moveTo(x, y).lineTo(x + Math.cos(ang) * 5, y + Math.sin(ang) * 5);
    }
    neonStroke(head, color, 1.2, 0.6);
  }
  return art(base, head, true, a >= 4 || b >= 4);
};

const laserArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 8, 18, color, a, b, Math.PI / 8);
  if (b >= 2) {
    for (let k = 0; k < 3; k++) neonCircle(base, 0, 0, 9 + k * 3, 0xff7a3d, 0.8, 0, 0.3);
  }
  const head = new Graphics();
  const lenses = a >= 3 ? 4 : a >= 2 ? 2 : 1;
  for (let i = 0; i < lenses; i++) {
    const oy = lenses === 1 ? 0 : (i - (lenses - 1) / 2) * 6;
    head.roundRect(-11, oy - 3, 22, 6, 3).fill({ color: 0x1a1030 });
    head.roundRect(-11, oy - 3, 22, 6, 3);
    neonStroke(head, b >= 3 ? 0xdfe8f5 : color, 1.2, 0.5);
    head.circle(12, oy, 2.4).fill({ color: 0xffffff });
    head.circle(12, oy, 4.5).fill({ color, alpha: 0.4 });
  }
  if (b >= 3) {
    for (const sy of [-1, 1]) head.poly([-6, sy * 4, 2, sy * 4, -2, sy * 9]).fill({ color: 0xc8d3e6, alpha: 0.9 });
  }
  if (a >= 4) {
    // prism
    head.poly([14, -9, 24, 0, 14, 9]).fill({ color: 0xffffff, alpha: 0.25 });
    head.poly([14, -9, 24, 0, 14, 9]);
    neonStroke(head, 0xffffff, 1.4, 1.2);
    for (let k = 0; k < 6; k++) head.moveTo(22, 0).lineTo(30, (k - 2.5) * 3).stroke({ width: 1.2, color: rainbowColor(k) });
  }
  if (b >= 4) {
    neonCircle(head, 13, 0, 7, 0xffffff, 1.6, 0.25, 1.4);
  }
  return art(base, head, true, a >= 4 || b >= 4);
};

const projectorArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 4, 19, color, a, b, Math.PI / 4);
  const head = new Graphics();
  // light cone
  const reach = a >= 4 ? 34 : a >= 2 ? 28 : a >= 1 ? 24 : 20;
  const spread = a >= 4 ? 16 : 10;
  head.poly([6, -4, reach, -spread, reach, spread, 6, 4]).fill({ color, alpha: a >= 4 ? 0.35 : 0.2 });
  // box + lens
  head.roundRect(-10, -8, 16, 16, 3).fill({ color: 0x14203f });
  head.roundRect(-10, -8, 16, 16, 3);
  neonStroke(head, color, 1.4, 0.6);
  neonCircle(head, 6, 0, a >= 2 ? 5 : 4, 0xffffff, 1.2, 0.6, a >= 3 ? 1.2 : 0.6);
  if (b >= 1) head.circle(-4, -11, 2).fill({ color: 0xff4fd8 });
  if (b >= 2) {
    head.roundRect(-14, 6, 10, 4, 2).fill({ color: 0xffe23d });
  }
  if (b >= 4) neonCircle(head, 0, 0, 18, 0xffffff, 1.2, 0, 0.8);
  return art(base, head, false, a >= 4 || b >= 4, 0.5);
};

const chalkboardArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  base.roundRect(-24, -20, 48, 40, 4).fill({ color: PALETTE.panel, alpha: 0.95 });
  base.roundRect(-24, -20, 48, 40, 4);
  neonStroke(base, color, 1.6, 0.7);
  for (let i = 0; i < a; i++) base.circle(-20 + i * 5, 24, 2).fill({ color: lighten(color, 0.4) });
  for (let i = 0; i < b; i++) base.circle(20 - i * 5, 24, 2).fill({ color: 0xffffff });
  const head = new Graphics();
  head.rect(-19, -15, 38, 26).fill({ color: 0x123826 });
  head.rect(-19, -15, 38, 26).stroke({ width: 2, color: 0xc89a5a });
  // chalk scribbles: more formulas with path A
  const chalk = 0xf2fff6;
  const lines = 2 + a;
  for (let i = 0; i < Math.min(5, lines); i++) {
    const y = -11 + i * 5;
    let x = -15;
    head.moveTo(x, y);
    for (let k = 0; k < 6 + ((i * 3) % 4); k++) {
      x += 3.5;
      head.lineTo(x, y + (k % 2 ? -1.5 : 1));
    }
  }
  head.stroke({ width: 0.9, color: chalk, alpha: 0.85 });
  if (b >= 2) {
    head.moveTo(10, -10).lineTo(10, -2).stroke({ width: 1, color: 0xffd23f });
    head.circle(10, -6, 2.5).stroke({ width: 1, color: 0xffd23f });
  }
  if (b >= 3) {
    head.ellipse(-12, 6, 4, 2.4).stroke({ width: 1, color: 0x39ff88 });
    head.circle(-12, 6, 1).fill({ color: 0x39ff88 });
  }
  if (b >= 4) head.rect(10, 3, 5, 5).fill({ color: 0xffffff });
  if (a >= 4) {
    head.rect(-19, -15, 38, 26);
    neonStroke(head, color, 1.4, 1.4);
  }
  return art(base, head, false, a >= 4 || b >= 4, 0);
};

const goldenArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 10, 19, color, a, b);
  if (b >= 1) {
    for (let k = 0; k < Math.min(4, b + 1); k++) base.ellipse(14, 10 - k * 3, 5, 2).fill({ color: 0xffd23f }).ellipse(14, 10 - k * 3, 5, 2).stroke({ width: 0.8, color: 0x8a6a00 });
  }
  if (b >= 4) neonCircle(base, 0, 0, 21, 0xffd23f, 1.2, 0, 0.8);
  const head = new Graphics();
  // golden rectangles + spiral
  const phi = 1.618;
  let w = 24;
  let x = -12;
  let y = -7.4;
  let hgt = w / phi;
  head.rect(x, y, w, hgt).stroke({ width: 1, color, alpha: 0.7 });
  const squares = 3 + a;
  let dir = 0;
  const arcs: [number, number, number, number][] = [];
  for (let i = 0; i < squares; i++) {
    const sq = Math.min(w, hgt);
    let cx = 0;
    let cy = 0;
    let start = 0;
    switch (dir) {
      case 0:
        head.rect(x, y, sq, sq);
        cx = x + sq;
        cy = y + sq;
        start = Math.PI;
        x += sq;
        w -= sq;
        break;
      case 1:
        head.rect(x, y, w, sq);
        cx = x;
        cy = y + sq;
        start = -Math.PI / 2;
        y += sq;
        hgt -= sq;
        break;
      case 2:
        head.rect(x + w - sq, y, sq, hgt);
        cx = x + w - sq;
        cy = y;
        start = 0;
        w -= sq;
        break;
      case 3:
        head.rect(x, y + hgt - sq, w, sq);
        cx = x + w;
        cy = y + hgt - sq;
        start = Math.PI / 2;
        hgt -= sq;
        break;
    }
    arcs.push([cx, cy, sq, start]);
    dir = (dir + 1) % 4;
  }
  head.stroke({ width: 0.8, color, alpha: 0.5 });
  for (const [cx, cy, r, st] of arcs) head.moveTo(cx + Math.cos(st) * r, cy + Math.sin(st) * r).arc(cx, cy, r, st, st + Math.PI / 2);
  neonStroke(head, a >= 4 ? 0xffffff : lighten(color, 0.2), 1.4, a >= 3 ? 1.2 : 0.7);
  return art(base, head, false, a >= 4 || b >= 4, 0.35);
};

const boatArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  // ripples instead of a plate
  for (let k = 0; k < 2; k++) base.ellipse(0, 0, 22 + k * 5, 16 + k * 4).stroke({ width: 1, color: 0x7fd8ff, alpha: 0.35 - k * 0.12 });
  for (let i = 0; i < a; i++) base.circle(-12 + i * 4, 21, 1.8).fill({ color: lighten(color, 0.4) });
  for (let i = 0; i < b; i++) base.circle(12 - i * 4, 21, 1.8).fill({ color: 0xffffff });
  const head = new Graphics();
  // protractor hull: a half-disc pointing forward (+x)
  head.moveTo(-12, -12).arc(-12, 0, 12, -Math.PI / 2, Math.PI / 2).lineTo(-12, -12);
  head.moveTo(-12, 12).lineTo(-12, -12);
  head.fill({ color: 0x14203f, alpha: 0.9 });
  head.moveTo(-12, -12).arc(-12, 0, 12, -Math.PI / 2, Math.PI / 2).lineTo(-12, -12);
  neonStroke(head, color, 1.6, 0.7);
  // degree ticks
  for (let k = 1; k < 8; k++) {
    const ang = -Math.PI / 2 + (k / 8) * Math.PI;
    head.moveTo(-12 + Math.cos(ang) * 9, Math.sin(ang) * 9).lineTo(-12 + Math.cos(ang) * 12, Math.sin(ang) * 12);
  }
  head.stroke({ width: 0.8, color: 0xffffff, alpha: 0.7 });
  // sails
  const masts = a >= 4 ? 3 : a >= 2 ? 2 : 1;
  for (let m = 0; m < masts; m++) {
    const mx = -8 + m * 5;
    head.poly([mx, -2, mx, -14 + m, mx + 8, -2]).fill({ color: 0xffffff, alpha: 0.85 });
  }
  if (a >= 3) {
    for (const sy of [-1, 1]) head.rect(-6, sy * 12 - 1.5, 6, 3).fill({ color: 0xffb02e });
  }
  if (b >= 1) neonCircle(head, -9, 7, 2.5, 0x7fd8ff, 1, 0.3, 0.5);
  if (b >= 3) {
    head.moveTo(-3, 3).lineTo(5, 3).moveTo(-1, 3).lineTo(-1.5, 9).moveTo(3, 3).lineTo(3.5, 9);
    neonStroke(head, 0xffd23f, 1.2, 0.6);
  }
  if (b >= 4) neonCircle(head, -2, 0, 19, 0xffd23f, 1, 0, 0.7);
  return art(base, head, true, a >= 4 || b >= 4);
};

const tesseractArt: ArtFn = (a, b, color) => {
  const base = new Graphics();
  plate(base, 8, 22, color, a, b);
  if (b >= 3) {
    for (let k = 0; k < 3; k++) {
      base.moveTo(Math.cos(k * 2.1) * 17, Math.sin(k * 2.1) * 17).arc(0, 0, 17, k * 2.1, k * 2.1 + 1.2);
    }
    neonStroke(base, 0xff4fd8, 1.2, 0.7);
  }
  const head = new Graphics();
  const outer = a >= 3 ? 14 : 12;
  const inner = 6;
  const o = regularPoly(4, outer, Math.PI / 4);
  const i = regularPoly(4, inner, Math.PI / 4);
  const edge = a >= 4 ? 0xffffff : color;
  head.poly(o).fill({ color, alpha: 0.12 });
  head.poly(o);
  neonStroke(head, edge, 1.4, a >= 4 ? 1.6 : 0.8);
  head.poly(i);
  neonStroke(head, lighten(color, 0.4), 1.2, 0.8);
  for (let k = 0; k < 4; k++) head.moveTo(o[k * 2], o[k * 2 + 1]).lineTo(i[k * 2], i[k * 2 + 1]);
  neonStroke(head, edge, 1, 0.6);
  if (a >= 2) for (let k = 0; k < 4; k++) head.circle(o[k * 2], o[k * 2 + 1], 1.8).fill({ color: 0xffffff });
  if (b >= 4) neonCircle(head, 0, 0, 20, 0xff4fd8, 1, 0, 1);
  return art(base, head, false, a >= 4 || b >= 4, a >= 4 ? 1.6 : 0.7);
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
  plotter: plotterArt,
  compass: compassArt,
  eraser: eraserArt,
  ice: iceArt,
  vector: vectorArt,
  laser: laserArt,
  projector: projectorArt,
  chalkboard: chalkboardArt,
  golden: goldenArt,
  boat: boatArt,
  tesseract: tesseractArt,
};

export function registerTowerArt(id: string, fn: ArtFn): void {
  REGISTRY[id] = fn;
}

/** Tower art is authored at a small size and scaled up uniformly. */
export const TOWER_ART_SCALE = 1.25;

export function buildTowerArt(id: string, a: number, b: number, color: number): TowerArt {
  const t = (REGISTRY[id] ?? fallbackArt)(a, b, color);
  t.base.scale.set(TOWER_ART_SCALE);
  t.head.scale.set(TOWER_ART_SCALE);
  return t;
}
