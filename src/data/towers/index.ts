import { compass } from './compass';
import { eraserMortar } from './eraserMortar';
import { iceCube } from './iceCube';
import { pencil } from './pencil';
import { pointPlotter } from './pointPlotter';
import type { TowerDef } from './types';
import { vector } from './vector';

/** Shop order. */
export const TOWER_LIST: TowerDef[] = [pencil, pointPlotter, compass, eraserMortar, iceCube, vector];

export const TOWERS: Record<string, TowerDef> = Object.fromEntries(TOWER_LIST.map((t) => [t.id, t]));
