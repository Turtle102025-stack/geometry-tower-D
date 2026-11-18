import type { Attack, IncomeStats, SupportStats, TowerStats } from '../../sim/types';

export interface UpgradeDef {
  name: string;
  desc: string;
  cost: number;
  apply: (s: TowerStats) => void;
}

export interface UpgradePath {
  name: string;
  upgrades: [UpgradeDef, UpgradeDef, UpgradeDef, UpgradeDef];
}

export interface TowerDef {
  id: string;
  name: string;
  /** Short role label shown in the shop. */
  role: string;
  desc: string;
  /** Base price (Medium difficulty). */
  cost: number;
  /** Neon accent color. */
  color: number;
  /** Footprint radius in world units. */
  radius: number;
  /** Must be placed on water (and only there). */
  water?: boolean;
  /** Player level needed to unlock (1 = from the start). */
  unlockLevel: number;
  base: () => TowerStats;
  paths: [UpgradePath, UpgradePath];
}

/** Builds an Attack with sensible defaults. */
export function attack(p: Partial<Attack> & Pick<Attack, 'kind'>): Attack {
  return {
    interval: 1,
    damage: 1,
    pierce: 1,
    dmgType: 'sharp',
    speed: 600,
    count: 1,
    spread: 0,
    travel: 0,
    radius: 6,
    splash: 0,
    style: 'dart',
    bossMul: 1,
    armorBonus: 0,
    pierceArmor: false,
    freeze: 0,
    slow: 0,
    slowMul: 1,
    stun: 0,
    brittle: 0,
    onHit: null,
    shatter: null,
    cluster: null,
    targets: 1,
    ramp: 0,
    rampMax: 0,
    orbit: null,
    foldAmount: 0,
    foldCount: 0,
    spin: 0,
    ignoreLos: false,
    bossOnly: false,
    ...p,
  };
}

export function support(p: Partial<SupportStats>): SupportStats {
  return {
    reveal: false,
    stripGhost: false,
    highlight: 0,
    spotlight: 1,
    buffRate: 0,
    buffRange: 0,
    buffPierce: 0,
    buffDamage: 0,
    buffDetect: false,
    discount: 0,
    global: false,
    ...p,
  };
}

export function income(p: Partial<IncomeStats>): IncomeStats {
  return { perRound: 0, growth: 0, growthCap: 1, interest: 0, interestCap: 0, ...p };
}

export function stats(p: Partial<TowerStats> & Pick<TowerStats, 'range'>): TowerStats {
  return {
    detect: false,
    attacks: [],
    support: null,
    income: null,
    ability: null,
    abilityCooldown: 0,
    bossMul: 1,
    ...p,
  };
}

/** Degrees to radians helper for spreads. */
export const deg = (d: number) => (d * Math.PI) / 180;
