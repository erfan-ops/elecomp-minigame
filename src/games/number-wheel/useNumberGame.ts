import { useCallback, useReducer } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { createInitialSnapshot, createNewGame, gameReducer } from "./gameEngine";
import type { GameSnapshot } from "./types";

/**
 * Owns the number-wheel state machine and exposes the player actions.
 * There is deliberately no "play again": between kiosk sessions the game
 * component is remounted with a fresh state.
 */
export function useNumberGame() {
  const [snapshot, dispatch] = useReducer(
    gameReducer,
    undefined,
    (): GameSnapshot => {
      const fresh = createNewGame();
      return createInitialSnapshot(fresh.target, fresh.startDigits);
    },
  );

  const start = useCallback(() => {
    dispatch({ type: "START" });
  }, []);

  /** Locks the next wheel at `lockedDigit` (read from the wheel itself at press time). */
  const stop = useCallback((lockedDigit: number) => {
    dispatch({ type: "STOP", lockedDigit });
  }, []);

  return {
    state: snapshot.phase,
    stoppedCount: snapshot.stoppedCount,
    target: snapshot.target,
    digits: snapshot.digits,
    start,
    stop,
  };
}

export { usePrefersReducedMotion };
