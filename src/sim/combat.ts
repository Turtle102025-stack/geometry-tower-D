import { DT, MAX_SHAPE_RADIUS, WORLD_H, WORLD_W } from './constants';
import { EV, DMG_INDEX } from './events';
import type { Game } from './game';
import { damageShape } from './shapesys';
import { MOD, type Attack, type BeamState, type Projectile, type Shape, type Targeting, type Tower } from './types';

const cand: number[] = [];
const picked: Shape[] = [];
const scored: { s: Shape; v: number }[] = [];
const tmpPos = { x: 0, y: 0 };

export function towerRange(t: Tower): number {
  return t.stats.range * (1 + t.buff.range);
}

export function canSee(g: Game, t: Tower, s: Shape): boolean {
  return !(s.mods & MOD.GHOST) || t.stats.detect || t.buff.detect || s.revealedUntil >= g.tick;
}

function score(g: Game, t: Tower, s: Shape, mode: Targeting): number {
  const remaining = g.paths[s.path].length - s.dist;
  switch (mode) {
    case 'first':
      return -remaining;
    case 'last':
      return remaining;
    case 'strong': {
      const strength = s.kind > 0 ? 1e6 * s.kind + s.hp : s.rbe;
      return strength * 1e4 - remaining;
    }
    case 'close':
      return -((s.x - t.x) ** 2 + (s.y - t.y) ** 2);
  }
}

export interface TargetOpts {
  mode: Targeting;
  count: number;
  range: number;
  ignoreLos?: boolean;
  bossOnly?: boolean;
  nonBoss?: boolean;
  /** Shapes to skip (already targeted). */
  exclude?: Shape[];
  /** Ignore ghost visibility (contact effects). */
  seeAll?: boolean;
}

/** Fills `picked` with the best targets for a tower. Returns the number found. */
export function findTargets(g: Game, t: Tower, o: TargetOpts, out: Shape[] = picked): Shape[] {
  out.length = 0;
  g.grid.query(t.x, t.y, o.range + MAX_SHAPE_RADIUS, cand);
  const stamp = ++g.stamp;
  scored.length = 0;
  let best: Shape | null = null;
  let bestV = -Infinity;
  for (let k = 0; k < cand.length; k++) {
    const s = g.shapes[cand[k]];
    if (!s.alive || s.mark === stamp) continue;
    s.mark = stamp;
    if (s.x < -10 || s.x > WORLD_W + 10 || s.y < -10 || s.y > WORLD_H + 10) continue;
    if (o.bossOnly && s.kind === 0) continue;
    if (o.nonBoss && s.kind > 0) continue;
    const dx = s.x - t.x;
    const dy = s.y - t.y;
    const r = o.range + s.radius;
    if (dx * dx + dy * dy > r * r) continue;
    if (!o.seeAll && !canSee(g, t, s)) continue;
    if (o.exclude && o.exclude.includes(s)) continue;
    if (!o.ignoreLos && g.losBlocked(t.x, t.y, s.x, s.y)) continue;
    const v = score(g, t, s, o.mode);
    if (o.count === 1) {
      if (v > bestV) {
        bestV = v;
        best = s;
      }
    } else scored.push({ s, v });
  }
  if (o.count === 1) {
    if (best) out.push(best);
    return out;
  }
  scored.sort((a, b) => b.v - a.v);
  for (let i = 0; i < scored.length && i < o.count; i++) out.push(scored[i].s);
  return out;
}

function anyTarget(g: Game, t: Tower, range: number, ignoreLos: boolean): Shape | null {
  const r = findTargets(g, t, { mode: 'close', count: 1, range, ignoreLos });
  return r.length ? r[0] : null;
}

/** Predicts where a shape will be after `time` seconds (straight along its path). */
function predict(g: Game, s: Shape, time: number): { x: number; y: number } {
  const moving = s.freeze <= 0 && s.stun <= 0 && s.back <= 0;
  if (!moving) {
    tmpPos.x = s.x;
    tmpPos.y = s.y;
    return tmpPos;
  }
  const mul = s.slow > 0 ? s.slowMul : 1;
  const path = g.paths[s.path];
  path.pointAt(s.dist, tmpPos);
  const offX = s.x - tmpPos.x;
  const offY = s.y - tmpPos.y;
  path.pointAt(s.dist + s.speed * mul * time, tmpPos);
  tmpPos.x += offX;
  tmpPos.y += offY;
  return tmpPos;
}

