/**
 * Map paths are authored as SVG-like commands (points, lines, curves, arcs) and
 * pre-sampled into an evenly spaced polyline, so "distance travelled" maps to a
 * position in O(1). Every shape stores only its distance along its path.
 */
export type PathCmd =
  | ['M', number, number]
  | ['L', number, number]
  | ['Q', number, number, number, number]
  | ['C', number, number, number, number, number, number]
  /** Arc around (cx, cy) with radius r from angle a0 to a1 (degrees; a1 < a0 goes counter-clockwise). */
  | ['A', number, number, number, number, number];

export const PATH_STEP = 3;

export interface Vec {
  x: number;
  y: number;
}

/** Convenience: a polyline with rounded corners (quadratic curves of the given radius). */
export function rounded(points: [number, number][], radius: number): PathCmd[] {
  const cmds: PathCmd[] = [['M', points[0][0], points[0][1]]];
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const d1 = Math.hypot(cx - px, cy - py);
    const d2 = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radius, d1 / 2, d2 / 2);
    const ax = cx + ((px - cx) / d1) * r;
    const ay = cy + ((py - cy) / d1) * r;
    const bx = cx + ((nx - cx) / d2) * r;
    const by = cy + ((ny - cy) / d2) * r;
    cmds.push(['L', ax, ay]);
    cmds.push(['Q', cx, cy, bx, by]);
  }
  const last = points[points.length - 1];
  cmds.push(['L', last[0], last[1]]);
  return cmds;
}

function sampleCommands(cmds: PathCmd[]): number[] {
  const out: number[] = [];
  let x = 0;
  let y = 0;
  const push = (nx: number, ny: number) => {
    out.push(nx, ny);
    x = nx;
    y = ny;
  };
  for (const c of cmds) {
    switch (c[0]) {
      case 'M':
        push(c[1], c[2]);
        break;
      case 'L': {
        const len = Math.hypot(c[1] - x, c[2] - y);
        const n = Math.max(1, Math.ceil(len / 2));
        const sx = x;
        const sy = y;
        for (let i = 1; i <= n; i++) push(sx + ((c[1] - sx) * i) / n, sy + ((c[2] - sy) * i) / n);
        break;
      }
      case 'Q': {
        const sx = x;
        const sy = y;
        const n = 48;
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const u = 1 - t;
          push(u * u * sx + 2 * u * t * c[1] + t * t * c[3], u * u * sy + 2 * u * t * c[2] + t * t * c[4]);
        }
        break;
      }
      case 'C': {
        const sx = x;
        const sy = y;
        const n = 96;
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const u = 1 - t;
          const a = u * u * u;
          const b = 3 * u * u * t;
          const d = 3 * u * t * t;
          const e = t * t * t;
          push(a * sx + b * c[1] + d * c[3] + e * c[5], a * sy + b * c[2] + d * c[4] + e * c[6]);
        }
        break;
      }
      case 'A': {
        const [, cx, cy, r, a0, a1] = c;
        const r0 = (a0 * Math.PI) / 180;
        const r1 = (a1 * Math.PI) / 180;
        const n = Math.max(8, Math.ceil((Math.abs(r1 - r0) * r) / 2));
        const startX = cx + Math.cos(r0) * r;
        const startY = cy + Math.sin(r0) * r;
        if (out.length === 0) push(startX, startY);
        else if (Math.hypot(startX - x, startY - y) > 0.5) {
          // connect to the arc start with a straight segment
          const len = Math.hypot(startX - x, startY - y);
          const m = Math.max(1, Math.ceil(len / 2));
          const sx = x;
          const sy = y;
          for (let i = 1; i <= m; i++) push(sx + ((startX - sx) * i) / m, sy + ((startY - sy) * i) / m);
        }
        for (let i = 1; i <= n; i++) {
          const a = r0 + ((r1 - r0) * i) / n;
          push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        break;
      }
    }
  }
  return out;
}

export class Path {
  readonly length: number;
  /** Evenly spaced samples, PATH_STEP apart. */
  readonly xs: Float32Array;
  readonly ys: Float32Array;
  readonly count: number;

  constructor(readonly cmds: PathCmd[]) {
    const raw = sampleCommands(cmds);
    // cumulative length over the raw samples
    const n = raw.length / 2;
    const cum = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      cum[i] = cum[i - 1] + Math.hypot(raw[i * 2] - raw[i * 2 - 2], raw[i * 2 + 1] - raw[i * 2 - 1]);
    }
    this.length = cum[n - 1];
    const count = Math.floor(this.length / PATH_STEP) + 2;
    this.count = count;
    this.xs = new Float32Array(count);
    this.ys = new Float32Array(count);
    let j = 0;
    for (let k = 0; k < count; k++) {
      const d = Math.min(k * PATH_STEP, this.length);
      while (j < n - 2 && cum[j + 1] < d) j++;
      const seg = cum[j + 1] - cum[j] || 1;
      const t = Math.min(1, Math.max(0, (d - cum[j]) / seg));
      this.xs[k] = raw[j * 2] + (raw[j * 2 + 2] - raw[j * 2]) * t;
      this.ys[k] = raw[j * 2 + 1] + (raw[j * 2 + 3] - raw[j * 2 + 1]) * t;
    }
  }

  /** Writes the position at distance d into out. */
  pointAt(d: number, out: Vec): void {
    if (d <= 0) {
      out.x = this.xs[0];
      out.y = this.ys[0];
      return;
    }
    const f = d / PATH_STEP;
    let i = f | 0;
    if (i >= this.count - 1) {
      out.x = this.xs[this.count - 1];
      out.y = this.ys[this.count - 1];
      return;
    }
    const t = f - i;
    out.x = this.xs[i] + (this.xs[i + 1] - this.xs[i]) * t;
    out.y = this.ys[i] + (this.ys[i + 1] - this.ys[i]) * t;
  }

  /** Direction of travel (radians) at distance d. */
  angleAt(d: number): number {
    let i = Math.max(0, Math.min(this.count - 2, (d / PATH_STEP) | 0));
    return Math.atan2(this.ys[i + 1] - this.ys[i], this.xs[i + 1] - this.xs[i]);
  }

  /** Shortest distance from a point to the path centre line. */
  distanceTo(x: number, y: number): number {
    let best = Infinity;
    for (let i = 0; i < this.count; i += 2) {
      const dx = this.xs[i] - x;
      const dy = this.ys[i] - y;
      const d = dx * dx + dy * dy;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
}
