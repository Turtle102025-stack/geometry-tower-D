import { BOSSES } from '../data/bosses';
import { BOSS_BOUNTY } from '../data/difficulty';
import { INHERITED_MODS, MIN_RANK, RANKS, REGROW_TIME, parseSpec, polyRbe, bossRbe, splitCount } from '../data/shapes';
import { DT } from './constants';
import { EV, DMG_INDEX } from './events';
import type { Game } from './game';
import { MOD, type Attack, type DamageType, type Shape, type Tower } from './types';

const pos = { x: 0, y: 0, nx: 0, ny: 0 };

function blankShape(): Shape {
  return {
    id: 0,
    alive: false,
    kind: 0,
    rank: 3,
    birthRank: 3,
    mods: 0,
    hp: 0,
    maxHp: 0,
    path: 0,
    dist: 0,
    lane: 0,
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    speed: 0,
    radius: 0,
    freeze: 0,
    slow: 0,
    slowMul: 1,
    stun: 0,
    back: 0,
    regrowT: 0,
    revealedUntil: -1,
    bonusUntil: -1,
    bonusAdd: 0,
    bonusMul: 1,
    brittle: 0,
    rot: 0,
    spin: 0,
    hitFlash: 0,
    rbe: 0,
    frozenBy: 0,
    mark: 0,
  };
}

function obtain(g: Game): Shape {
  const s = g.shapePool.pop() ?? blankShape();
  s.id = ++g.nextShapeId;
  s.alive = true;
  s.freeze = 0;
  s.slow = 0;
  s.slowMul = 1;
  s.stun = 0;
  s.back = 0;
  s.regrowT = 0;
  s.revealedUntil = -1;
  s.bonusUntil = -1;
  s.bonusAdd = 0;
  s.bonusMul = 1;
  s.brittle = 0;
  s.hitFlash = 0;
  s.frozenBy = 0;
  s.hp = 0;
  s.maxHp = 0;
  g.shapes.push(s);
  return s;
}

function place(g: Game, s: Shape): void {
  const path = g.paths[s.path];
  path.pointAt(s.dist, pos);
  const i = Math.max(0, Math.min(path.count - 2, (s.dist / 3) | 0));
  const dx = path.xs[i + 1] - path.xs[i];
  const dy = path.ys[i + 1] - path.ys[i];
  const l = Math.hypot(dx, dy) || 1;
  s.x = pos.x - (dy / l) * s.lane;
  s.y = pos.y + (dx / l) * s.lane;
}

export function setRank(s: Shape, rank: number): void {
  const r = RANKS[rank];
  s.rank = rank;
  s.speed = r.speed;
  s.radius = r.radius;
  s.rbe = polyRbe(rank, s.mods);
}

export function spawnPoly(g: Game, rank: number, mods: number, path: number, dist: number, lane?: number): Shape {
  const s = obtain(g);
  s.kind = 0;
  s.mods = mods;
  s.birthRank = rank;
  s.path = path;
  s.dist = Math.max(0, dist);
  s.lane = lane ?? g.rng.range(-9, 9);
  s.rot = g.rng.range(0, Math.PI * 2);
  s.spin = g.rng.range(-1.2, 1.2);
  setRank(s, rank);
  place(g, s);
  s.px = s.x;
  s.py = s.y;
  return s;
}

export function spawnBoss(g: Game, index: number, path: number, dist: number): Shape {
  const b = BOSSES[index - 1];
  const s = obtain(g);
  s.kind = index;
  s.rank = 0;
  s.birthRank = 0;
  s.mods = 0;
  s.path = path;
  s.dist = Math.max(0, dist);
  s.lane = 0;
  s.hp = b.hp * g.bossHpMul;
  s.maxHp = s.hp;
  s.speed = b.speed;
  s.radius = b.radius;
  s.rbe = bossRbe(index);
  s.rot = g.rng.range(0, Math.PI * 2);
  s.spin = 0.6;
  place(g, s);
  s.px = s.x;
  s.py = s.y;
  return s;
}

