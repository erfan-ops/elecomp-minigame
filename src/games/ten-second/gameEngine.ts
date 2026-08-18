/**
 * Pure ten-second state/timing logic — no React, no DOM, no knowledge of the
 * platform around the game.
 *
 * Timing principle: the authoritative elapsed time is ALWAYS derived from
 * the captured high-resolution timestamps (performance.now()), never from
 * accumulating intervals or counting frames. The visual timer is pure
 * presentation.
 */
import { TIMER_FADE_DURATION, TIMER_VISIBLE_FOR } from "./config";
import type { TenSecondSnapshot } from "./types";

export type TenSecondAction =
  | { type: "START"; startedAt: number }
  | { type: "STOP"; stoppedAt: number };

export function createInitialSnapshot(): TenSecondSnapshot {
  return { phase: "IDLE", startedAt: null, stoppedAt: null };
}

/**
 * The game state machine. Invalid transitions (STOP while IDLE, double
 * START) leave the state unchanged. Reset happens by remounting the
 * component — there is no in-game replay.
 */
export function tenSecondReducer(
  snapshot: TenSecondSnapshot,
  action: TenSecondAction,
): TenSecondSnapshot {
  switch (action.type) {
    case "START": {
      if (snapshot.phase !== "IDLE") return snapshot;
      return { phase: "RUNNING", startedAt: action.startedAt, stoppedAt: null };
    }
    case "STOP": {
      if (snapshot.phase !== "RUNNING" || snapshot.startedAt === null) return snapshot;
      return { ...snapshot, phase: "RESULT", stoppedAt: action.stoppedAt };
    }
    default:
      return snapshot;
  }
}

/**
 * Authoritative elapsed time in seconds. `now` is a performance.now()-clock
 * value; pass the snapshot's stoppedAt-based end time explicitly so the
 * function stays pure and testable.
 */
export function elapsedSeconds(snapshot: TenSecondSnapshot, now: number): number | null {
  if (snapshot.startedAt === null) return null;
  const end = snapshot.stoppedAt ?? now;
  return (end - snapshot.startedAt) / 1000;
}

/**
 * Timer opacity for a given elapsed time (presentation only):
 * fully visible for TIMER_VISIBLE_FOR seconds, then a linear fade to 0.
 */
export function timerOpacity(elapsedSecondsValue: number): number {
  if (elapsedSecondsValue <= TIMER_VISIBLE_FOR) return 1;
  const t = (elapsedSecondsValue - TIMER_VISIBLE_FOR) / TIMER_FADE_DURATION;
  return Math.max(0, Math.min(1, 1 - t));
}
