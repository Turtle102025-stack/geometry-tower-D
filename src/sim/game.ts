import { DIFFICULTIES, SELL_RATE, priceFor, roundBonus, sideIncome, type DifficultyDef, type DifficultyId } from '../data/difficulty';
import type { MapDef } from '../data/maps/types';
import { TOWERS } from '../data/towers';
import type { TowerDef } from '../data/towers/types';
import { activateAbility } from './abilities';
import { spawnDart, updatePending, updateProjectiles, updateSupport, updateTowers } from './combat';
import { DT, PATH_WIDTH, WORLD_H, WORLD_W } from './constants';
import { EV } from './events';
import { EventQueue } from './events';
import { circleHitsArea, pointInArea, segmentHitsArea } from './geometry';
import { SpatialGrid } from './grid';
import { Path } from './path';
import { Rng } from './rng';
import { buildSpawnQueue, getRound, type SpawnEvent } from './rounds';
import { spawnSpec, updateShapes } from './shapesys';
import { parseSpec } from '../data/shapes';
import { canUpgradePath, computeStats } from './towerStats';
import type { Attack, Buff, PendingExplosion, Projectile, Shape, Targeting, Tower } from './types';

export type GameMode = 'normal' | 'sandbox';
export type GameState = 'idle' | 'running' | 'won' | 'lost';

export interface GameOptions {
  map: MapDef;
  difficulty: DifficultyId;
  mode?: GameMode;
  seed?: number;
}

export interface GameStats {
  sidesBroken: number;
  shapesDestroyed: number;
  bossesKilled: number;
  moneyEarned: number;
  moneySpent: number;
  livesLost: number;
  towersPlaced: number;
  abilitiesUsed: number;
}

export interface TowerSnapshot {
  def: string;
  x: number;
  y: number;
  tierA: number;
  tierB: number;
  targeting: Targeting;
  spent: number;
  sides: number;
  kills: number;
  roundsOwned: number;
  incomeEarned: number;
}

export interface GameSnapshot {
  version: 1;
  map: string;
  difficulty: DifficultyId;
  mode: GameMode;
  seed: number;
  rng: number;
  money: number;
  lives: number;
  completed: number;
  freeplay: boolean;
  towers: TowerSnapshot[];
  stats: GameStats;
  nextTowerId: number;
}

export interface PlaceCheck {
  ok: boolean;
  reason?: string;
}

const SANDBOX_MONEY = 999_999_999;

function zeroBuff(): Buff {
  return { rate: 0, range: 0, pierce: 0, damage: 0, detect: false, discount: 0 };
}

/**
 * The whole simulation. Pure logic: no rendering, no DOM, no real time.
 * Advance it only with tick(); read `events` to learn what happened.
 */
export class Game {
  readonly map: MapDef;
  readonly paths: Path[];
  readonly diff: DifficultyDef;
  readonly mode: GameMode;
  readonly seed: number;
  readonly rng: Rng;
  readonly grid = new SpatialGrid(WORLD_W, WORLD_H, 64);
  readonly events = new EventQueue();
  readonly obstacles;
  readonly water;

  tick = 0;
  money: number;
  lives: number;
  /** Rounds fully cleared. The round being played (or next to play) is completed + 1. */
  completed = 0;
  state: GameState = 'idle';
  freeplay = false;
  autoStart = false;
  /** Multiplier on boss HP (freeplay scaling). */
  bossHpMul = 1;
  maxProjectiles = 4000;

  shapes: Shape[] = [];
  shapePool: Shape[] = [];
  projectiles: Projectile[] = [];
  private projPool: Projectile[] = [];
  pending: PendingExplosion[] = [];
  towers: Tower[] = [];
  supportTowers: Tower[] = [];
  nextShapeId = 0;
  nextTowerId = 1;
  stamp = 0;

  stats: GameStats = {
    sidesBroken: 0,
    shapesDestroyed: 0,
    bossesKilled: 0,
    moneyEarned: 0,
    moneySpent: 0,
    livesLost: 0,
    towersPlaced: 0,
    abilitiesUsed: 0,
  };
  /** Boss keys killed this game (for achievements). */
  bossKills: Record<string, number> = {};

