import { archipelago, gridline, hypotenuseLake, kochSnowflake, mobius, monoliths, parallel, singularity, tangent, unitCircle, vanishingPoint } from './all';
import type { MapDef } from './types';

/** Five maps from the start (getting harder), then six unlocked by achievements. */
export const MAP_LIST: MapDef[] = [gridline, unitCircle, parallel, hypotenuseLake, monoliths, tangent, mobius, kochSnowflake, archipelago, vanishingPoint, singularity];
export const MAPS: Record<string, MapDef> = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));
