/**
 * Types internal to the number-wheel game.
 */

/** One decimal digit, 0–9. */
export type Digit = number;

/** A 3-digit number as [hundreds, tens, ones]. */
export type Digits = [Digit, Digit, Digit];

/** Internal game phase. */
export type GameState = "IDLE" | "RUNNING" | "RESULT";

/** How many wheels have been locked, left to right. */
export type StoppedCount = 0 | 1 | 2 | 3;

/** Full immutable game snapshot held by the reducer. */
export interface GameSnapshot {
  phase: GameState;
  stoppedCount: StoppedCount;
  /** The target number the player is trying to hit. */
  target: Digits;
  /**
   * The currently displayed wheel digits. For locked wheels this is the
   * frozen digit; for rolling wheels it is only a fallback (the wheel
   * itself is the source of truth while spinning).
   */
  digits: Digits;
}

/** Outcome of comparing the player's digits against the target. */
export interface WheelPrizeResult {
  /** How many digits match the target exactly, in the right positions. */
  correctDigits: number;
  /** Prize for the number of exact matches. */
  prize: number;
  /** True when all three digits match. */
  perfect: boolean;
}
