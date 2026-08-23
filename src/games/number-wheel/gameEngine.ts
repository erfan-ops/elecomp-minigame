/**
 * Pure number-wheel logic — no React, no DOM, no knowledge of the platform
 * around the game. Deterministic given a random source.
 */
import type { Digits, GameSnapshot, StoppedCount } from "./types";

/** Generate a random 3-digit target number (000–999). */
export function randomTargetNumber(
  exclude?: number,
  rng: () => number = Math.random,
): number {
  let value = Math.floor(rng() * 1000);
  while (exclude !== undefined && value === exclude) {
    value = Math.floor(rng() * 1000);
  }
  return value;
}

/** Convert a number to exactly three digits (hundreds, tens, ones). */
export function numberToDigits(value: number): Digits {
  const clamped = Math.max(0, Math.min(999, Math.round(value)));
  const hundreds = Math.floor(clamped / 100);
  const tens = Math.floor((clamped % 100) / 10);
  const ones = clamped % 10;
  return [hundreds, tens, ones];
}

/** Interpret three digits as hundreds*100 + tens*10 + ones. */
export function digitsToNumber([hundreds, tens, ones]: Digits): number {
  return hundreds * 100 + tens * 10 + ones;
}

/** Render digits as exactly three characters, preserving leading zeros. */
export function formatDigits(digits: Digits): string {
  return digits.join("");
}

/** Random starting digits for the three wheels. */
export function randomDigits(rng: () => number = Math.random): Digits {
  return [Math.floor(rng() * 10), Math.floor(rng() * 10), Math.floor(rng() * 10)];
}

/** Everything needed to start a fresh round. */
export function createNewGame(
  rng: () => number = Math.random,
): { target: Digits; targetNumber: number; startDigits: Digits } {
  const targetNumber = randomTargetNumber(undefined, rng);
  return {
    target: numberToDigits(targetNumber),
    targetNumber,
    startDigits: randomDigits(rng),
  };
}

export type GameAction =
  | { type: "START" }
  | { type: "STOP"; lockedDigit: number }
  | { type: "SET_TARGET"; digits: Digits };

export function createInitialSnapshot(target: Digits, digits: Digits): GameSnapshot {
  return { phase: "IDLE", stoppedCount: 0, target, digits };
}

/**
 * The game state machine. STOP always locks the leftmost wheel that is
 * still rolling; the third STOP transitions the game to RESULT.
 * Invalid transitions (e.g. STOP while IDLE) leave the state unchanged.
 * The game is reset by remounting the component — there is no in-game replay.
 */
export function gameReducer(state: GameSnapshot, action: GameAction): GameSnapshot {
  switch (action.type) {
    case "START": {
      if (state.phase !== "IDLE") return state;
      return { ...state, phase: "RUNNING", stoppedCount: 0 };
    }
    case "SET_TARGET": {
      // The target can only be changed before the game starts.
      if (state.phase !== "IDLE") return state;
      return { ...state, target: action.digits };
    }
    case "STOP": {
      if (state.phase !== "RUNNING" || state.stoppedCount === 3) return state;
      const index = state.stoppedCount;
      const digits: Digits = [...state.digits] as Digits;
      digits[index] = ((Math.round(action.lockedDigit) % 10) + 10) % 10;
      const stoppedCount = (index + 1) as StoppedCount;
      return {
        ...state,
        digits,
        stoppedCount,
        phase: stoppedCount === 3 ? "RESULT" : "RUNNING",
      };
    }
    default:
      return state;
  }
}

/**
 * Which wheels should be spinning for the current snapshot.
 * Index 0 = left (hundreds), 2 = right (ones).
 */
export function rollingFlags(
  snapshot: Pick<GameSnapshot, "phase" | "stoppedCount">,
): [boolean, boolean, boolean] {
  const running = snapshot.phase === "RUNNING";
  return [
    running && snapshot.stoppedCount <= 0,
    running && snapshot.stoppedCount <= 1,
    running && snapshot.stoppedCount <= 2,
  ];
}