export function updateTowers(g: Game): void {
  for (const t of g.towers) {
    t.sinceShot += DT;
    if (t.abilityCd > 0) t.abilityCd = Math.max(0, t.abilityCd - DT);
    const rate = 1 + t.buff.rate;
    const range = towerRange(t);
    const atks = t.stats.attacks;
    for (let i = 0; i < atks.length; i++) {
      const a = atks[i];
      if (a.kind === 'orbit') {
        updateOrbit(g, t, a, rate);
        continue;
      }
      if (a.kind === 'beam') {
        updateBeam(g, t, a, i, range, rate);
        continue;
      }
      t.cds[i] -= DT * rate;
      if (t.cds[i] > 0) continue;
      if (fire(g, t, a, range)) {
        t.cds[i] += a.interval;
        if (t.cds[i] < 0) t.cds[i] = 0;
        t.sinceShot = 0;
      } else t.cds[i] = 0;
    }
  }
}

function dmgOf(t: Tower, a: Attack): number {
  return a.damage + t.buff.damage;
}

function pierceOf(t: Tower, a: Attack): number {
  return a.pierce + t.buff.pierce;
}

function fire(g: Game, t: Tower, a: Attack, range: number): boolean {
  switch (a.kind) {
    case 'dart': {
      const tg = findTargets(g, t, { mode: t.targeting, count: 1, range, bossOnly: a.bossOnly });
      if (!tg.length) return false;
      const s = tg[0];
      const d = Math.hypot(s.x - t.x, s.y - t.y);
      const p = predict(g, s, d / a.speed);
      const ang = Math.atan2(p.y - t.y, p.x - t.x);
      t.angle = ang;
      fan(g, t, a, t.x, t.y, ang, range);
      g.events.push(EV.SHOT, t.x, t.y, t.id, ang, 0, t.def.color);
      return true;
    }
    case 'burst': {
      if (!anyTarget(g, t, range, true)) return false;
      const n = a.count;
      for (let k = 0; k < n; k++) {
        spawnDart(g, t, a, t.x, t.y, t.burstSpin + (k / n) * Math.PI * 2, range);
      }
      t.burstSpin += a.spin;
      g.events.push(EV.SHOT, t.x, t.y, t.id, 0, 1, t.def.color);
      return true;
    }
    case 'lob': {
      const tg = findTargets(g, t, { mode: t.targeting, count: 1, range, ignoreLos: true, bossOnly: a.bossOnly });
      if (!tg.length) return false;
      const s = tg[0];
      const d = Math.hypot(s.x - t.x, s.y - t.y);
      const time = Math.max(0.25, d / a.speed);
      const p = predict(g, s, time);
      t.angle = Math.atan2(p.y - t.y, p.x - t.x);
      const pr = g.newProjectile();
      pr.type = 1;
      pr.attack = a;
      pr.tower = t;
      pr.damage = dmgOf(t, a);
      pr.pierce = pierceOf(t, a);
      pr.sx = pr.x = pr.px = t.x;
      pr.sy = pr.y = pr.py = t.y;
      pr.tx = p.x;
      pr.ty = p.y;
      pr.t = 0;
      pr.tTotal = time;
      pr.rot = t.angle;
      g.events.push(EV.SHOT, t.x, t.y, t.id, t.angle, 2, t.def.color);
      return true;
    }
    case 'hitscan': {
      const tg = findTargets(g, t, { mode: t.targeting, count: a.targets, range, bossOnly: a.bossOnly });
      if (!tg.length) return false;
      t.angle = Math.atan2(tg[0].y - t.y, tg[0].x - t.x);
      // copy: damage may spawn shapes and reuse the picked array
      const list = tg.slice();
      for (const s of list) {
        g.events.push(EV.TRACER, t.x, t.y, s.x, s.y, a.targets > 1 ? 1 : 0, t.def.color);
        const sx = s.x;
        const sy = s.y;
        damageShape(g, s, dmgOf(t, a), a.dmgType, t, a);
        applyStatus(g, t, a, s);
        if (a.onHit) g.spawnRadial(t, a.onHit, sx, sy, g.rng.next() * Math.PI * 2);
        if (a.splash > 0) explode(g, sx, sy, a.splash, dmgOf(t, a), pierceOf(t, a), a, t);
      }
      return true;
    }
    case 'pulse': {
      if (!anyTarget(g, t, range, true)) return false;
      const list = findTargets(g, t, { mode: 'first', count: 999, range, ignoreLos: true, seeAll: true }).slice();
      let hits = 0;
      const max = pierceOf(t, a);
      for (const s of list) {
        if (hits >= max) break;
        hits++;
        applyStatus(g, t, a, s);
        if (dmgOf(t, a) > 0) damageShape(g, s, dmgOf(t, a), a.dmgType, t, a);
      }
      g.events.push(EV.PULSE, t.x, t.y, range, DMG_INDEX[a.dmgType], 0, t.def.color);
      return true;
    }
    case 'fold': {
      const list = findTargets(g, t, { mode: 'first', count: a.foldCount, range, nonBoss: true, ignoreLos: true }).slice();
      if (!list.length) return false;
      for (const s of list) {
        const ox = s.x;
        const oy = s.y;
        s.dist = Math.max(0, s.dist - a.foldAmount);
        g.paths[s.path].pointAt(s.dist, tmpPos);
        s.x = s.px = tmpPos.x;
        s.y = s.py = tmpPos.y;
        g.events.push(EV.FOLD, ox, oy, s.x, s.y, 0, t.def.color);
        if (dmgOf(t, a) > 0) damageShape(g, s, dmgOf(t, a), a.dmgType, t, a);
      }
      return true;
    }
    default:
      return false;
  }
}

