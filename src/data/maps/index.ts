import { gridline } from './gridline';
import type { MapDef } from './types';

export const MAP_LIST: MapDef[] = [gridline];
export const MAPS: Record<string, MapDef> = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));
