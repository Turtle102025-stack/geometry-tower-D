/**
 * Hand-designed rounds (shared by all difficulties: Easy ends at 40, Medium at 60, Hard at 80).
 * Format per round: groups separated by "|", each "count spec secondsBetween [+startDelay] [pPath]".
 * Specs: tri sq pent hex hept oct, plus modifiers .armor .ghost .regrow .crystal .shadow .split,
 * or a boss: cube octahedron dodecahedron icosahedron sphere.
 * Hits to clear: tri 1, sq 2, pent 3, hex 4, hept 9 (splits), oct 19 (splits), armor +1, cube 374.
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
  // hexagons, then the first special types one at a time
  /* 11 */ '40 pent 0.4 | 12 hex 0.8 +8',
  /* 12 */ '30 hex 0.6 | 8 pent.ghost 0.8 +5',
  /* 13 */ '24 hex 0.5 | 10 hex.regrow 0.7 +6',
  /* 14 */ '50 pent 0.25 | 6 hept 1.5 +4',
  /* 15 */ '20 sq.armor 0.6 | 30 hex 0.35 +3',
  /* 16 */ '40 hex 0.3 | 10 pent.ghost 0.5 +4 | 8 hept 1 +10',
  /* 17 */ '24 hex.shadow 0.5 | 30 hex 0.3 +2',
  /* 18 */ '20 hex.crystal 0.5 | 12 hept 0.7 +4',
  /* 19 */ '30 pent.split 0.35 | 16 hex.regrow 0.5 +6',
  /* 20 */ '6 oct 1.2 | 40 hex 0.25 +2 | 12 sq.armor 0.4 +8',
  /* 21 */ '60 hex 0.2 | 10 hept.regrow 0.6 +6',
  /* 22 */ '20 hept 0.4 | 20 pent.ghost 0.3 +3',
  /* 23 */ '30 hex.armor 0.4 | 20 hex.shadow 0.4 +6',
  /* 24 */ '10 oct 0.8 | 30 hex.regrow 0.3 +3',
  /* 25 */ '40 hept 0.3 | 20 hex.crystal 0.35 +6',
  /* 26 */ '80 hex 0.12 | 12 oct.ghost 0.6 +5',
  /* 27 */ '30 hept.armor 0.35 | 20 pent.split.regrow 0.4 +6',
  /* 28 */ '20 oct 0.45 | 30 hex.shadow 0.3 +4',
  /* 29 */ '50 hept 0.2 | 30 hex.ghost.regrow 0.3 +4 | 20 sq.armor 0.25 +10',
  // the first boss
  /* 30 */ '40 hex 0.3 | 1 cube 1 +6 | 10 oct 0.6 +12',
  /* 31 */ '30 oct 0.4 | 30 hex.crystal 0.3 +4',
  /* 32 */ '40 hept.regrow 0.25 | 20 oct.armor 0.5 +6',
  /* 33 */ '120 hex 0.08 | 20 oct.shadow 0.4 +6',
  /* 34 */ '2 cube 3 | 40 hept 0.2 +4',
  /* 35 */ '40 oct.regrow 0.3 | 30 hept.ghost 0.3 +6',
  /* 36 */ '30 oct.armor 0.3 | 40 hex.split.shadow 0.2 +5',
  /* 37 */ '2 cube 2.5 | 30 oct 0.3 +3 | 30 pent.crystal 0.2 +8',
  /* 38 */ '60 oct 0.18 | 40 hept.armor 0.25 +4',
  /* 39 */ '50 oct.regrow 0.2 | 40 oct.ghost 0.2 +4 | 2 cube 3 +10',
  // Easy finale: the Cube convoy
  /* 40 */ '4 cube 2.2 | 40 oct 0.2 +2 | 30 hept.armor 0.3 +12',
];
