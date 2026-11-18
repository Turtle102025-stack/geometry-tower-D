/**
 * Hand-designed rounds (shared by all difficulties: Easy ends at 40, Medium at 60, Hard at 80).
 * Format per round: groups separated by "|", each "count spec secondsBetween [+startDelay] [pPath]".
 * Specs: tri sq pent hex hept oct, plus modifiers .armor .ghost .regrow .crystal .shadow .split,
 * or a boss: cube octahedron dodecahedron icosahedron sphere.
 */
export const ROUNDS: string[] = [
  /* 1 */ '18 tri 0.8',
  /* 2 */ '30 tri 0.55',
  /* 3 */ '22 tri 0.5 | 6 sq 0.9 +6',
  /* 4 */ '30 tri 0.4 | 14 sq 0.7 +4',
  /* 5 */ '6 tri 0.5 | 26 sq 0.55 +2',
  /* 6 */ '16 tri 0.35 | 16 sq 0.5 +2 | 4 pent 1.2 +9',
  /* 7 */ '22 sq 0.45 | 10 pent 0.9 +5',
  /* 8 */ '12 tri 0.25 | 20 sq 0.4 +3 | 14 pent 0.7 +7',
  /* 9 */ '32 pent 0.55',
  /* 10 */ '60 sq 0.2 | 12 pent 0.5 +6 | 4 hex 1.4 +12',
];
