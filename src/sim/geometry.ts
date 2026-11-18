import type { Area } from '../data/maps/types';

export function pointInArea(a: Area, x: number, y: number): boolean {
  switch (a.type) {
    case 'rect':
      return x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h;
    case 'circle':
      return (x - a.x) ** 2 + (y - a.y) ** 2 <= a.r * a.r;
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

function segSeg(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (d === 0) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/** Distance from point to segment, squared. */
export function distToSegmentSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const len = vx * vx + vy * vy;
  let t = len > 0 ? ((px - ax) * vx + (py - ay) * vy) / len : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = ax + vx * t - px;
  const dy = ay + vy * t - py;
  return dx * dx + dy * dy;
}

export function segmentHitsArea(a: Area, x1: number, y1: number, x2: number, y2: number): boolean {
  if (pointInArea(a, x1, y1) || pointInArea(a, x2, y2)) return true;
  switch (a.type) {
    case 'rect':
      return (
        segSeg(x1, y1, x2, y2, a.x, a.y, a.x + a.w, a.y) ||
        segSeg(x1, y1, x2, y2, a.x + a.w, a.y, a.x + a.w, a.y + a.h) ||
        segSeg(x1, y1, x2, y2, a.x, a.y + a.h, a.x + a.w, a.y + a.h) ||
        segSeg(x1, y1, x2, y2, a.x, a.y, a.x, a.y + a.h)
      );
    case 'circle':
      return distToSegmentSq(a.x, a.y, x1, y1, x2, y2) <= a.r * a.r;
    case 'poly': {
      const p = a.points;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        if (segSeg(x1, y1, x2, y2, p[j], p[j + 1], p[i], p[i + 1])) return true;
      }
      return false;
    }
  }
}

/** True if a circle overlaps the area (approximate for polygons: centre or edge distance). */
export function circleHitsArea(a: Area, x: number, y: number, r: number): boolean {
  switch (a.type) {
    case 'rect': {
      const cx = Math.max(a.x, Math.min(x, a.x + a.w));
      const cy = Math.max(a.y, Math.min(y, a.y + a.h));
      return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
    }
    case 'circle':
      return (x - a.x) ** 2 + (y - a.y) ** 2 <= (r + a.r) ** 2;
    case 'poly': {
      if (pointInArea(a, x, y)) return true;
      const p = a.points;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        if (distToSegmentSq(x, y, p[j], p[j + 1], p[i], p[i + 1]) <= r * r) return true;
      }
      return false;
    }
  }
}
