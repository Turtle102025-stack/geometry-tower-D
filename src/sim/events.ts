/**
 * The sim reports what happened through this queue; the renderer and audio drain it
 * every frame. Event objects are pooled to avoid garbage in busy rounds.
 */
export const EV = {
  SIDE_BREAK: 1, // x,y, a=rank lost (old sides), b=mods, color
  SHATTER: 2, // x,y, a=rank, b=mods, color
  ARMOR_BREAK: 3, // x,y, a=radius
  IMMUNE: 4, // x,y, a=damage type index
  LEAK: 5, // x,y, a=lives lost
  SHOT: 6, // x,y, a=tower id, b=angle, c=style hash
  EXPLOSION: 7, // x,y, a=radius, b=dmg type index
  PULSE: 8, // x,y, a=radius, color
  TRACER: 9, // x,y -> a,b (end), c=style hash
  BOSS_HIT: 10, // x,y, a=boss kind
  BOSS_DEATH: 11, // x,y, a=boss kind, b=radius, c=shake
  INCOME: 12, // x,y, a=amount
  ROUND_START: 13, // a=round
  ROUND_END: 14, // a=round, b=bonus
  FREEZE: 15, // x,y, a=radius
  FOLD: 16, // x,y -> a,b
  ABILITY: 17, // x,y, a=ability index, b=radius
  PLACE: 18, // x,y, a=tower id
  UPGRADE: 19, // x,y, a=tower id, b=tier
  SELL: 20, // x,y, a=refund
  REGROW: 21, // x,y, a=new rank, color
  GAME_OVER: 22,
  VICTORY: 23,
  DEFLECT: 24, // x,y (sharp hit on armor)
} as const;

export const DMG_INDEX = { sharp: 0, explosive: 1, cold: 2, energy: 3 } as const;

export interface GameEvent {
  type: number;
  x: number;
  y: number;
  a: number;
  b: number;
  c: number;
  color: number;
}

export class EventQueue {
  private pool: GameEvent[] = [];
  private n = 0;
  /** Max events kept between drains; extra events are dropped (they are cosmetic). */
  constructor(private readonly cap = 6000) {}

  push(type: number, x: number, y: number, a = 0, b = 0, c = 0, color = 0): void {
    if (this.n >= this.cap) return;
    let e = this.pool[this.n];
    if (!e) {
      e = { type: 0, x: 0, y: 0, a: 0, b: 0, c: 0, color: 0 };
      this.pool[this.n] = e;
    }
    e.type = type;
    e.x = x;
    e.y = y;
    e.a = a;
    e.b = b;
    e.c = c;
    e.color = color;
    this.n++;
  }

  get length(): number {
    return this.n;
  }

  get(i: number): GameEvent {
    return this.pool[i];
  }

  clear(): void {
    this.n = 0;
  }
}
