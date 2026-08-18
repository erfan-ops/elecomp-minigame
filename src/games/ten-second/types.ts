/**
 * Types internal to the ten-second game.
 */

/** Internal game phase. */
export type GameState = "IDLE" | "RUNNING" | "RESULT";

/** Full immutable snapshot held by the reducer. */
export interface TenSecondSnapshot {
  phase: GameState;
  /** High-resolution start timestamp captured on START (performance.now() ms). */
  startedAt: number | null;
  /** High-resolution stop timestamp captured on STOP (performance.now() ms). */
  stoppedAt: number | null;
}

/** The outcome of one attempt. */
export interface TimingOutcome {
  /** True measured elapsed time, in seconds. */
  elapsedTime: number;
  targetTime: number;
  /** Absolute difference from the target, in seconds. */
  difference: number;
  /** Timing score (0–SCORE_MAX, higher is better). */
  score: number;
  /** Awarded percentage of the base prize (0–100). */
  percentage: number;
  /** Prize amount in configured currency units. */
  prize: number;
  /** True when the difference is within PERFECT_TOLERANCE. */
  perfect: boolean;
}
