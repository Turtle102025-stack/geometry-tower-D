import { Container, Graphics, Sprite, type Application } from 'pixi.js';
import { BOSSES } from '../data/bosses';
import { RANKS } from '../data/shapes';
import type { TowerDef } from '../data/towers/types';
import { WORLD_H, WORLD_W } from '../sim/constants';
import { EV, type GameEvent } from '../sim/events';
import type { Game } from '../sim/game';
import { towerRange } from '../sim/combat';
import { MOD, type Tower } from '../sim/types';
import { BossView } from './bossArt';
import { Effects, type Quality } from './effects';
import { buildMapArt } from './mapArt';
import { lighten, neonStroke } from './neon';
import { TextureBank, rainbowColor } from './textures';
import { buildTowerArt, type TowerArt } from './towerArt';

interface TowerView {
  root: Container;
  art: TowerArt;
  aura: Sprite | null;
  key: string;
}

interface Tracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  max: number;
  color: number;
  width: number;
}

export interface PlacementPreview {
  def: TowerDef;
  x: number;
  y: number;
  ok: boolean;
}

const DMG_COLORS = [0xffffff, 0xff9a3d, 0x9fe8ff, 0xff4fd8];

export type EventListener = (e: GameEvent) => void;

/** Draws a Game. Reads sim state only; never changes it. */
export class GameRenderer {
  readonly world = new Container();
  private mapLayer = new Container();
  private rangeLayer = new Graphics();
  private towerLayer = new Container();
  private haloLayer = new Container();
  private shapeLayer = new Container();
  private bossLayer = new Container();
  private projLayer = new Container();
  private beamLayer = new Graphics();
  private overlay = new Graphics();
  private ghostLayer = new Container();
  readonly fx: Effects;
  private shapeSprites: Sprite[] = [];
  private haloSprites: Sprite[] = [];
  private projSprites: Sprite[] = [];
  private bosses = new Map<number, BossView>();
  private towerViews = new Map<number, TowerView>();
  private tracers: Tracer[] = [];
  private shake = 0;
  private time = 0;
  private scale = 1;
  private offX = 0;
  private offY = 0;
  private listeners: EventListener[] = [];
  private ghostKey = '';
  private ghostArt: TowerArt | null = null;
  selected: Tower | null = null;
  placement: PlacementPreview | null = null;
  shakeEnabled = true;
  private bossHitThrottle = 0;

  constructor(
    private app: Application,
    readonly tex: TextureBank,
    private game: Game,
  ) {
    this.fx = new Effects(tex);
    this.haloLayer.blendMode = 'add';
    this.world.addChild(
      this.mapLayer,
      this.rangeLayer,
      this.towerLayer,
      this.haloLayer,
      this.shapeLayer,
      this.bossLayer,
      this.projLayer,
      this.beamLayer,
      this.fx.layer,
      this.overlay,
      this.ghostLayer,
      this.fx.textLayer,
    );
    const { root } = buildMapArt(game.map, game.paths);
    this.mapLayer.addChild(root);
    app.stage.addChild(this.world);
    this.layout();
  }

  onEvent(fn: EventListener): void {
    this.listeners.push(fn);
  }

  setQuality(q: Quality): void {
    this.fx.setQuality(q);
  }

  destroy(): void {
    this.app.stage.removeChild(this.world);
    for (const b of this.bosses.values()) b.destroy();
    this.fx.clear();
    this.world.destroy({ children: true });
  }

  /** Fit the 1280×720 world into the canvas. */
  layout(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.scale = Math.min(w / WORLD_W, h / WORLD_H);
    this.offX = (w - WORLD_W * this.scale) / 2;
    this.offY = (h - WORLD_H * this.scale) / 2;
    this.world.scale.set(this.scale);
    this.world.position.set(this.offX, this.offY);
  }

  toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    return { x: (clientX - rect.left - this.offX) / this.scale, y: (clientY - rect.top - this.offY) / this.scale };
  }

  toScreen(x: number, y: number): { x: number; y: number } {
    return { x: x * this.scale + this.offX, y: y * this.scale + this.offY };
  }

  /** Called once per animation frame. `alpha` interpolates between the last two sim ticks. */
  render(dt: number, alpha: number): void {
    this.time += dt;
    this.drainEvents();
    this.syncShapes(alpha);
    this.syncProjectiles(alpha);
    this.syncTowers(dt);
    this.drawBeams(dt);
    this.drawOverlay();
    this.fx.update(dt);
    // screen shake
    if (this.shake > 0.1 && this.shakeEnabled) {
      this.world.position.set(this.offX + (Math.random() - 0.5) * this.shake * this.scale, this.offY + (Math.random() - 0.5) * this.shake * this.scale);
      this.shake *= Math.pow(0.0015, dt);
    } else {
      this.shake = 0;
      this.world.position.set(this.offX, this.offY);
    }
  }

  private syncShapes(alpha: number): void {
    const shapes = this.game.shapes;
    let n = 0;
    let h = 0;
    const seenBoss = new Set<number>();
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 7);
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i];
      if (!s.alive) continue;
      const x = s.px + (s.x - s.px) * alpha;
      const y = s.py + (s.y - s.py) * alpha;
      if (s.kind > 0) {
        let v = this.bosses.get(s.id);
        if (!v) {
          v = new BossView(s.kind, s.id * 2654435761);
          this.bosses.set(s.id, v);
          this.bossLayer.addChild(v.container);
        }
        seenBoss.add(s.id);
        v.container.position.set(x, y);
        const def = BOSSES[s.kind - 1];
        v.draw(def.radius, s.rot, s.hp / s.maxHp, s.hitFlash, s.slow > 0, this.fx.mul);
        continue;
      }
      let sp = this.shapeSprites[n];
      if (!sp) {
        sp = new Sprite();
        sp.anchor.set(0.5);
        this.shapeSprites.push(sp);
        this.shapeLayer.addChild(sp);
      }
      sp.visible = true;
      sp.texture = this.tex.shape(s.rank, s.mods);
      sp.position.set(x, y);
      sp.rotation = s.rot;
      const ghost = (s.mods & MOD.GHOST) !== 0;
      sp.alpha = ghost ? (s.revealedUntil >= this.game.tick ? 0.85 : 0.55) : 1;
      sp.tint = s.freeze > 0 ? 0x9fdcff : s.slow > 0 ? 0xc8ecff : 0xffffff;
      sp.scale.set(s.hitFlash > 0 ? 1.18 : 1);
      n++;
      if (s.mods & MOD.REGROW) {
        let hs = this.haloSprites[h];
        if (!hs) {
          hs = new Sprite(this.tex.glow);
          hs.anchor.set(0.5);
          this.haloSprites.push(hs);
          this.haloLayer.addChild(hs);
        }
        hs.visible = true;
        hs.position.set(x, y);
        hs.tint = RANKS[s.rank].color;
        hs.scale.set((s.radius / 26) * (1 + 0.25 * pulse));
        hs.alpha = 0.35 + 0.4 * pulse;
        h++;
      }
    }
    for (let i = n; i < this.shapeSprites.length; i++) this.shapeSprites[i].visible = false;
    for (let i = h; i < this.haloSprites.length; i++) this.haloSprites[i].visible = false;
    for (const [id, v] of this.bosses) {
      if (!seenBoss.has(id)) {
        v.destroy();
        this.bosses.delete(id);
      }
    }
  }

  private syncProjectiles(alpha: number): void {
    const list = this.game.projectiles;
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.alive) continue;
      let sp = this.projSprites[n];
      if (!sp) {
        sp = new Sprite();
        sp.anchor.set(0.5);
        this.projSprites.push(sp);
        this.projLayer.addChild(sp);
      }
      sp.visible = true;
      const style = p.attack.style;
      sp.texture = this.tex.projectile(p.type === 1 ? style || 'shell' : style);
      let x = p.px + (p.x - p.px) * alpha;
      let y = p.py + (p.y - p.py) * alpha;
      if (p.type === 1) {
        const f = Math.min(1, (p.t + alpha / 60) / p.tTotal);
        const dist = Math.hypot(p.tx - p.sx, p.ty - p.sy);
        const lift = Math.sin(f * Math.PI) * Math.min(70, dist * 0.3);
        y -= lift;
        sp.scale.set(1 + lift / 70);
        sp.rotation = this.time * 8;
      } else {
        sp.rotation = p.rot;
        sp.scale.set(1);
      }
      sp.tint = style === 'rainbow' || style === 'color' ? rainbowColor(i) : 0xffffff;
      sp.position.set(x, y);
      n++;
    }
    for (let i = n; i < this.projSprites.length; i++) this.projSprites[i].visible = false;
  }

  private syncTowers(dt: number): void {
    const seen = new Set<number>();
    for (const t of this.game.towers) {
      seen.add(t.id);
      const key = `${t.tierA}-${t.tierB}`;
      let v = this.towerViews.get(t.id);
      if (!v || v.key !== key) {
        if (v) {
          this.towerLayer.removeChild(v.root);
          v.root.destroy({ children: true });
        }
        v = this.makeTowerView(t.def, t.tierA, t.tierB);
        v.key = key;
        v.root.position.set(t.x, t.y);
        this.towerLayer.addChild(v.root);
        this.towerViews.set(t.id, v);
      }
      const art = v.art;
      if (art.spin) art.head.rotation += art.spin * dt * (t.sinceShot < 1 ? 3 : 1);
      else if (art.aims) {
        // ease toward the aim angle
        let d = t.angle - art.head.rotation;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        art.head.rotation += d * Math.min(1, dt * 18);
      }
      const recoil = t.sinceShot < 0.08 ? (1 - t.sinceShot / 0.08) * 3 : 0;
      art.head.position.set(-Math.cos(art.head.rotation) * recoil, -Math.sin(art.head.rotation) * recoil);
      if (v.aura) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 3 + t.id);
        v.aura.alpha = 0.25 + 0.3 * pulse;
        v.aura.scale.set(1.25 + 0.12 * pulse);
      }
    }
    for (const [id, v] of this.towerViews) {
      if (!seen.has(id)) {
        this.towerLayer.removeChild(v.root);
        v.root.destroy({ children: true });
        this.towerViews.delete(id);
      }
    }
  }

  private makeTowerView(def: TowerDef, a: number, b: number): TowerView {
    const art = buildTowerArt(def.id, a, b, def.color);
    const root = new Container();
    let aura: Sprite | null = null;
    if (art.aura) {
      aura = new Sprite(this.tex.glow);
      aura.anchor.set(0.5);
      aura.tint = def.color;
      aura.blendMode = 'add';
      root.addChild(aura);
    }
    root.addChild(art.base, art.head);
    return { root, art, aura, key: '' };
  }

  /** Builds standalone tower art (used for shop icons). */
  static iconArt(def: TowerDef): Container {
    const art = buildTowerArt(def.id, 0, 0, def.color);
    const c = new Container();
    art.head.rotation = art.aims ? -Math.PI / 4 : 0;
    c.addChild(art.base, art.head);
    return c;
  }

  private drawBeams(dt: number): void {
    const g = this.beamLayer;
    g.clear();
    for (const t of this.game.towers) {
      t.stats.attacks.forEach((a, i) => {
        if (a.kind === 'beam') {
          const beams = t.beams[i];
          if (!beams) return;
          beams.forEach((b, k) => {
            const color = a.targets >= 5 ? rainbowColor(k) : t.def.color;
            const w = 2 + Math.min(6, b.heat * 0.6);
            const flick = 0.75 + Math.random() * 0.25;
            g.moveTo(t.x, t.y).lineTo(b.x, b.y);
            g.stroke({ width: w + 8, color, alpha: 0.12 * flick, cap: 'round' });
            g.moveTo(t.x, t.y).lineTo(b.x, b.y);
            g.stroke({ width: w, color, alpha: 0.9 * flick, cap: 'round' });
            g.moveTo(t.x, t.y).lineTo(b.x, b.y);
            g.stroke({ width: Math.max(1, w * 0.35), color: 0xffffff, alpha: flick, cap: 'round' });
            g.circle(b.x, b.y, 4 + w).fill({ color, alpha: 0.3 });
          });
        } else if (a.kind === 'orbit' && a.orbit) {
          const o = a.orbit;
          const range = o.radius;
          g.circle(t.x, t.y, range).stroke({ width: 1, color: t.def.color, alpha: 0.18 });
          for (let k = 0; k < o.blades; k++) {
            const ang = t.orbitAngle + (k / o.blades) * Math.PI * 2;
            const bx = t.x + Math.cos(ang) * range;
            const by = t.y + Math.sin(ang) * range;
            const c = Math.cos(ang + Math.PI / 2);
            const s = Math.sin(ang + Math.PI / 2);
            const L = o.bladeRadius + 2;
            g.poly([bx + c * L, by + s * L, bx - s * 3, by + c * 3, bx - c * L, by - s * L, bx + s * 3, by - c * 3]);
            neonStroke(g, t.def.color, 1.6, 0.8);
          }
        }
      });
    }
    // tracers
    let w = 0;
    for (const tr of this.tracers) {
      tr.life -= dt;
      if (tr.life <= 0) continue;
      const f = tr.life / tr.max;
      g.moveTo(tr.x1, tr.y1).lineTo(tr.x2, tr.y2).stroke({ width: tr.width * 3, color: tr.color, alpha: 0.15 * f, cap: 'round' });
      g.moveTo(tr.x1, tr.y1).lineTo(tr.x2, tr.y2).stroke({ width: tr.width, color: lighten(tr.color, 0.5), alpha: f, cap: 'round' });
      this.tracers[w++] = tr;
    }
    this.tracers.length = w;
  }

  private drawOverlay(): void {
    const g = this.overlay;
    g.clear();
    const t = this.selected;
    if (t && this.game.towers.includes(t)) {
      const r = towerRange(t);
      if (r < 1000) {
        g.circle(t.x, t.y, r).fill({ color: 0xffffff, alpha: 0.05 });
        g.circle(t.x, t.y, r).stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 });
      }
      g.circle(t.x, t.y, t.def.radius + 6).stroke({ width: 2, color: t.def.color, alpha: 0.9 });
      if (t.stats.support && t.stats.support.buffRate + t.stats.support.buffRange + t.stats.support.buffPierce + t.stats.support.buffDamage > 0) {
        for (const o of this.game.towers) {
          if (o !== t && (o.x - t.x) ** 2 + (o.y - t.y) ** 2 <= (r + o.def.radius) ** 2) {
            g.circle(o.x, o.y, o.def.radius + 4).stroke({ width: 1.5, color: t.def.color, alpha: 0.7 });
          }
        }
      }
    }
    const p = this.placement;
    if (p) {
      const color = p.ok ? 0x39ff88 : 0xff3d6e;
      const range = p.def.base().range;
      if (range < 1000) {
        g.circle(p.x, p.y, range).fill({ color, alpha: 0.1 });
        g.circle(p.x, p.y, range).stroke({ width: 2, color, alpha: 0.7 });
      }
      g.circle(p.x, p.y, p.def.radius).stroke({ width: 2, color, alpha: 0.9 });
      const key = p.def.id;
      if (this.ghostKey !== key) {
        this.ghostLayer.removeChildren().forEach((c) => c.destroy({ children: true }));
        this.ghostArt = buildTowerArt(p.def.id, 0, 0, p.def.color);
        this.ghostLayer.addChild(this.ghostArt.base, this.ghostArt.head);
        this.ghostKey = key;
      }
      this.ghostLayer.visible = true;
      this.ghostLayer.position.set(p.x, p.y);
      this.ghostLayer.alpha = p.ok ? 0.85 : 0.45;
    } else {
      this.ghostLayer.visible = false;
    }
  }

  private drainEvents(): void {
    const q = this.game.events;
    const fx = this.fx;
    this.bossHitThrottle = Math.max(0, this.bossHitThrottle - 1);
    for (let i = 0; i < q.length; i++) {
      const e = q.get(i);
      for (const l of this.listeners) l(e);
      switch (e.type) {
        case EV.SIDE_BREAK: {
          const big = e.c === 1;
          fx.shards(e.x, e.y, e.color, big ? 7 : 3, big ? 260 : 170, big ? 1.2 : 0.9);
          if (big) fx.ring(e.x, e.y, e.color, 8, 34, 0.3, 0.8);
          break;
        }
        case EV.SHATTER:
          fx.shards(e.x, e.y, e.color, 9, 280, 1.1);
          fx.ring(e.x, e.y, e.color, 6, 30, 0.28, 0.9);
          fx.flash(e.x, e.y, e.color, 26, 0.18, 0.7);
          break;
        case EV.ARMOR_BREAK:
          fx.shards(e.x, e.y, 0xc8d3e6, 10, 240, 1.3);
          fx.ring(e.x, e.y, 0xffffff, 10, 36, 0.25);
          break;
        case EV.DEFLECT:
          fx.sparks(e.x, e.y, 0xffffff, 2, 120);
          break;
        case EV.IMMUNE:
          fx.ring(e.x, e.y, DMG_COLORS[e.a], 6, 18, 0.2, 0.6);
          break;
        case EV.LEAK:
          fx.flash(e.x, e.y, 0xff3d6e, 50, 0.4);
          fx.popup(Math.max(30, Math.min(WORLD_W - 30, e.x)), Math.max(30, Math.min(WORLD_H - 30, e.y)), `-${e.a}`, 0xff3d6e, 20);
          this.shake = Math.max(this.shake, e.b > 0 ? 14 : 3);
          break;
        case EV.SHOT:
          if (e.c !== 1) fx.flash(e.x + Math.cos(e.b) * 16, e.y + Math.sin(e.b) * 16, e.color, 10, 0.08, 0.6);
          break;
        case EV.EXPLOSION: {
          const c = DMG_COLORS[e.b] ?? 0xffffff;
          fx.ring(e.x, e.y, c, e.a * 0.3, e.a, 0.3, 0.9);
          fx.flash(e.x, e.y, c, e.a * 0.9, 0.22, 0.7);
          fx.sparks(e.x, e.y, c, Math.min(10, 3 + e.a / 8), e.a * 4);
          break;
        }
        case EV.PULSE:
          fx.ring(e.x, e.y, e.color, 12, e.a, 0.45, 0.7);
          break;
        case EV.TRACER:
          this.tracers.push({ x1: e.x, y1: e.y, x2: e.a, y2: e.b, life: 0.14, max: 0.14, color: e.color, width: e.c === 2 ? 4 : e.c === 1 ? 2 : 3 });
          break;
        case EV.BOSS_HIT:
          if (this.bossHitThrottle === 0) {
            fx.sparks(e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 30, BOSSES[e.a - 1].color, 2, 160);
            this.bossHitThrottle = 2;
          }
          break;
        case EV.BOSS_DEATH:
          fx.flash(e.x, e.y, 0xffffff, e.b * 4, 0.5, 1);
          fx.ring(e.x, e.y, e.color, e.b, e.b * 5, 0.6);
          fx.ring(e.x, e.y, 0xffffff, e.b * 0.5, e.b * 3, 0.45);
          fx.shards(e.x, e.y, e.color, 40, 520, 2.2);
          fx.shards(e.x, e.y, 0xffffff, 16, 380, 1.5);
          this.shake = Math.max(this.shake, e.c);
          break;
        case EV.INCOME:
          fx.popup(e.x, e.y - 24, `+$${e.a}`, 0xffd23f, 18);
          fx.sparks(e.x, e.y, 0xffd23f, 8, 120);
          break;
        case EV.FREEZE:
          fx.ring(e.x, e.y, 0x9fe8ff, 4, e.a + 8, 0.25, 0.6);
          break;
        case EV.FOLD:
          this.tracers.push({ x1: e.x, y1: e.y, x2: e.a, y2: e.b, life: 0.3, max: 0.3, color: e.color, width: 2 });
          fx.ring(e.a, e.b, e.color, 4, 26, 0.3);
          break;
        case EV.ABILITY:
          fx.ring(e.x, e.y, e.color, 20, Math.min(900, e.b), 0.8, 1);
          fx.flash(e.x, e.y, e.color, Math.min(300, e.b), 0.5, 0.8);
          this.shake = Math.max(this.shake, 10);
          break;
        case EV.PLACE:
          fx.ring(e.x, e.y, e.color, 10, 46, 0.35);
          fx.sparks(e.x, e.y, e.color, 10, 160);
          break;
        case EV.UPGRADE:
          fx.ring(e.x, e.y, e.color, 10, e.b >= 4 ? 120 : 50, e.b >= 4 ? 0.7 : 0.4);
          fx.sparks(e.x, e.y, e.color, e.b >= 4 ? 30 : 12, e.b >= 4 ? 300 : 160);
          if (e.b >= 4) {
            fx.flash(e.x, e.y, e.color, 140, 0.5, 0.9);
            this.shake = Math.max(this.shake, 6);
          }
          break;
        case EV.SELL:
          fx.popup(e.x, e.y - 20, `+$${e.a}`, 0xffd23f, 16);
          fx.shards(e.x, e.y, e.color, 12, 200);
          break;
        case EV.REGROW:
          fx.ring(e.x, e.y, e.color, 4, 20, 0.25, 0.6);
          break;
      }
    }
    q.clear();
  }
}
