/**
 * ============================================================================
 *  TEN-SECOND GAME CONFIGURATION — EDIT HERE
 *
 *  Conference organizers: every tunable value of this game lives in this
 *  file. Change the target time, the timer fade behavior, prizes, or the
 *  scoring formula below and rebuild — no other file needs to be touched.
 * ============================================================================
 */

/** Title shown at the top of the game screen. */
export const GAME_TITLE = "۱۰ ثانیه";

/** The exact target time, in seconds. */
export const TARGET_TIME = 10.0;

/** Difference (in seconds) at or below which the result counts as "perfect". */
export const PERFECT_TOLERANCE = 0.02;

/** How long the timer stays fully visible after START (seconds). */
export const TIMER_VISIBLE_FOR = 2;

/** How long the fade from fully visible to invisible takes (seconds). */
export const TIMER_FADE_DURATION = 2;

/** Full prize value awarded for a perfect stop. */
export const BASE_PRIZE = 100;

/** Symbol shown in front of prize amounts. */
export const CURRENCY_SYMBOL = "تومان";

/**
 * Prize tiers by absolute difference from the target.
 * The first tier whose maxDifference is >= the measured difference wins.
 * The final tier must end with Infinity.
 */
export interface PrizeTier {
  maxDifference: number;
  /** Percentage of BASE_PRIZE awarded, 0–100. */
  percentage: number;
}

export const PRIZE_TIERS: readonly PrizeTier[] = [
  { maxDifference: 0.02, percentage: 100 },
  { maxDifference: 0.05, percentage: 90 },
  { maxDifference: 0.1, percentage: 75 },
  { maxDifference: 0.25, percentage: 50 },
  { maxDifference: 0.5, percentage: 25 },
  { maxDifference: Infinity, percentage: 0 },
];

/** Maximum timing score for a stop with zero difference. */
export const SCORE_MAX = 1000;

/** Points lost per millisecond of difference from the target. */
export const SCORE_PENALTY_PER_MS = 1;
