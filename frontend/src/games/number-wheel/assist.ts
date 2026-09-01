/**
 * Whitelisted-mobile assistance for the number-wheel game.
 *
 * Two independent favours, both keyed on the mobile the player registered
 * with (see SLOW_MOBILES / PERFECT_MOBILES in ./config):
 *
 * - **slow** — all three wheels spin at SLOW_SPEED_FACTOR of their normal
 *   speed, so the digits are easy to read and hit.
 * - **perfect** — a STOP press does not lock the digit that happens to be
 *   showing: the wheel keeps spinning until the *target* digit reaches the
 *   window and locks that instead. Only when the target digit is close enough
 *   to arrive within PERFECT_ASSIST_WINDOW_MS; otherwise the press behaves
 *   exactly like an unassisted one.
 *
 * Pure functions over the config constants — no React, no DOM, no storage.
 * The mobile arrives from the platform via `GameContext.mobile`.
 */
import {
  PERFECT_ASSIST_WINDOW_MS,
  PERFECT_MOBILES,
  SLOW_MOBILES,
  SLOW_SPEED_FACTOR,
} from "./config";

/**
 * Canonical form for comparing two mobile numbers: digits only, reduced to
 * the 11-digit 09-form the kiosk collects. Tolerates the shapes an organizer
 * is likely to paste into the config — "0912 345 6789", "+98 912 345 6789",
 * "989123456789", "9123456789" — so the whitelist matches regardless.
 */
export function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("98")) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  return digits;
}

/** Whitelist as a lookup set, empty/blank config entries skipped. */
function toLookup(mobiles: readonly string[]): Set<string> {
  const lookup = new Set<string>();
  for (const mobile of mobiles) {
    const normalized = normalizeMobile(mobile);
    if (normalized) lookup.add(normalized);
  }
  return lookup;
}

const SLOW_LOOKUP = toLookup(SLOW_MOBILES);
const PERFECT_LOOKUP = toLookup(PERFECT_MOBILES);

/** Whether this player is on the slow-wheels whitelist. */
export function isSlowMobile(mobile: string): boolean {
  return SLOW_LOOKUP.has(normalizeMobile(mobile));
}

/** Whether this player is on the perfect-stop whitelist. */
export function isPerfectMobile(mobile: string): boolean {
  return PERFECT_LOOKUP.has(normalizeMobile(mobile));
}

/** Speed multiplier for this player's wheels — SLOW_SPEED_FACTOR or 1. */
export function mobileSpeedFactor(mobile: string): number {
  return isSlowMobile(mobile) ? SLOW_SPEED_FACTOR : 1;
}

/**
 * How long (ms) a wheel at `position` spinning at `speed` digits per second
 * needs before `targetDigit` is centered in the window. Wheels only ever move
 * forward, so this is the forward distance modulo 10 digits — up to a full
 * revolution away.
 */
export function assistStopDelayMs(
  position: number,
  targetDigit: number,
  speed: number,
): number {
  const distance = (((targetDigit - position) % 10) + 10) % 10;
  return (distance / speed) * 1000;
}

export interface StopDecisionInput {
  /** The player's registered mobile (`GameContext.mobile`). */
  mobile: string;
  /** Live continuous strip position of the wheel being stopped. */
  position: number;
  /** Digit centered right now — what an unassisted press would lock. */
  currentDigit: number;
  /** The target digit for this wheel's position. */
  targetDigit: number;
  /** This wheel's current spin speed in digits per second. */
  speed: number;
}

export interface StopDecision {
  /** The digit to lock. */
  digit: number;
  /** How long to keep spinning before locking it (0 = lock now). */
  delayMs: number;
}

/**
 * What a STOP press should do — the single decision point.
 *
 * Non-whitelisted players, a wheel already showing the target digit, and a
 * target digit farther away than PERFECT_ASSIST_WINDOW_MS all lock
 * immediately at the digit that was showing. Otherwise the wheel keeps
 * spinning for `delayMs` and locks the target digit.
 */
export function resolveStop({
  mobile,
  position,
  currentDigit,
  targetDigit,
  speed,
}: StopDecisionInput): StopDecision {
  const immediate: StopDecision = { digit: currentDigit, delayMs: 0 };
  // `currentDigit === targetDigit` must short-circuit: the forward distance to
  // a digit already showing is ~0 or ~10, and the modulo would ask for a whole
  // extra revolution to reach the same digit again.
  if (!isPerfectMobile(mobile) || currentDigit === targetDigit || speed <= 0) {
    return immediate;
  }
  const delayMs = assistStopDelayMs(position, targetDigit, speed);
  return delayMs <= PERFECT_ASSIST_WINDOW_MS ? { digit: targetDigit, delayMs } : immediate;
}
