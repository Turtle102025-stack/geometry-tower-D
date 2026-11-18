import type { PathCmd } from '../../sim/path';

export type Area =
  | { type: 'rect'; x: number; y: number; w: number; h: number }
  | { type: 'circle'; x: number; y: number; r: number }
  | { type: 'poly'; points: number[] };

export type MapTier = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface MapDef {
  id: string;
  name: string;
  tier: MapTier;
  blurb: string;
  /** One or more paths, authored as points and curves. Spawns alternate between paths. */
  paths: PathCmd[][];
  /** Water areas: only water towers can be placed here. */
  water: Area[];
  /** Solid blocks: nothing can be built on them and they block line of sight. */
  obstacles: Area[];
  /** Achievement id that unlocks the map, or null if available from the start. */
  unlock: string | null;
  /** Accent color for the map's neon theme. */
  accent: number;
}