  private queue: SpawnEvent[] = [];
  private queueIdx = 0;
  private roundTime = 0;
  private spawnAlt = 0;
  private sandboxQueue: SpawnEvent[] = [];
  private shapeIndex = new Map<number, Shape>();

  constructor(opts: GameOptions) {
    this.map = opts.map;
    this.paths = opts.map.paths.map((p) => new Path(p));
    this.diff = DIFFICULTIES[opts.difficulty];
    this.mode = opts.mode ?? 'normal';
    this.seed = opts.seed ?? 1;
    this.rng = new Rng(this.seed);
    this.money = this.mode === 'sandbox' ? SANDBOX_MONEY : this.diff.startMoney;
    this.lives = this.diff.lives;
    this.obstacles = opts.map.obstacles;
    this.water = opts.map.water;
  }

  // ───────────────────────── round flow ─────────────────────────

  get currentRound(): number {
    return this.completed + 1;
  }

  get finalRound(): number {
    return this.diff.rounds;
  }

  get roundActive(): boolean {
    return this.state === 'running';
  }

  /** Boss keys that appear in a round (for announcements). */
  roundBosses(n: number): string[] {
    const out: string[] = [];
    for (const g of getRound(n, this.seed).groups) {
      const p = parseSpec(g.spec);
      if (p.boss && !out.includes(g.spec)) out.push(g.spec);
    }
    return out;
  }

  startRound(): boolean {
    if (this.state !== 'idle') return false;
    const n = this.currentRound;
    this.queue = buildSpawnQueue(getRound(n, this.seed));
    this.queueIdx = 0;
    this.roundTime = 0;
    this.state = 'running';
    if (n > 80) this.bossHpMul = 1 + (n - 80) * 0.06;
    this.events.push(EV.ROUND_START, 0, 0, n);
    return true;
  }

  /** Spawning finished and nothing left alive. */
  private roundCleared(): boolean {
    if (this.queueIdx < this.queue.length) return false;
    for (const s of this.shapes) if (s.alive) return false;
    return true;
  }

  private finishRound(): void {
    const n = this.currentRound;
    this.completed = n;
    const bonus = this.mode === 'sandbox' ? 0 : roundBonus(n);
    this.money += bonus;
    this.stats.moneyEarned += bonus;
    this.payIncome();
    for (const t of this.towers) t.roundsOwned++;
    this.events.push(EV.ROUND_END, 0, 0, n, bonus);
    this.state = 'idle';
    if (this.mode === 'normal' && !this.freeplay && n >= this.finalRound) {
      this.state = 'won';
      this.events.push(EV.VICTORY, 0, 0, n);
      return;
    }
    if (this.autoStart) this.startRound();
  }

  /** After winning, keep playing generated rounds. */
  continueFreeplay(): void {
    if (this.state !== 'won') return;
    this.freeplay = true;
    this.state = 'idle';
  }

  private payIncome(): void {
    for (const t of this.towers) {
      const inc = t.stats.income;
      if (!inc) continue;
      const growth = Math.min(inc.growthCap, Math.pow(1 + inc.growth, t.roundsOwned));
      let amount = Math.round(inc.perRound * growth);
      if (inc.interest > 0) amount += Math.round(Math.min(inc.interestCap, this.money * inc.interest));
      if (amount <= 0) continue;
      if (this.mode !== 'sandbox') this.money += amount;
      this.stats.moneyEarned += amount;
      t.incomeEarned += amount;
      this.events.push(EV.INCOME, t.x, t.y, amount, 0, 0, t.def.color);
    }
  }

  // ───────────────────────── tick ─────────────────────────

  /** Advance the simulation by exactly one fixed step (1/60 game-second). */
  step(): void {
    if (this.state === 'lost') return;
    this.tick++;
    this.spawnStep();
    updateShapes(this);
    this.grid.build(this.shapes, this.shapes.length);
    updateSupport(this);
    updateTowers(this);
    updateProjectiles(this);
    updatePending(this);
    this.compact();
    if (this.lives <= 0 && this.mode === 'normal' && this.state !== 'won') {
      this.lives = 0;
      this.state = 'lost';
      this.events.push(EV.GAME_OVER, 0, 0, this.currentRound);
      return;
    }
    if (this.state === 'running' && this.roundCleared()) this.finishRound();
  }