/** Applies freeze / slow / stun from an attack. */
export function applyStatus(g: Game, t: Tower | null, a: Attack, s: Shape): void {
  if (!s.alive) return;
  if (a.freeze > 0 || a.slow > 0) {
    if (a.dmgType === 'cold' && s.mods & MOD.CRYSTAL) return;
    if (s.kind > 0) {
      // bosses can't be frozen solid, only slowed
      const dur = a.freeze + a.slow;
      s.slow = Math.max(s.slow, dur);
      s.slowMul = Math.min(s.slowMul, a.slowMul < 1 ? Math.max(0.35, a.slowMul) : 0.6);
    } else {
      if (a.freeze > 0) {
        if (s.freeze <= 0) g.events.push(EV.FREEZE, s.x, s.y, s.radius);
        s.freeze = Math.max(s.freeze, a.freeze);
        s.brittle = Math.max(s.brittle, a.brittle);
        if (t) s.frozenBy = t.id;
      }
      if (a.slow > 0) {
        s.slow = Math.max(s.slow, a.freeze + a.slow);
        s.slowMul = Math.min(s.slowMul, a.slowMul);
      }
    }
  }
  if (a.stun > 0) s.stun = Math.max(s.stun, s.kind > 0 ? a.stun * 0.5 : a.stun);
}

function fan(g: Game, t: Tower, a: Attack, x: number, y: number, ang: number, range: number): void {
  const n = a.count;
  if (n === 1) {
    spawnDart(g, t, a, x, y, ang, range);
    return;
  }
  for (let k = 0; k < n; k++) {
    const off = a.spread * (k / (n - 1) - 0.5);
    spawnDart(g, t, a, x, y, ang + off, range);
  }
}

export function spawnDart(g: Game, t: Tower | null, a: Attack, x: number, y: number, ang: number, range: number): Projectile | null {
  if (g.projectiles.length >= g.maxProjectiles) return null;
  const p = g.newProjectile();
  p.type = 0;
  p.attack = a;
  p.tower = t;
  p.damage = t ? dmgOf(t, a) : a.damage;
  p.pierce = t ? pierceOf(t, a) : a.pierce;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  p.x = p.px = x + c * 10;
  p.y = p.py = y + s * 10;
  p.vx = c * a.speed;
  p.vy = s * a.speed;
  p.life = a.travel > 0 ? a.travel : range * 1.3;
  p.rot = ang;
  return p;
}

