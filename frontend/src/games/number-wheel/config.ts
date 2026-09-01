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
    [1.2, 1.2, 1.2],
    [1.4, 1.4, 1.4],
    [1.7, 2, 2]
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

/* ---------------------------------------------------------------------------
 *  WHITELISTED MOBILE NUMBERS (VIP play)
 *
 *  Two independent lists, matched against the mobile the player registered
 *  with. Write them in the same 11-digit 09-form the kiosk collects
 *  ("09108086113"); spaces, dashes and a +98/98 prefix are tolerated. A
 *  number may appear in both lists.
 * ------------------------------------------------------------------------ */

/**
 * SLOW LIST — these players get slower wheels, which makes every digit far
 * easier to read and hit. The factor multiplies the speeds AFTER the
 * budget-difficulty row, so a slow VIP still speeds up as the budget drains,
 * just from a lower base.
 */
export const SLOW_MOBILES: readonly string[] = [
  "09190832070",
  "09191765350",
  "09391233127",
  "09108086113",
];

/** Speed multiplier applied to all three wheels for a SLOW_MOBILES player (< 1 = slower). */
export const SLOW_SPEED_FACTOR = 0.9;

/**
 * PERFECT LIST — these players get a nudged stop: when they press STOP the
 * wheel keeps spinning until the target digit reaches the window, then locks
 * it, so the digit comes out correct.
 *
 * The nudge only applies when the target digit is close enough to arrive
 * within PERFECT_ASSIST_WINDOW_MS; a farther digit locks at the digit that
 * was actually showing and the round continues normally (see the note on the
 * window below).
 */
export const PERFECT_MOBILES: readonly string[] = [
  "09125969436",
  "09366310193",
  "09123968317",
];

/**
 * How long a nudged wheel may keep spinning past a STOP press (ms).
 *
 * A full revolution takes 10 / speed seconds, so this window decides how
 * often the nudge can land: at the base 8.5 digits/s a revolution is ~1176 ms,
 * so 500 ms covers ~4.25 of the 10 digits — i.e. the nudge helps on roughly
 * 45% of presses and a perfect 3-digit round stays uncommon. Raise this to
 * ~1200 (a full revolution at base speed) to make the nudge land on nearly
 * every press; the trade-off is a visibly longer delay between the press and
 * the wheel locking.
 */
export const PERFECT_ASSIST_WINDOW_MS = 500;


/** How many copies of 0–9 are stacked inside each wheel's strip (enables seamless looping). */
export const STRIP_REPEATS = 3;