  private spawnStep(): void {
    if (this.state === 'running') {
      this.roundTime += DT;
      while (this.queueIdx < this.queue.length && this.queue[this.queueIdx].time <= this.roundTime) {
        const e = this.queue[this.queueIdx++];
        this.spawnAt(e.spec, e.path);
      }
    }
    if (this.sandboxQueue.length) {
      for (const e of this.sandboxQueue) e.time -= DT;
      while (this.sandboxQueue.length && this.sandboxQueue[0].time <= 0) {
        const e = this.sandboxQueue.shift()!;
        this.spawnAt(e.spec, e.path);
      }
    }
  }

  private spawnAt(spec: string, path: number): void {
    const p = path >= 0 && path < this.paths.length ? path : this.spawnAlt++ % this.paths.length;
    const s = spawnSpec(this, spec, p, 0);
    this.shapeIndex.set(s.id, s);
  }

  /** Sandbox: queue shapes to spawn right away. */
  sandboxSpawn(spec: string, count: number, gap = 0.25, path = -1): void {
    const base = this.sandboxQueue.length ? this.sandboxQueue[this.sandboxQueue.length - 1].time : 0;
    for (let i = 0; i < count; i++) this.sandboxQueue.push({ time: base + i * gap, spec, path });
  }

  /** Sandbox: remove every shape on the field (no rewards). */
  sandboxClear(): void {
    for (const s of this.shapes) s.alive = false;
    this.sandboxQueue.length = 0;
    if (this.state === 'running') this.queueIdx = this.queue.length;
  }

  /** Sandbox: jump to a round number (the next Start plays it). */
  sandboxSetRound(n: number): void {
    if (this.state === 'running') return;
    this.completed = Math.max(0, n - 1);
  }

  private compact(): void {
    const sh = this.shapes;
    let w = 0;
    for (let i = 0; i < sh.length; i++) {
      const s = sh[i];
      if (s.alive) {
        sh[w++] = s;
        if (!this.shapeIndex.has(s.id)) this.shapeIndex.set(s.id, s);
      } else {
        this.shapeIndex.delete(s.id);
        this.shapePool.push(s);
      }
    }
    sh.length = w;
    const pr = this.projectiles;
    w = 0;
    for (let i = 0; i < pr.length; i++) {
      const p = pr[i];
      if (p.alive) pr[w++] = p;
      else this.projPool.push(p);
    }
    pr.length = w;
  }

  // ───────────────────────── helpers used by systems ─────────────────────────

  earn(sides: number): void {
    if (this.mode === 'sandbox') return;
    const v = sides * sideIncome(this.currentRound);
    this.money += v;
    this.stats.moneyEarned += v;
  }

  onBossKilled(key: string): void {
    this.bossKills[key] = (this.bossKills[key] ?? 0) + 1;
  }

  shapeRef(id: number): Shape | null {
    const s = this.shapeIndex.get(id);
    return s && s.alive && s.id === id ? s : null;
  }

  towerById(id: number): Tower | null {
    for (const t of this.towers) if (t.id === id) return t;
    return null;
  }

  newProjectile(): Projectile {
    const p =
      this.projPool.pop() ??
      ({
        alive: true,
        type: 0,
        x: 0,
        y: 0,
        px: 0,
        py: 0,
        vx: 0,
        vy: 0,
        life: 0,
        damage: 0,
        pierce: 0,
        attack: null as unknown as Attack,
        tower: null,
        hits: [],
        rot: 0,
        sx: 0,
        sy: 0,
        tx: 0,
        ty: 0,
        t: 0,
        tTotal: 0,
      } as Projectile);
    p.alive = true;
    p.hits.length = 0;
    this.projectiles.push(p);
    return p;
  }

  /** Radial burst of sub-projectiles (Vector Field, ice shards…). */
  spawnRadial(t: Tower | null, a: Attack, x: number, y: number, angle0: number): void {
    const range = a.travel || 120;
    for (let k = 0; k < a.count; k++) {
      const p = spawnDart(this, t, a, x, y, angle0 + (k / a.count) * Math.PI * 2, range);
      if (p) {
        p.x = p.px = x;
        p.y = p.py = y;
        p.damage = a.damage;
        p.pierce = a.pierce;
      }
    }
  }