export function updateProjectiles(g: Game): void {
  const list = g.projectiles;
  const n = list.length;
  for (let i = 0; i < n; i++) {
    const p = list[i];
    if (!p.alive) continue;
    p.px = p.x;
    p.py = p.y;
    if (p.type === 1) {
      p.t += DT;
      const f = Math.min(1, p.t / p.tTotal);
      p.x = p.sx + (p.tx - p.sx) * f;
      p.y = p.sy + (p.ty - p.sy) * f;
      if (f >= 1) {
        p.alive = false;
        explode(g, p.tx, p.ty, p.attack.splash, p.damage, p.pierce, p.attack, p.tower);
      }
      continue;
    }
    const a = p.attack;
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    const step = a.speed * DT;
    p.life -= step;
    if (p.life <= 0 || p.x < -60 || p.x > WORLD_W + 60 || p.y < -60 || p.y > WORLD_H + 60) {
      p.alive = false;
      continue;
    }
    if (g.obstacles.length && g.pointBlocked(p.x, p.y)) {
      p.alive = false;
      continue;
    }
    const mx = (p.x + p.px) * 0.5;
    const my = (p.y + p.py) * 0.5;
    g.grid.query(mx, my, step * 0.5 + a.radius + MAX_SHAPE_RADIUS, cand);
    for (let k = 0; k < cand.length && p.alive; k++) {
      const s = g.shapes[cand[k]];
      if (!s.alive) continue;
      if (p.hits.includes(s.id)) continue;
      const rr = s.radius + a.radius;
      // segment-vs-circle
      const vx = p.x - p.px;
      const vy = p.y - p.py;
      const len = vx * vx + vy * vy;
      let tt = len > 0 ? ((s.x - p.px) * vx + (s.y - p.py) * vy) / len : 0;
      tt = tt < 0 ? 0 : tt > 1 ? 1 : tt;
      const dx = p.px + vx * tt - s.x;
      const dy = p.py + vy * tt - s.y;
      if (dx * dx + dy * dy > rr * rr) continue;
      p.hits.push(s.id);
      const sx = s.x;
      const sy = s.y;
      if (a.splash > 0) {
        explode(g, sx, sy, a.splash, p.damage, Math.max(p.pierce, 1) * 4, a, p.tower);
        p.alive = false;
        break;
      }
      if (damageShape(g, s, p.damage, a.dmgType, p.tower, a)) {
        applyStatus(g, p.tower, a, s);
        p.pierce--;
        if (a.onHit) g.spawnRadial(p.tower, a.onHit, sx, sy, p.rot + Math.PI / a.onHit.count);
        if (p.pierce <= 0) p.alive = false;
      }
    }
  }
}

export function explode(
  g: Game,
  x: number,
  y: number,
  radius: number,
  damage: number,
  pierce: number,
  a: Attack,
  t: Tower | null,
  chain = -1,
): void {
  g.events.push(EV.EXPLOSION, x, y, radius, DMG_INDEX[a.dmgType], 0, t ? t.def.color : 0xffffff);
  g.grid.query(x, y, radius + MAX_SHAPE_RADIUS, cand);
  const stamp = ++g.stamp;
  let hits = 0;
  const list = picked;
  list.length = 0;
  for (let k = 0; k < cand.length; k++) {
    const s = g.shapes[cand[k]];
    if (!s.alive || s.mark === stamp) continue;
    s.mark = stamp;
    const r = radius + s.radius;
    if ((s.x - x) ** 2 + (s.y - y) ** 2 > r * r) continue;
    list.push(s);
  }
  const targets = list.slice();
  for (const s of targets) {
    if (hits >= pierce) break;
    hits++;
    damageShape(g, s, damage, a.dmgType, t, a);
    applyStatus(g, t, a, s);
  }
  const cl = a.cluster;
  const depth = chain < 0 ? (cl ? cl.chain : 0) : chain;
  if (cl && depth > 0) {
    const count = chain < 0 ? cl.count : Math.max(2, Math.floor(cl.count / 2));
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * Math.PI * 2 + g.rng.range(-0.3, 0.3);
      const d = cl.spread * g.rng.range(0.6, 1);
      g.pending.push({
        x: x + Math.cos(ang) * d,
        y: y + Math.sin(ang) * d,
        t: 0.07 + k * 0.035,
        radius: cl.radius,
        damage: cl.damage + (t ? t.buff.damage : 0),
        pierce: cl.pierce,
        chain: depth - 1,
        attack: a,
        tower: t,
      });
    }
  }
}

export function updatePending(g: Game): void {
  const list = g.pending;
  let w = 0;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    e.t -= DT;
    if (e.t <= 0) {
      explode(g, e.x, e.y, e.radius, e.damage, e.pierce, e.attack, e.tower, e.chain);
    } else list[w++] = e;
  }
  // explosions above may append entries; the loop visits them too (t > 0, so they are kept)
  list.length = w;
}

