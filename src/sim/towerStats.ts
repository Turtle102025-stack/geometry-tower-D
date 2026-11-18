import type { TowerDef } from '../data/towers/types';
import type { TowerStats } from './types';

export const MAX_TIER = 4;
/** The "other" path is capped at this tier once one path goes above it. */
export const SECONDARY_CAP = 2;

/** Highest tier a path may reach given the other path's tier. */
export function pathCap(otherTier: number): number {
  return otherTier > SECONDARY_CAP ? SECONDARY_CAP : MAX_TIER;
}

/** Upgrade rule: 2 paths × 4 tiers; only one path may go above tier 2. */
export function canUpgradePath(tierA: number, tierB: number, path: 0 | 1): boolean {
  const mine = path === 0 ? tierA : tierB;
  const other = path === 0 ? tierB : tierA;
  const next = mine + 1;
  if (next > MAX_TIER) return false;
  if (next > SECONDARY_CAP && other > SECONDARY_CAP) return false;
  return true;
}

export function isLegalTiers(tierA: number, tierB: number): boolean {
  if (tierA < 0 || tierB < 0 || tierA > MAX_TIER || tierB > MAX_TIER) return false;
  return !(tierA > SECONDARY_CAP && tierB > SECONDARY_CAP);
}

/** Base stats with every purchased upgrade applied (path A first, then path B). */
export function computeStats(def: TowerDef, tierA: number, tierB: number): TowerStats {
  const s = def.base();
  for (let i = 0; i < tierA; i++) def.paths[0].upgrades[i].apply(s);
  for (let i = 0; i < tierB; i++) def.paths[1].upgrades[i].apply(s);
  return s;
}