  losBlocked(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const o of this.obstacles) if (segmentHitsArea(o, x1, y1, x2, y2)) return true;
    return false;
  }

  pointBlocked(x: number, y: number): boolean {
    for (const o of this.obstacles) if (pointInArea(o, x, y)) return true;
    return false;
  }

  inWater(x: number, y: number): boolean {
    let wet = false;
    for (const w of this.water)
      if (pointInArea(w, x, y)) {
        wet = true;
        break;
      }
    if (!wet) return false;
    for (const l of this.map.land ?? []) if (pointInArea(l, x, y)) return false;
    return true;
  }

  // ───────────────────────── player commands ─────────────────────────

  canAfford(cost: number): boolean {
    return this.mode === 'sandbox' || this.money >= cost;
  }

  private spend(cost: number): void {
    if (this.mode === 'sandbox') return;
    this.money -= cost;
    this.stats.moneySpent += cost;
  }

  towerPrice(def: TowerDef): number {
    return priceFor(def.cost, this.diff);
  }

  upgradePrice(t: Tower, path: 0 | 1): number {
    const tier = path === 0 ? t.tierA : t.tierB;
    if (tier >= 4) return 0;
    return priceFor(t.def.paths[path].upgrades[tier].cost, this.diff, t.buff.discount);
  }

  sellValue(t: Tower): number {
    return Math.floor(t.spent * SELL_RATE);
  }

  checkPlacement(def: TowerDef, x: number, y: number, ignore?: Tower): PlaceCheck {
    const r = def.radius;
    if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return { ok: false, reason: 'Out of bounds' };
    for (const p of this.paths) {
      if (p.distanceTo(x, y) < PATH_WIDTH / 2 + r - 4) return { ok: false, reason: 'On the path' };
    }
    for (const o of this.obstacles) if (circleHitsArea(o, x, y, r - 2)) return { ok: false, reason: 'Blocked' };
    const wet = this.inWater(x, y);
    if (def.water && !wet) return { ok: false, reason: 'Must be on water' };
    if (!def.water && wet) return { ok: false, reason: 'Can’t build on water' };
    for (const t of this.towers) {
      if (t === ignore) continue;
      const rr = t.def.radius + r - 2;
      if ((t.x - x) ** 2 + (t.y - y) ** 2 < rr * rr) return { ok: false, reason: 'Too close to a tower' };
    }
    return { ok: true };
  }

  placeTower(defId: string, x: number, y: number, free = false): Tower | null {
    const def = TOWERS[defId];
    if (!def) return null;
    const cost = free ? 0 : this.towerPrice(def);
    if (!this.canAfford(cost)) return null;
    if (!this.checkPlacement(def, x, y).ok) return null;
    this.spend(cost);
    const t = this.addTower(def, x, y, 0, 0);
    t.spent = cost;
    this.stats.towersPlaced++;
    this.events.push(EV.PLACE, x, y, t.id, 0, 0, def.color);
    return t;
  }

  private addTower(def: TowerDef, x: number, y: number, tierA: number, tierB: number, id?: number): Tower {
    const stats = computeStats(def, tierA, tierB);
    const t: Tower = {
      id: id ?? this.nextTowerId++,
      def,
      x,
      y,
      tierA,
      tierB,
      targeting: 'first',
      spent: 0,
      sides: 0,
      kills: 0,
      stats,
      cds: stats.attacks.map(() => 0),
      angle: -Math.PI / 2,
      buff: zeroBuff(),
      abilityCd: 0,
      beams: [],
      orbitAngle: 0,
      orbitHits: new Map(),
      burstSpin: 0,
      roundsOwned: 0,
      sinceShot: 99,
      incomeEarned: 0,
    };
    this.towers.push(t);
    this.refreshTowers();
    return t;
  }

  canUpgrade(t: Tower, path: 0 | 1): boolean {
    return canUpgradePath(t.tierA, t.tierB, path);
  }

  upgrade(t: Tower, path: 0 | 1): boolean {
    if (!this.canUpgrade(t, path)) return false;
    const cost = this.upgradePrice(t, path);
    if (!this.canAfford(cost)) return false;
    this.spend(cost);
    t.spent += cost;
    if (path === 0) t.tierA++;
    else t.tierB++;
    this.applyStats(t);
    this.refreshTowers();
    this.events.push(EV.UPGRADE, t.x, t.y, t.id, path === 0 ? t.tierA : t.tierB, path, t.def.color);
    return true;
  }

  private applyStats(t: Tower): void {
    const prevAbility = t.stats.ability;
    t.stats = computeStats(t.def, t.tierA, t.tierB);
    while (t.cds.length < t.stats.attacks.length) t.cds.push(0);
    t.cds.length = t.stats.attacks.length;
    t.beams.length = 0;
    if (t.stats.ability && t.stats.ability !== prevAbility) t.abilityCd = 0;
  }

  sell(t: Tower): number {
    const i = this.towers.indexOf(t);
    if (i < 0) return 0;
    const v = this.sellValue(t);
    this.towers.splice(i, 1);
    if (this.mode !== 'sandbox') this.money += v;
    this.refreshTowers();
    this.events.push(EV.SELL, t.x, t.y, v, 0, 0, t.def.color);
    return v;
  }

  setTargeting(t: Tower, mode: Targeting): void {
    t.targeting = mode;
  }

  useAbility(t: Tower): boolean {
    const ok = activateAbility(this, t);
    if (ok) this.stats.abilitiesUsed++;
    return ok;
  }

  /** Recomputes support lists and buffs after any tower change. */
  refreshTowers(): void {
    this.supportTowers = this.towers.filter((t) => t.stats.support);
    for (const t of this.towers) {
      const b = zeroBuff();
      for (const c of this.supportTowers) {
        if (c === t) continue;
        const sp = c.stats.support!;
        if (sp.buffRate <= 0 && sp.buffRange <= 0 && sp.buffPierce <= 0 && sp.buffDamage <= 0 && !sp.buffDetect && sp.discount <= 0) continue;
        const r = c.stats.range + t.def.radius;
        if ((c.x - t.x) ** 2 + (c.y - t.y) ** 2 > r * r) continue;
        b.rate = Math.max(b.rate, sp.buffRate);
        b.range = Math.max(b.range, sp.buffRange);
        b.pierce = Math.max(b.pierce, sp.buffPierce);
        b.damage = Math.max(b.damage, sp.buffDamage);
        b.detect = b.detect || sp.buffDetect;
        b.discount = Math.max(b.discount, sp.discount);
      }
      t.buff = b;
    }
  }

  // ───────────────────────── save / load ─────────────────────────

  /** Snapshot for saving between rounds. */
  snapshot(): GameSnapshot {
    return {
      version: 1,
      map: this.map.id,
      difficulty: this.diff.id,
      mode: this.mode,
      seed: this.seed,
      rng: this.rng.state,
      money: this.money,
      lives: this.lives,
      completed: this.completed,
      freeplay: this.freeplay,
      towers: this.towers.map((t) => ({
        def: t.def.id,
        x: t.x,
        y: t.y,
        tierA: t.tierA,
        tierB: t.tierB,
        targeting: t.targeting,
        spent: t.spent,
        sides: t.sides,
        kills: t.kills,
        roundsOwned: t.roundsOwned,
        incomeEarned: t.incomeEarned,
      })),
      stats: { ...this.stats },
      nextTowerId: this.nextTowerId,
    };
  }

  static restore(snap: GameSnapshot, map: MapDef): Game {
    const g = new Game({ map, difficulty: snap.difficulty, mode: snap.mode, seed: snap.seed });
    g.rng.state = snap.rng;
    g.money = snap.money;
    g.lives = snap.lives;
    g.completed = snap.completed;
    g.freeplay = snap.freeplay;
    g.stats = { ...g.stats, ...snap.stats };
    for (const ts of snap.towers) {
      const def = TOWERS[ts.def];
      if (!def) continue;
      const t = g.addTower(def, ts.x, ts.y, ts.tierA, ts.tierB);
      t.targeting = ts.targeting;
      t.spent = ts.spent;
      t.sides = ts.sides;
      t.kills = ts.kills;
      t.roundsOwned = ts.roundsOwned;
      t.incomeEarned = ts.incomeEarned ?? 0;
    }
    g.nextTowerId = Math.max(g.nextTowerId, snap.nextTowerId);
    g.refreshTowers();
    return g;
  }
}
