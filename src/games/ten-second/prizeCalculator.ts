import {
  BASE_PRIZE,
  CURRENCY_SYMBOL,
  PERFECT_TOLERANCE,
  PRIZE_TIERS,
  SCORE_MAX,
  SCORE_PENALTY_PER_MS,
  TARGET_TIME,
} from "./config";
import type { TimingOutcome } from "./types";

/**
 * Cancels floating-point noise at tier boundaries — e.g. 10.05 - 10 is
 * 0.05000000000000071, which must still match the 0.05 tier. A nanosecond
 * is far smaller than any meaningful timing precision.
 */
const FP_EPSILON = 1e-9;

/**
 * Timing score: full points at exactly the target time, losing
 * SCORE_PENALTY_PER_MS points per millisecond of difference.
 * Continuous formula — no manual ranges.
 */
export function calculateScore(elapsedTime: number): number {
  const difference = Math.abs(elapsedTime - TARGET_TIME);
  return Math.max(0, SCORE_MAX - Math.round(difference * 1000 * SCORE_PENALTY_PER_MS));
}

/** Full outcome of one attempt: measured time, difference, score, and prize. */
export function calculateOutcome(elapsedTime: number): TimingOutcome {
  const difference = Math.abs(elapsedTime - TARGET_TIME);
  const tierDifference = difference - FP_EPSILON;
  const tier = PRIZE_TIERS.find((entry) => tierDifference <= entry.maxDifference);
  const percentage = tier?.percentage ?? 0;
  return {
    elapsedTime,
    targetTime: TARGET_TIME,
    difference,
    score: calculateScore(elapsedTime),
    percentage,
    prize: Math.round((BASE_PRIZE * percentage) / 100),
    perfect: tierDifference <= PERFECT_TOLERANCE,
  };
}

/** Render a prize amount with the configured currency symbol, e.g. "$90". */
export function formatPrize(prize: number): string {
  return `${CURRENCY_SYMBOL}${prize}`;
}
