import { Container, Graphics } from 'pixi.js';
import { BOSSES, type SolidKind } from '../data/bosses';
import { lighten } from './neon';

type V3 = [number, number, number];

interface Solid {
  verts: V3[];
  faces: number[][];
}

const PHI = (1 + Math.sqrt(5)) / 2;

function norm(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Orients every face so its normal points outward. */
function orient(verts: V3[], faces: number[][]): number[][] {
  return faces.map((f) => {
    const n = cross(sub(verts[f[1]], verts[f[0]]), sub(verts[f[2]], verts[f[0]]));
    const c: V3 = [0, 0, 0];
    for (const i of f) for (let k = 0; k < 3; k++) c[k] += verts[i][k];
    return dot(n, c) < 0 ? [...f].reverse() : f;
  });
}

/** Faces = all vertex triples whose pairwise distances equal the edge length. */
function triFaces(verts: V3[]): number[][] {
  let edge = Infinity;
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++) edge = Math.min(edge, Math.hypot(...sub(verts[i], verts[j])));
  const isEdge = (i: number, j: number) => Math.abs(Math.hypot(...sub(verts[i], verts[j])) - edge) < 1e-3;
  const faces: number[][] = [];
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++)
      for (let k = j + 1; k < verts.length; k++) if (isEdge(i, j) && isEdge(j, k) && isEdge(i, k)) faces.push([i, j, k]);
  return faces;
}

/** Orders a face's vertices by angle around its centre. */
function sortFace(verts: V3[], f: number[]): number[] {
  const c: V3 = [0, 0, 0];
  for (const i of f) for (let k = 0; k < 3; k++) c[k] += verts[i][k] / f.length;
  const n = norm(c);
  const u = norm(sub(verts[f[0]], c));
  const w = cross(n, u);
  return [...f].sort((a, b) => {
    const da = sub(verts[a], c);
    const db = sub(verts[b], c);
    return Math.atan2(dot(da, w), dot(da, u)) - Math.atan2(dot(db, w), dot(db, u));
  });
}

function cube(): Solid {
  const verts: V3[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) verts.push(norm([x, y, z]));
  const faces: number[][] = [];
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) {
      const f = verts.map((v, i) => [v, i] as const).filter(([v]) => Math.sign(v[axis]) === sign).map(([, i]) => i);
      faces.push(sortFace(verts, f));
    }
  return { verts, faces: orient(verts, faces) };
}

function octahedron(): Solid {
  const verts: V3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  return { verts, faces: orient(verts, triFaces(verts)) };
}

function icosahedron(): Solid {
  const raw: V3[] = [];
  for (const a of [-1, 1])
    for (const b of [-PHI, PHI]) {
      raw.push([0, a, b], [a, b, 0], [b, 0, a]);
    }
  const verts = raw.map(norm);
  return { verts, faces: orient(verts, triFaces(verts)) };
}

function dodecahedron(): Solid {
  const ico = icosahedron();
  const verts: V3[] = ico.faces.map((f) => norm([0, 1, 2].map((k) => f.reduce((s, i) => s + ico.verts[i][k], 0)) as V3));
  const faces: number[][] = ico.verts.map((_, vi) => {
    const around: number[] = [];
    ico.faces.forEach((f, fi) => {
      if (f.includes(vi)) around.push(fi);
    });
    return sortFace(verts, around);
  });
  return { verts, faces: orient(verts, faces) };
}

function sphere(): Solid {
  const ico = icosahedron();
  let verts = ico.verts.slice();
  let faces = ico.faces;
  for (let level = 0; level < 2; level++) {
    const cache = new Map<string, number>();
    const mid = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      let i = cache.get(key);
      if (i === undefined) {
        const va = verts[a];
        const vb = verts[b];
        verts.push(norm([(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2]));
        i = verts.length - 1;
        cache.set(key, i);
      }
      return i;
    };
    const next: number[][] = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  verts = verts.map(norm);
  return { verts, faces: orient(verts, faces) };
}

const SOLIDS: Record<SolidKind, Solid> = {
  cube: cube(),
  octahedron: octahedron(),
  dodecahedron: dodecahedron(),
  icosahedron: icosahedron(),
  sphere: sphere(),
};

interface Crack {
  pts: V3[];
}

function makeCracks(solid: Solid, seed: number, count: number): Crack[] {
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const out: Crack[] = [];
  for (let c = 0; c < count; c++) {
    const f = solid.faces[Math.floor(rnd() * solid.faces.length)];
    const pts: V3[] = [];
    const steps = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < steps; k++) {
      // random point inside the face (weighted average of its vertices)
      const w = f.map(() => rnd() + 0.05);
      const sum = w.reduce((a, b) => a + b, 0);
      const p: V3 = [0, 0, 0];
      f.forEach((vi, j) => {
        for (let q = 0; q < 3; q++) p[q] += (solid.verts[vi][q] * w[j]) / sum;
      });
      pts.push(p);
    }
    out.push({ pts });
  }
  return out;
}