export function spawnSpec(g: Game, spec: string, path: number, dist: number): Shape {
  const p = parseSpec(spec);
  return p.boss ? spawnBoss(g, p.bossIndex, path, dist) : spawnPoly(g, p.rank, p.mods, path, dist);
}

/** Hits needed to clear what's left of a shape (used for lives lost and targeting). */
export function remainingRbe(s: Shape): number {
  if (s.kind === 0) return s.rbe;
  const b = BOSSES[s.kind - 1];
  return Math.ceil(s.hp) + (s.rbe - b.hp);
}

export function updateShapes(g: Game): void {
  const shapes = g.shapes;
  const n = shapes.length;
  for (let i = 0; i < n; i++) {
    const s = shapes[i];
    if (!s.alive) continue;
    s.px = s.x;
    s.py = s.y;
    if (s.hitFlash > 0) s.hitFlash -= DT;
    let mul = 1;
    if (s.slow > 0) {
      s.slow -= DT;
      mul = s.slowMul;
      if (s.slow <= 0) s.slowMul = 1;
    }
    if (s.freeze > 0) {
      s.freeze -= DT;
      if (s.freeze <= 0) {
        s.brittle = 0;
        s.frozenBy = 0;
      }
      mul = 0;
    }
    if (s.stun > 0) {
      s.stun -= DT;
      mul = 0;
    }
    if (mul > 0) {
      const step = s.speed * mul * DT;
      if (s.back > 0) {
        s.back -= DT;
        s.dist = Math.max(0, s.dist - step * 1.2);
      } else s.dist += step;
      s.rot += s.spin * DT * mul;
    }
    if (s.kind === 0 && s.mods & MOD.REGROW && s.rank < s.birthRank) {
      s.regrowT += DT;
      if (s.regrowT >= REGROW_TIME) {
        s.regrowT = 0;
        setRank(s, s.rank + 1);
        g.events.push(EV.REGROW, s.x, s.y, s.rank, s.mods, 0, RANKS[s.rank].color);
      }
    }
    const path = g.paths[s.path];
    if (s.dist >= path.length) {
      leak(g, s);
      continue;
    }
    place(g, s);
  }
}

function leak(g: Game, s: Shape): void {
  const lost = remainingRbe(s);
  s.alive = false;
  g.events.push(EV.LEAK, s.x, s.y, lost, s.kind);
  if (g.mode === 'sandbox') return;
  g.lives -= lost;
  g.stats.livesLost += lost;
}

function credit(g: Game, src: Tower | null, sides: number): void {
  g.earn(sides);
  g.stats.sidesBroken += sides;
  if (src) src.sides += sides;
}

/**
 * Applies a hit. Returns true if the hit "connected" (including hits that were blocked
 * by an immunity — those still use up pierce), false if the shape was already gone.
 */
