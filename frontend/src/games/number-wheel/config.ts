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

/** Currency unit shown after prize amounts. */
export const CURRENCY_SYMBOL = "تومان";

/**
 * Prizes are awarded ONLY for exact digit matches — the same digit in the
 * same position as the target. Getting close earns nothing.
 */
export const PRIZE_EXACT_3 = 5_000_000; // all three digits correct
export const PRIZE_EXACT_2 = 1_000_000; // two digits correct
export const PRIZE_EXACT_1 = 500_000; // one digit correct
export const PRIZE_EXACT_0 = 0; // nothing correct

/** Spin speed of each wheel (left to right) in digits per second. */
export const WHEEL_SPEEDS: readonly [number, number, number] = [8.5, 10, 11.5];
export const BUDGET = 100_000_000;
export const DIFFICULTY_THRESHOLDS: number[] = [50, 67, 83, 100];
export const DIFFICULTY_MULTIPLIERS: number[][] = [
    [1, 1, 1],
    [1.2, 1.3, 1.4],
    [1.4, 1.6, 1.8],
    [1.7, 2, 2.3]
];

/** Stop animation feel — spring constants for the physical settle. */
export const SPRING_STIFFNESS = 170;
export const SPRING_DAMPING = 20;

/** How long the lock pulse plays after a wheel is frozen (ms). */
export const LOCK_PULSE_MS = 700;

/** Minimum delay between two STOP presses — guards against accidental double taps (ms). */
export const MIN_STOP_INTERVAL_MS = 200;

/** Wheel speed multiplier when the user prefers reduced motion. */
export const REDUCED_MOTION_SPEED_FACTOR = 1;

/** How many copies of 0–9 are stacked inside each wheel's strip (enables seamless looping). */
export const STRIP_REPEATS = 3;
