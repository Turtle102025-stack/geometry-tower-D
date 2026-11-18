import type { DifficultyId } from '../data/difficulty';
import type { GameSnapshot } from '../sim/game';

export type Quality = 'low' | 'medium' | 'high';

export interface Settings {
  volume: number;
  muted: boolean;
  quality: Quality;
  shake: boolean;
  showFps: boolean;
  autoStart: boolean;
}

export interface Profile {
  version: 1;
  xp: number;
  /** medals[mapId][difficulty] = true when beaten. */
  medals: Record<string, Partial<Record<DifficultyId, boolean>>>;
  achievements: string[];
  totals: {
    shapes: number;
    sides: number;
    bosses: Record<string, number>;
    wins: number;
    games: number;
    roundsCleared: number;
    tier4: number;
    abilities: number;
    bestRound: number;
  };
  settings: Settings;
}

const PROFILE_KEY = 'gtd.profile.v1';
const SAVE_PREFIX = 'gtd.save.v1.';

export function defaultSettings(): Settings {
  return { volume: 0.7, muted: false, quality: 'high', shake: true, showFps: false, autoStart: false };
}

export function defaultProfile(): Profile {
  return {
    version: 1,
    xp: 0,
    medals: {},
    achievements: [],
    totals: { shapes: 0, sides: 0, bosses: {}, wins: 0, games: 0, roundsCleared: 0, tier4: 0, abilities: 0, bestRound: 0 },
    settings: defaultSettings(),
  };
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: progress just isn't persisted */
  }
}

export function loadProfile(): Profile {
  const p = read<Profile>(PROFILE_KEY);
  const d = defaultProfile();
  if (!p || p.version !== 1) return d;
  return {
    ...d,
    ...p,
    totals: { ...d.totals, ...p.totals, bosses: { ...p.totals?.bosses } },
    settings: { ...d.settings, ...p.settings },
    medals: p.medals ?? {},
    achievements: p.achievements ?? [],
  };
}

export function saveProfile(p: Profile): void {
  write(PROFILE_KEY, p);
}

export function loadGame(mapId: string): GameSnapshot | null {
  const s = read<GameSnapshot>(SAVE_PREFIX + mapId);
  return s && s.version === 1 ? s : null;
}

export function saveGame(snap: GameSnapshot): void {
  write(SAVE_PREFIX + snap.map, snap);
}

export function deleteGame(mapId: string): void {
  try {
    localStorage.removeItem(SAVE_PREFIX + mapId);
  } catch {
    /* ignore */
  }
}
