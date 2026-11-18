import { Container, Sprite, Text, type Texture } from 'pixi.js';
import type { TextureBank } from './textures';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  spin: number;
  s0: number;
  s1: number;
  a0: number;
  drag: number;
  grow: boolean;
}

interface Popup {
  text: Text;
  life: number;
  vy: number;
}

export type Quality = 'low' | 'medium' | 'high';
const QUALITY_MUL: Record<Quality, number> = { low: 0.3, medium: 0.65, high: 1 };

/** Pooled additive particle system for shards, rings, flashes and sparks. */
export class Effects {
  readonly layer = new Container();
  readonly textLayer = new Container();
  private live: Particle[] = [];
  private pool: Particle[] = [];
  private popups: Popup[] = [];
  private popupPool: Text[] = [];
  mul = 1;
  maxParticles = 2600;

  constructor(private tex: TextureBank) {
    this.layer.blendMode = 'add';
  }

  setQuality(q: Quality): void {
    this.mul = QUALITY_MUL[q];
    this.maxParticles = q === 'low' ? 700 : q === 'medium' ? 1600 : 2600;
  }

  private spawn(texture: Texture, x: number, y: number, color: number, life: number): Particle | null {
    if (this.live.length >= this.maxParticles) return null;
    let p = this.pool.pop();
    if (!p) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      p = { sprite, vx: 0, vy: 0, life: 0, max: 0, spin: 0, s0: 1, s1: 1, a0: 1, drag: 0.9, grow: false };
    }
    p.sprite.texture = texture;
    p.sprite.position.set(x, y);
    p.sprite.tint = color;
    p.sprite.rotation = 0;
    p.sprite.alpha = 1;
    p.sprite.visible = true;
    p.life = life;
    p.max = life;
    p.vx = 0;
    p.vy = 0;
    p.spin = 0;
    p.s0 = 1;
    p.s1 = 1;
    p.a0 = 1;
    p.drag = 0.9;
    p.grow = false;
    this.layer.addChild(p.sprite);
    this.live.push(p);
    return p;
  }

  /** Little glowing slivers flying off (a side breaking). */
  shards(x: number, y: number, color: number, count: number, speed: number, size = 1): void {
    const n = Math.max(1, Math.round(count * this.mul));
    for (let i = 0; i < n; i++) {
      const p = this.spawn(this.tex.shard, x, y, color, 0.35 + Math.random() * 0.35);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v;
      p.sprite.rotation = a;
      p.spin = (Math.random() - 0.5) * 18;
      p.s0 = size * (0.7 + Math.random() * 0.6);
      p.s1 = p.s0 * 0.3;
      p.drag = 0.9;
    }
  }

  sparks(x: number, y: number, color: number, count: number, speed: number): void {
    const n = Math.max(1, Math.round(count * this.mul));
    for (let i = 0; i < n; i++) {
      const p = this.spawn(this.tex.spark, x, y, color, 0.25 + Math.random() * 0.3);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random());
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v;
      p.s0 = 1;
      p.s1 = 0.2;
      p.drag = 0.88;
    }
  }

  ring(x: number, y: number, color: number, r0: number, r1: number, life: number, alpha = 1): void {
    const p = this.spawn(this.tex.ring, x, y, color, life);
    if (!p) return;
    p.s0 = r0 / 30;
    p.s1 = r1 / 30;
    p.a0 = alpha;
    p.grow = true;
  }

  flash(x: number, y: number, color: number, radius: number, life: number, alpha = 0.9): void {
    const p = this.spawn(this.tex.glow, x, y, color, life);
    if (!p) return;
    p.s0 = radius / 36;
    p.s1 = (radius / 36) * 1.3;
    p.a0 = alpha;
    p.grow = true;
  }

  /** A floating label (income, lives lost). */
  popup(x: number, y: number, text: string, color: number, size = 18): void {
    if (this.popups.length > 30) return;
    const t =
      this.popupPool.pop() ??
      new Text({ text: '', style: { fontFamily: 'Orbitron, sans-serif', fontSize: size, fontWeight: '800', fill: 0xffffff, stroke: { color: 0x000000, width: 4 } } });
    t.text = text;
    t.style.fill = color;
    t.style.fontSize = size;
    t.anchor.set(0.5);
    t.position.set(x, y);
    t.alpha = 1;
    this.textLayer.addChild(t);
    this.popups.push({ text: t, life: 1.2, vy: -40 });
  }

  update(dt: number): void {
    const live = this.live;
    let w = 0;
    for (let i = 0; i < live.length; i++) {
      const p = live[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        this.layer.removeChild(p.sprite);
        this.pool.push(p);
        continue;
      }
      const f = 1 - p.life / p.max;
      const sp = p.sprite;
      sp.x += p.vx * dt;
      sp.y += p.vy * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d;
      p.vy *= d;
      sp.rotation += p.spin * dt;
      const sc = p.s0 + (p.s1 - p.s0) * (p.grow ? 1 - (1 - f) * (1 - f) : f);
      sp.scale.set(sc);
      sp.alpha = p.a0 * (1 - f) * (p.grow ? 1 : 1);
      live[w++] = p;
    }
    live.length = w;
    let k = 0;
    for (const pu of this.popups) {
      pu.life -= dt;
      if (pu.life <= 0) {
        this.textLayer.removeChild(pu.text);
        this.popupPool.push(pu.text);
        continue;
      }
      pu.text.y += pu.vy * dt;
      pu.text.alpha = Math.min(1, pu.life * 2);
      this.popups[k++] = pu;
    }
    this.popups.length = k;
  }

  clear(): void {
    for (const p of this.live) {
      p.sprite.visible = false;
      this.layer.removeChild(p.sprite);
      this.pool.push(p);
    }
    this.live.length = 0;
    for (const pu of this.popups) this.textLayer.removeChild(pu.text);
    this.popups.length = 0;
  }

  get count(): number {
    return this.live.length;
  }
}
