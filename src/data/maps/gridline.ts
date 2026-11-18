import { rounded } from '../../sim/path';
import type { MapDef } from './types';

export const gridline: MapDef = {
  id: 'gridline',
  name: 'Gridline',
  tier: 'Beginner',
  blurb: 'One long, winding lane. Plenty of room to build.',
  paths: [
    rounded(
      [
        [-40, 130],
        [260, 130],
        [260, 330],
        [120, 330],
        [120, 560],
        [520, 560],
        [520, 250],
        [760, 250],
        [760, 600],
        [1000, 600],
        [1000, 130],
        [1150, 130],
        [1150, 420],
        [1330, 420],
      ],
      44,
    ),
  ],
  water: [],
  obstacles: [],
  unlock: null,
  accent: 0x2ff3ff,
};
