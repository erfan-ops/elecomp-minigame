/**
 * Difficulty scaling for the number-wheel game.
 *
 * The organizer's prize budget is drained by every win. As the consumed share
 * of the budget crosses each DIFFICULTY_THRESHOLDS percentage, the wheel
 * speeds are multiplied by the matching DIFFICULTY_MULTIPLIERS row — the game
 * gets harder the more prize money has been given away. Pure functions over
 * the config constants: the current consumption ratio arrives from the
 * platform via `GameContext.budgetConsumedRatio` (the game never touches
 * storage itself).
 */
import { DIFFICULTY_MULTIPLIERS, DIFFICULTY_THRESHOLDS, WHEEL_SPEEDS } from "./config";

/**
 * 0-based difficulty level for a consumed-budget ratio (0..1): the number of
 * thresholds the consumption percentage strictly exceeds — e.g. ≤ 25% is
 * level 0, 25% < c ≤ 50% is level 1, and so on — clamped to the last row.
 *
 * A fully exhausted budget (consumedRatio ≥ 1 — consumed ≥ BUDGET, so nothing
 * remains to pay out) is pinned to the **last** row: once the pool is spent
 * the game must stay at maximum difficulty, never drop back toward the base
 * speeds.
 */
export function difficultyLevel(consumedRatio: number): number {
  if (consumedRatio >= 1) return DIFFICULTY_MULTIPLIERS.length - 1;
  let level = 0;
  for (const threshold of DIFFICULTY_THRESHOLDS) {
    if (consumedRatio * 100 > threshold) level++;
  }
  return Math.min(level, DIFFICULTY_MULTIPLIERS.length - 1);
}

/**
 * Effective spin speeds: WHEEL_SPEEDS scaled by the current difficulty row
 * (e.g. level 1 → [8.5×1.2, 10×1.3, 11.5×1.4]). A missing ratio (other hosts)
 * falls back to level 0 — the base speeds.
 */
export function effectiveWheelSpeeds(
  consumedRatio: number,
): readonly [number, number, number] {
  const multipliers = DIFFICULTY_MULTIPLIERS[difficultyLevel(consumedRatio)];
  return WHEEL_SPEEDS.map((speed, index) => speed * multipliers[index]) as [
    number,
    number,
    number,
  ];
}
