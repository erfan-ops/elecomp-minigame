import { BASE_PRIZE, CURRENCY_SYMBOL, PRIZE_TIERS } from "./config";
import type { PrizeResult } from "./types";

/**
 * Calculate the prize for a round: the closer the result is to the target,
 * the larger the share of the base prize. Pure function — all tuning happens
 * in ./config.ts.
 */
export function calculatePrize(target: number, result: number): number {
  return calculatePrizeResult(target, result).prize;
}

/** Full prize breakdown: distance, awarded percentage, and prize amount. */
export function calculatePrizeResult(target: number, result: number): PrizeResult {
  const distance = Math.abs(target - result);
  const tier = PRIZE_TIERS.find((entry) => distance <= entry.maxDistance);
  const percentage = tier?.percentage ?? 0;
  const prize = Math.round((BASE_PRIZE * percentage) / 100);
  return { distance, percentage, prize };
}

/** Render a prize amount with the configured currency symbol, e.g. "$90". */
export function formatPrize(prize: number): string {
  return `${CURRENCY_SYMBOL}${prize}`;
}
