import type { TowerDef } from '../data/towers/types';

export type DamageType = 'sharp' | 'explosive' | 'cold' | 'energy';
export type Targeting = 'first' | 'last' | 'strong' | 'close';
export const TARGETING_MODES: Targeting[] = ['first', 'last', 'strong', 'close'];

/** Shape modifier bit flags. */
export const MOD = {
  ARMOR: 1,
  GHOST: 2,
  REGROW: 4,
  CRYSTAL: 8,
  SHADOW: 16,
  SPLIT: 32,
} as const;
export const MOD_KEYS = ['armor', 'ghost', 'regrow', 'crystal', 'shadow', 'split'] as const;
export type ModKey = (typeof MOD_KEYS)[number];
export const MOD_BY_KEY: Record<ModKey, number> = {
  armor: MOD.ARMOR,
  ghost: MOD.GHOST,
  regrow: MOD.REGROW,
  crystal: MOD.CRYSTAL,
  shadow: MOD.SHADOW,
  split: MOD.SPLIT,
};

/** Live enemy. Polygons have kind = 0; bosses have kind = boss index (1-based). */
export interface Shape {
  id: number;
  alive: boolean;
  kind: number;
  rank: number;
  birthRank: number;
  mods: number;
  hp: number;
  maxHp: number;
  path: number;
  dist: number;
  lane: number;
  x: number;
  y: number;
  px: number;
  py: number;
  speed: number;
  radius: number;
  freeze: number;
  slow: number;
  slowMul: number;
  stun: number;
  back: number;
  regrowT: number;
  revealedUntil: number;
  bonusUntil: number;
  bonusAdd: number;
  bonusMul: number;
  brittle: number;
  rot: number;
  spin: number;
  hitFlash: number;
  rbe: number;
  /** id of the tower that last froze it (for Shatter Point). */
  frozenBy: number;
  /** Scratch stamp used to de-duplicate grid query results. */
  mark: number;
}

export type AttackKind = 'dart' | 'burst' | 'lob' | 'hitscan' | 'beam' | 'pulse' | 'orbit' | 'fold';

export interface ClusterDef {
  count: number;
  radius: number;
  damage: number;
  pierce: number;
  spread: number;
  chain: number;
}

export interface OrbitDef {
  blades: number;
  radius: number;
  spin: number;
  bladeRadius: number;
  rehit: number;
}

export interface Attack {
  kind: AttackKind;
  /** Seconds between attacks. */
  interval: number;
  damage: number;
  /** Shapes one projectile/explosion/pulse can hit. */
  pierce: number;
  dmgType: DamageType;
  /** Projectile speed (units/second). */
  speed: number;
  /** Projectiles per attack. */
  count: number;
  /** Fan angle in radians across all projectiles of one attack. */
  spread: number;
  /** Max projectile travel distance. 0 = 1.3 × tower range. */
  travel: number;
  /** Projectile collision radius. */
  radius: number;
  /** Explosion radius (lob). */
  splash: number;
  /** Render style key. */
  style: string;
  bossMul: number;
  armorBonus: number;
  /** Lets sharp damage hurt armored shapes. */
  pierceArmor: boolean;
  freeze: number;
  slow: number;
  slowMul: number;
  stun: number;
  /** Frozen shapes take this much extra damage per hit (set by this attack's freezes). */
  brittle: number;
  /** Sub-projectiles spawned where a hitscan / dart hits. */
  onHit: Attack | null;
  /** Shards burst out of shapes this attack froze when they are destroyed. */
  shatter: Attack | null;
  cluster: ClusterDef | null;
  /** Number of simultaneous targets (beam / hitscan). */
  targets: number;
  /** Beam: extra damage per second while locked on one target, up to rampMax. */
  ramp: number;
  rampMax: number;
  orbit: OrbitDef | null;
  /** Fold: distance pushed back, number of shapes per activation. */
  foldAmount: number;
  foldCount: number;
  /** Burst: angle added after every volley (spiral patterns). */
  spin: number;
  /** Line-of-sight is ignored (lobbed shells, auras). */
  ignoreLos: boolean;
  /** Only targets/affects bosses. */
  bossOnly: boolean;
}

export interface SupportStats {
  reveal: boolean;
  stripGhost: boolean;
  /** Extra damage per hit for shapes in range. */
  highlight: number;
  /** Damage multiplier for shapes in range. */
  spotlight: number;
  buffRate: number;
  buffRange: number;
  buffPierce: number;
  buffDamage: number;
  buffDetect: boolean;
  discount: number;
  /** Reveal ghosts across the whole map. */
  global: boolean;
}

export interface IncomeStats {
  perRound: number;
  /** Payout multiplier growth per round owned (compounding), capped by growthCap. */
  growth: number;
  growthCap: number;
  /** Fraction of current cash paid each round, capped. */
  interest: number;
  interestCap: number;
}

export type AbilityId = 'absoluteZero' | 'rubOut' | 'pirateHook' | 'hyperfold';

export interface TowerStats {
  range: number;
  detect: boolean;
  attacks: Attack[];
  support: SupportStats | null;
  income: IncomeStats | null;
  ability: AbilityId | null;
  abilityCooldown: number;
  /** Bonus to all attacks' damage vs bosses (multiplier). */
  bossMul: number;
}

export interface Buff {
  rate: number;
  range: number;
  pierce: number;
  damage: number;
  detect: boolean;
  discount: number;
}

export interface BeamState {
  targetId: number;
  heat: number;
  x: number;
  y: number;
}

export interface Tower {
  id: number;
  def: TowerDef;
  x: number;
  y: number;
  tierA: number;
  tierB: number;
  targeting: Targeting;
  /** Total money spent (purchase + upgrades), used for sell value. */
  spent: number;
  /** Sides broken by this tower. */
  sides: number;
  /** Shapes fully destroyed by this tower. */
  kills: number;
  stats: TowerStats;
  cds: number[];
  angle: number;
  buff: Buff;
  abilityCd: number;
  beams: BeamState[][];
  orbitAngle: number;
  orbitHits: Map<number, number>;
  burstSpin: number;
  roundsOwned: number;
  /** Seconds since last shot (render recoil). */
  sinceShot: number;
  incomeEarned: number;
}

export interface Projectile {
  alive: boolean;
  /** 0 = dart, 1 = shell (lobbed, explodes on landing). */
  type: number;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  pierce: number;
  attack: Attack;
  tower: Tower | null;
  hits: number[];
  rot: number;
  // shell
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  t: number;
  tTotal: number;
}

export interface PendingExplosion {
  x: number;
  y: number;
  t: number;
  radius: number;
  damage: number;
  pierce: number;
  chain: number;
  attack: Attack;
  tower: Tower | null;
}
