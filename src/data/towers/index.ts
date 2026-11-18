import { pencil } from './pencil';
import type { TowerDef } from './types';

/** Shop order. */
export const TOWER_LIST: TowerDef[] = [pencil];

export const TOWERS: Record<string, TowerDef> = Object.fromEntries(TOWER_LIST.map((t) => [t.id, t]));
