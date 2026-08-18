/**
 * ============================================================================
 *  NUMBER-WHEEL GAME CONFIGURATION — EDIT HERE
 *
 *  Conference organizers: every tunable value of this game lives in this
 *  file. Change prizes, wheel speeds, or the game title below and rebuild —
 *  no other file needs to be touched. (Platform-wide settings such as the
 *  active game and the sector categories live in src/config/appConfig.ts.)
 * ============================================================================
 */

/** Full prize value awarded for an exact match. */
export const BASE_PRIZE = 100;

/** Symbol shown in front of prize amounts. */
export const CURRENCY_SYMBOL = "$";

/** Title shown at the top of the game screen. */
export const GAME_TITLE = "عددو پیدا کن";

/**
 * Prize tiers by distance from the target.
 * The first tier whose maxDistance is >= the player's distance wins.
 * Distances are 0–999, so the final tier must end with Infinity.
 */
export interface PrizeTier {
  maxDistance: number;
  /** Percentage of BASE_PRIZE awarded, 0–100. */
  percentage: number;
}

export const PRIZE_TIERS: readonly PrizeTier[] = [
  { maxDistance: 0, percentage: 100 },
  { maxDistance: 5, percentage: 90 },
  { maxDistance: 20, percentage: 75 },
  { maxDistance: 50, percentage: 50 },
  { maxDistance: 100, percentage: 25 },
  { maxDistance: 200, percentage: 10 },
  { maxDistance: Infinity, percentage: 0 },
];

/** Spin speed of each wheel (left to right) in digits per second. */
export const WHEEL_SPEEDS: readonly [number, number, number] = [11, 12.4, 10.2];

/** Stop animation feel — spring constants for the physical settle. */
export const SPRING_STIFFNESS = 170;
export const SPRING_DAMPING = 20;

/** How long the lock pulse plays after a wheel is frozen (ms). */
export const LOCK_PULSE_MS = 700;

/** Minimum delay between two STOP presses — guards against accidental double taps (ms). */
export const MIN_STOP_INTERVAL_MS = 200;

/** Wheel speed multiplier when the user prefers reduced motion. */
export const REDUCED_MOTION_SPEED_FACTOR = 0.55;

/** How many copies of 0–9 are stacked inside each wheel's strip (enables seamless looping). */
export const STRIP_REPEATS = 3;
