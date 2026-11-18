import { chalkboard } from './chalkboard';
import { compass } from './compass';
import { eraserMortar } from './eraserMortar';
import { goldenRatio } from './goldenRatio';
import { iceCube } from './iceCube';
import { laserPointer } from './laserPointer';
import { pencil } from './pencil';
import { pointPlotter } from './pointPlotter';
import { projector } from './projector';
import { protractorBoat } from './protractorBoat';
import { tesseract } from './tesseract';
import type { TowerDef } from './types';
import { vector } from './vector';

/** Shop order (also roughly the unlock order). */
export const TOWER_LIST: TowerDef[] = [
  pencil,
  pointPlotter,
  compass,
  eraserMortar,
  iceCube,
  vector,
  laserPointer,
  projector,
  goldenRatio,
  chalkboard,
  protractorBoat,
  tesseract,
];

export const TOWERS: Record<string, TowerDef> = Object.fromEntries(TOWER_LIST.map((t) => [t.id, t]));
