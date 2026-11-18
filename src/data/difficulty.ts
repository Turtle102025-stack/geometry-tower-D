export type DifficultyId = 'easy' | 'medium' | 'hard';

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  /** Rounds to win. */
  rounds: number;
  lives: number;
  /** Multiplier on every tower and upgrade price. */
  priceMul: number;
  startMoney: number;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultyDef> = {
  easy: { id: 'easy', name: 'Easy', rounds: 40, lives: 200, priceMul: 0.85, startMoney: 650 },
  medium: { id: 'medium', name: 'Medium', rounds: 60, lives: 150, priceMul: 1, startMoney: 650 },
  hard: { id: 'hard', name: 'Hard', rounds: 80, lives: 100, priceMul: 1.1, startMoney: 650 },
};
export const DIFFICULTY_ORDER: DifficultyId[] = ['easy', 'medium', 'hard'];

/** Fraction of money spent that selling refunds. */
export const SELL_RATE = 0.8;

/** Price after the difficulty multiplier, rounded to the nearest 5. */
export function priceFor(base: number, diff: DifficultyDef, discount = 0): number {
  return Math.max(5, Math.round((base * diff.priceMul * (1 - discount)) / 5) * 5);
}

/** Cash bonus for clearing a round. */
export function roundBonus(round: number): number {
  return 100 + round;
}

/** Money earned per side broken; tapers off in late game so the economy doesn't explode. */
export function sideIncome(round: number): number {
  if (round <= 50) return 1;
  if (round <= 60) return 0.5;
  if (round <= 85) return 0.2;
  if (round <= 100) return 0.1;
  return 0.05;
}

/** Fraction of a boss's HP paid out when it is destroyed. */
export const BOSS_BOUNTY = 0.25;