export function damageShape(g: Game, s: Shape, dmg: number, type: DamageType, src: Tower | null, atk: Attack | null): boolean {
  if (!s.alive) return false;
  // immunities
  if (type === 'cold' && s.mods & MOD.CRYSTAL) {
    g.events.push(EV.IMMUNE, s.x, s.y, DMG_INDEX.cold);
    return true;
  }
  if (type === 'explosive' && s.mods & MOD.SHADOW) {
    g.events.push(EV.IMMUNE, s.x, s.y, DMG_INDEX.explosive);
    return true;
  }
  if (type === 'sharp' && s.mods & MOD.ARMOR && !(atk && atk.pierceArmor)) {
    g.events.push(EV.DEFLECT, s.x, s.y, s.radius);
    return true;
  }
  // bonuses
  if (s.bonusUntil >= g.tick) dmg = (dmg + s.bonusAdd) * s.bonusMul;
  if (s.freeze > 0) dmg += s.brittle;
  if (atk) {
    if (s.kind > 0) dmg *= atk.bossMul * (src ? src.stats.bossMul : 1);
    if (s.mods & MOD.ARMOR) dmg += atk.armorBonus;
  }
  s.regrowT = 0;
  s.hitFlash = 0.07;
  if (s.mods & MOD.ARMOR) {
    s.mods &= ~MOD.ARMOR;
    s.rbe = s.kind === 0 ? polyRbe(s.rank, s.mods) : s.rbe;
    g.events.push(EV.ARMOR_BREAK, s.x, s.y, s.radius, 0, 0, s.kind === 0 ? RANKS[s.rank].color : 0xffffff);
    credit(g, src, 1);
    dmg -= 1;
    if (dmg <= 0) return true;
  }
  if (s.kind > 0) {
    s.hp -= dmg;
    if (src) src.sides += dmg;
    g.events.push(EV.BOSS_HIT, s.x, s.y, s.kind);
    if (s.hp <= 0) killBoss(g, s, src);
    return true;
  }
  stripSides(g, s, Math.max(1, Math.round(dmg)), src);
  return true;
}

/** Knocks `hits` sides off a polygon, splitting / shattering as needed. Overflow passes to children. */
export function stripSides(g: Game, s: Shape, hits: number, src: Tower | null, depth = 0): void {
  while (hits > 0 && s.alive) {
    const old = s.rank;
    credit(g, src, 1);
    hits--;
    if (old <= MIN_RANK) {
      destroyShape(g, s, src);
      return;
    }
    const k = splitCount(old, s.mods);
    const color = RANKS[old].color;
    if (k >= 2) {
      g.events.push(EV.SIDE_BREAK, s.x, s.y, old, s.mods, 1, color);
      s.alive = false;
      const childMods = s.mods & INHERITED_MODS;
      for (let c = 0; c < k; c++) {
        const child = spawnPoly(g, old - 1, childMods, s.path, s.dist - c * 9 + 4, s.lane + g.rng.range(-6, 6));
        child.freeze = s.freeze;
        child.brittle = s.brittle;
        child.frozenBy = s.frozenBy;
        child.slow = s.slow;
        child.slowMul = s.slowMul;
        child.back = s.back;
        if (hits > 0 && depth < 12) stripSides(g, child, hits, src, depth + 1);
      }
      return;
    }
    setRank(s, old - 1);
    g.events.push(EV.SIDE_BREAK, s.x, s.y, old, s.mods, 0, color);
  }
}

function destroyShape(g: Game, s: Shape, src: Tower | null): void {
  s.alive = false;
  g.stats.shapesDestroyed++;
  if (src) src.kills++;
  g.events.push(EV.SHATTER, s.x, s.y, s.rank, s.mods, 0, RANKS[s.rank].color);
  if (s.freeze > 0 && s.frozenBy) {
    const t = g.towerById(s.frozenBy);
    if (t) {
      for (const a of t.stats.attacks) if (a.shatter) g.spawnRadial(t, a.shatter, s.x, s.y, g.rng.next() * Math.PI);
    }
  }
}

function killBoss(g: Game, s: Shape, src: Tower | null): void {
  const b = BOSSES[s.kind - 1];
  s.alive = false;
  g.stats.bossesKilled++;
  g.stats.shapesDestroyed++;
  if (src) src.kills++;
  g.earn(Math.round(s.maxHp * BOSS_BOUNTY));
  g.events.push(EV.BOSS_DEATH, s.x, s.y, s.kind, s.radius, b.shake, b.color);
  g.onBossKilled(b.key);
  let k = 0;
  for (const c of b.children) {
    for (let i = 0; i < c.count; i++) {
      const child = spawnSpec(g, c.spec, s.path, s.dist + (k % 2 === 0 ? 1 : -1) * (k * 7) );
      if (child.kind === 0) child.lane = g.rng.range(-16, 16);
      k++;
    }
  }
}
