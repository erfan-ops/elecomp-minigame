import { formatPersianNumber } from "../../utils/persian";
import {
  CURRENCY_SYMBOL,
  PRIZE_EXACT_0,
  PRIZE_EXACT_1,
  PRIZE_EXACT_2,
  PRIZE_EXACT_3,
} from "./config";
import type { Digits, WheelPrizeResult } from "./types";

/**
 * Count digits that match the target exactly, in the same position.
 * Position matters — a digit that appears elsewhere in the target
 * counts for nothing.
 */
export function countExactMatches(target: Digits, result: Digits): number {
  return target.reduce(
    (matches, digit, index) => (digit === result[index] ? matches + 1 : matches),
    0,
  );
}

/**
 * Prize by exact digit matches. Closeness to the target earns nothing —
 * only exact matches pay.
 */
export function calculatePrizeResult(target: Digits, result: Digits): WheelPrizeResult {
  const correctDigits = countExactMatches(target, result);
  const prize =
    correctDigits === 3
      ? PRIZE_EXACT_3
      : correctDigits === 2
        ? PRIZE_EXACT_2
        : correctDigits === 1
          ? PRIZE_EXACT_1
          : PRIZE_EXACT_0;
  return { correctDigits, prize, perfect: correctDigits === 3 };
}

/** 5000000 → "۵٬۰۰۰٬۰۰۰ تومان" */
export function formatPrize(prize: number): string {
  return `${formatPersianNumber(prize)} ${CURRENCY_SYMBOL}`;
}
