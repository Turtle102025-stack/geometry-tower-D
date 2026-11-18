import type { Shape } from './types';

/**
 * Uniform spatial grid over the world, rebuilt every tick with a counting sort.
 * Small shapes are stored in the cell containing their centre; large shapes (bosses)
 * are stored in every cell their bounding box overlaps, so queries only need to be
 * padded by the largest *normal* shape radius.
 */
export class SpatialGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly cellStart: Int32Array;
  private readonly cursor: Int32Array;
  private items: Int32Array = new Int32Array(1024);

  constructor(
    readonly width: number,
    readonly height: number,
    readonly cellSize = 64,
  ) {
    // one ring of padding cells on each side for shapes entering/leaving the screen
    this.cols = Math.ceil(width / cellSize) + 2;
    this.rows = Math.ceil(height / cellSize) + 2;
    this.cellStart = new Int32Array(this.cols * this.rows + 1);
    this.cursor = new Int32Array(this.cols * this.rows);
  }

  private cx(x: number): number {
    const c = Math.floor(x / this.cellSize) + 1;
    return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
  }

  private cy(y: number): number {
    const c = Math.floor(y / this.cellSize) + 1;
    return c < 0 ? 0 : c >= this.rows ? this.rows - 1 : c;
  }

  build(shapes: Shape[], count: number): void {
    const start = this.cellStart;
    start.fill(0);
    const big = this.cellSize * 0.5;
    let total = 0;
    for (let i = 0; i < count; i++) {
      const s = shapes[i];
      if (!s.alive) continue;
      if (s.radius > big) {
        const x0 = this.cx(s.x - s.radius);
        const x1 = this.cx(s.x + s.radius);
        const y0 = this.cy(s.y - s.radius);
        const y1 = this.cy(s.y + s.radius);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) start[y * this.cols + x + 1]++;
        total += (x1 - x0 + 1) * (y1 - y0 + 1);
      } else {
        start[this.cy(s.y) * this.cols + this.cx(s.x) + 1]++;
        total++;
      }
    }
    const cells = this.cols * this.rows;
    for (let c = 0; c < cells; c++) start[c + 1] += start[c];
    if (this.items.length < total) this.items = new Int32Array(Math.max(total, this.items.length * 2));
    this.cursor.set(start.subarray(0, cells));
    const items = this.items;
    const cur = this.cursor;
    for (let i = 0; i < count; i++) {
      const s = shapes[i];
      if (!s.alive) continue;
      if (s.radius > big) {
        const x0 = this.cx(s.x - s.radius);
        const x1 = this.cx(s.x + s.radius);
        const y0 = this.cy(s.y - s.radius);
        const y1 = this.cy(s.y + s.radius);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) items[cur[y * this.cols + x]++] = i;
      } else {
        items[cur[this.cy(s.y) * this.cols + this.cx(s.x)]++] = i;
      }
    }
  }

  /**
   * Appends indices of shapes whose cell overlaps the square around (x, y, r).
   * Large shapes can appear more than once; callers must tolerate duplicates.
   */
  query(x: number, y: number, r: number, out: number[]): number[] {
    out.length = 0;
    const x0 = this.cx(x - r);
    const x1 = this.cx(x + r);
    const y0 = this.cy(y - r);
    const y1 = this.cy(y + r);
    const start = this.cellStart;
    const items = this.items;
    for (let cy = y0; cy <= y1; cy++) {
      const row = cy * this.cols;
      for (let cx = x0; cx <= x1; cx++) {
        const c = row + cx;
        const e = start[c + 1];
        for (let k = start[c]; k < e; k++) out.push(items[k]);
      }
    }
    return out;
  }
}
