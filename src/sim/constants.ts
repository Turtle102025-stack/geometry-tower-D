/** Simulation runs at a fixed 60 ticks per game-second. */
export const TICKS_PER_SECOND = 60;
export const DT = 1 / TICKS_PER_SECOND;

/** Logical world size. The renderer scales this to fit the screen. */
export const WORLD_W = 1280;
export const WORLD_H = 720;

/** Width of the shape lane; towers cannot be placed on it. */
export const PATH_WIDTH = 46;

/** Largest radius of a normal (non-boss) shape; used to pad grid queries. */
export const MAX_SHAPE_RADIUS = 22;