function updateBeam(g: Game, t: Tower, a: Attack, i: number, range: number, rate: number): void {
  let beams = t.beams[i];
  if (!beams) beams = t.beams[i] = [];
  // drop invalid targets
  for (let k = beams.length - 1; k >= 0; k--) {
    const b = beams[k];
    const s = g.shapeRef(b.targetId);
    const r = range + (s ? s.radius : 0);
    if (!s || (s.x - t.x) ** 2 + (s.y - t.y) ** 2 > r * r || !canSee(g, t, s) || g.losBlocked(t.x, t.y, s.x, s.y)) {
      beams.splice(k, 1);
    }
  }
  if (beams.length < a.targets) {
    const exclude: Shape[] = [];
    for (const b of beams) {
      const s = g.shapeRef(b.targetId);
      if (s) exclude.push(s);
    }
    const found = findTargets(g, t, { mode: t.targeting, count: a.targets - beams.length, range, exclude, bossOnly: a.bossOnly });
    for (const s of found) beams.push({ targetId: s.id, heat: 0, x: s.x, y: s.y } as BeamState);
  }
  t.cds[i] -= DT * rate;
  if (beams.length === 0) {
    if (t.cds[i] < 0) t.cds[i] = 0;
    return;
  }
  const s0 = g.shapeRef(beams[0].targetId);
  if (s0) t.angle = Math.atan2(s0.y - t.y, s0.x - t.x);
  t.sinceShot = 0;
  if (t.cds[i] <= 0) {
    t.cds[i] += a.interval;
    if (t.cds[i] < 0) t.cds[i] = 0;
    for (const b of beams) {
      const s = g.shapeRef(b.targetId);
      if (!s) continue;
      damageShape(g, s, dmgOf(t, a) + Math.floor(b.heat), a.dmgType, t, a);
      applyStatus(g, t, a, s);
      b.heat = Math.min(a.rampMax, b.heat + a.ramp * a.interval);
    }
  }
  for (const b of beams) {
    const s = g.shapeRef(b.targetId);
    if (s) {
      b.x = s.x;
      b.y = s.y;
    }
  }
}

function updateOrbit(g: Game, t: Tower, a: Attack, rate: number): void {
  const o = a.orbit!;
  t.orbitAngle += o.spin * DT * rate;
  const rehitTicks = Math.max(1, Math.round(o.rehit * 60));
  for (let b = 0; b < o.blades; b++) {
    const ang = t.orbitAngle + (b / o.blades) * Math.PI * 2;
    const bx = t.x + Math.cos(ang) * o.radius;
    const by = t.y + Math.sin(ang) * o.radius;
    g.grid.query(bx, by, o.bladeRadius + MAX_SHAPE_RADIUS, cand);
    for (let k = 0; k < cand.length; k++) {
      const s = g.shapes[cand[k]];
      if (!s.alive) continue;
      const r = o.bladeRadius + s.radius;
      if ((s.x - bx) ** 2 + (s.y - by) ** 2 > r * r) continue;
      const last = t.orbitHits.get(s.id);
      if (last !== undefined && g.tick - last < rehitTicks) continue;
      t.orbitHits.set(s.id, g.tick);
      damageShape(g, s, dmgOf(t, a), a.dmgType, t, a);
    }
  }
  if (g.tick % 120 === 0) {
    for (const [id, tick] of t.orbitHits) if (g.tick - tick > rehitTicks) t.orbitHits.delete(id);
  }
}

/** Support towers: reveal ghosts, strip ghost status, highlight shapes. Runs before towers attack. */
export function updateSupport(g: Game): void {
  for (const t of g.supportTowers) {
    const sp = t.stats.support!;
    if (!sp.reveal && !sp.stripGhost && sp.highlight <= 0 && sp.spotlight <= 1) continue;
    const range = towerRange(t);
    if (sp.global) {
      for (const s of g.shapes) if (s.alive) touch(g, s, sp.reveal, sp.stripGhost, 0, 1);
    }
    g.grid.query(t.x, t.y, range + MAX_SHAPE_RADIUS, cand);
    for (let k = 0; k < cand.length; k++) {
      const s = g.shapes[cand[k]];
      if (!s.alive) continue;
      const r = range + s.radius;
      if ((s.x - t.x) ** 2 + (s.y - t.y) ** 2 > r * r) continue;
      touch(g, s, sp.reveal, sp.stripGhost, sp.highlight, sp.spotlight);
    }
  }
}

function touch(g: Game, s: Shape, reveal: boolean, strip: boolean, add: number, mul: number): void {
  if (reveal) s.revealedUntil = g.tick;
  if (strip && s.mods & MOD.GHOST) {
    s.mods &= ~MOD.GHOST;
  }
  if (add > 0 || mul > 1) {
    if (s.bonusUntil < g.tick) {
      s.bonusAdd = 0;
      s.bonusMul = 1;
    }
    s.bonusUntil = g.tick;
    s.bonusAdd = Math.max(s.bonusAdd, add);
    s.bonusMul = Math.max(s.bonusMul, mul);
  }
}