/** A rotating, cracking neon Platonic solid. */
export class BossView {
  readonly container = new Container();
  private g = new Graphics();
  private solid: Solid;
  private cracks: Crack[];
  private color: number;
  private rv: V3[] = [];

  constructor(
    readonly kind: number,
    seed: number,
  ) {
    const def = BOSSES[kind - 1];
    this.solid = SOLIDS[def.solid];
    this.color = def.color;
    this.cracks = makeCracks(this.solid, seed, def.solid === 'sphere' ? 40 : 18);
    this.container.addChild(this.g);
    this.rv = this.solid.verts.map(() => [0, 0, 0] as V3);
  }

  draw(radius: number, rot: number, hpFrac: number, flash: number, frozen: boolean, glowScale: number): void {
    const g = this.g;
    g.clear();
    const ax = rot * 0.7;
    const ay = rot;
    const cxr = Math.cos(ax);
    const sxr = Math.sin(ax);
    const cyr = Math.cos(ay);
    const syr = Math.sin(ay);
    const verts = this.solid.verts;
    for (let i = 0; i < verts.length; i++) {
      const [x, y, z] = verts[i];
      // rotate around Y then X
      const x1 = x * cyr + z * syr;
      const z1 = -x * syr + z * cyr;
      const y2 = y * cxr - z1 * sxr;
      const z2 = y * sxr + z1 * cxr;
      const o = this.rv[i];
      o[0] = x1 * radius;
      o[1] = y2 * radius;
      o[2] = z2;
    }
    const color = frozen ? 0x9fe8ff : this.color;
    const edge = flash > 0 ? 0xffffff : color;
    const dense = this.solid.faces.length > 40;
    // back edges: faint wireframe
    if (!dense) {
      for (const f of this.solid.faces) {
        const n = this.normalZ(f);
        if (n >= 0) continue;
        this.facePath(f);
        g.stroke({ width: 1, color, alpha: 0.18 });
      }
    }
    // outer glow
    g.circle(0, 0, radius * 1.05).fill({ color, alpha: 0.06 * glowScale });
    // front faces
    for (const f of this.solid.faces) {
      const n = this.normalZ(f);
      if (n < 0) continue;
      this.facePath(f);
      g.fill({ color, alpha: 0.08 + 0.32 * n });
      this.facePath(f);
      if (!dense) g.stroke({ width: 5, color: edge, alpha: 0.18 * glowScale, join: 'round' });
      g.stroke({ width: dense ? 1 : 2.2, color: dense ? edge : lighten(edge, 0.25), alpha: dense ? 0.5 + 0.4 * n : 1, join: 'round' });
    }
    // cracks
    const shown = Math.floor(this.cracks.length * Math.max(0, Math.min(1, 1 - hpFrac)));
    for (let c = 0; c < shown; c++) {
      const pts = this.cracks[c].pts;
      let visible = true;
      const proj: number[] = [];
      for (const p of pts) {
        const [x, y, z] = p;
        const x1 = x * cyr + z * syr;
        const z1 = -x * syr + z * cyr;
        const y2 = y * cxr - z1 * sxr;
        const z2 = y * sxr + z1 * cxr;
        if (z2 < -0.05) visible = false;
        proj.push(x1 * radius, y2 * radius);
      }
      if (!visible) continue;
      g.moveTo(proj[0], proj[1]);
      for (let k = 2; k < proj.length; k += 2) g.lineTo(proj[k], proj[k + 1]);
      g.stroke({ width: 3, color: 0xffffff, alpha: 0.25, cap: 'round', join: 'round' });
      g.moveTo(proj[0], proj[1]);
      for (let k = 2; k < proj.length; k += 2) g.lineTo(proj[k], proj[k + 1]);
      g.stroke({ width: 1.2, color: 0xffffff, alpha: 0.95, cap: 'round', join: 'round' });
    }
    // health ring
    g.arc(0, 0, radius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpFrac).stroke({ width: 3, color, alpha: 0.85, cap: 'round' });
  }

  private normalZ(f: number[]): number {
    const a = this.rv[f[0]];
    const b = this.rv[f[1]];
    const c = this.rv[f[2]];
    // z of 2D cross product on projected points (screen coords, y down) -> facing sign
    const cz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    // average depth to get shading strength
    let z = 0;
    for (const i of f) z += this.rv[i][2];
    z /= f.length;
    return cz > 0 ? Math.max(0.05, Math.min(1, 0.35 + z * 0.65)) : -1;
  }

  private facePath(f: number[]): void {
    const pts: number[] = [];
    for (const i of f) pts.push(this.rv[i][0], this.rv[i][1]);
    this.g.poly(pts);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
