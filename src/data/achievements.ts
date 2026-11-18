import type { Profile } from '../save/storage';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (p: Profile) => boolean;
}

const medalCount = (p: Profile) => Object.values(p.medals).reduce((n, m) => n + Object.values(m).filter(Boolean).length, 0);
const anyMedal = (p: Profile, d: 'easy' | 'medium' | 'hard') => Object.values(p.medals).some((m) => m[d]);
const bosses = (p: Profile, k: string) => p.totals.bosses[k] ?? 0;

/** Achievements. Several of them unlock maps (see MapDef.unlock). */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-win', name: 'Proof Complete', desc: 'Win any map on any difficulty.', icon: '🏁', check: (p) => p.totals.wins >= 1 },
  { id: 'first-boss', name: 'Cube Crusher', desc: 'Destroy a Cube boss.', icon: '🧊', check: (p) => bosses(p, 'cube') >= 1 },
  { id: 'medium-win', name: 'Above Average', desc: 'Win any map on Medium.', icon: '🔷', check: (p) => anyMedal(p, 'medium') },
  { id: 'shatter-25k', name: 'Shard Storm', desc: 'Destroy 25,000 shapes in total.', icon: '💥', check: (p) => p.totals.shapes >= 25000 },
  { id: 'medals-8', name: 'Decorated', desc: 'Earn 8 medals.', icon: '🎖️', check: (p) => medalCount(p) >= 8 },
  { id: 'hard-win', name: 'Hard Proof', desc: 'Win any map on Hard.', icon: '🔺', check: (p) => anyMedal(p, 'hard') },
  { id: 'sphere', name: 'Infinite Sides', desc: 'Destroy The Sphere.', icon: '⚪', check: (p) => bosses(p, 'sphere') >= 1 },
  { id: 'tier4', name: 'Maxed Out', desc: 'Buy a tier-4 upgrade.', icon: '★', check: (p) => p.totals.tier4 >= 1 },
  { id: 'ability', name: 'Special Move', desc: 'Use a tower ability.', icon: '⚡', check: (p) => p.totals.abilities >= 1 },
  { id: 'round-100', name: 'Triple Digits', desc: 'Reach round 100 in freeplay.', icon: '💯', check: (p) => p.totals.bestRound >= 100 },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
