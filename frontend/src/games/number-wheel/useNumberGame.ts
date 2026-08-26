import { useCallback, useReducer } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { createInitialSnapshot, createNewGame, gameReducer } from "./gameEngine";
import type { Digits, GameSnapshot } from "./types";

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

  /** Sets a custom target — only honored while the game is IDLE. */
  const setTarget = useCallback((target: Digits) => {
    dispatch({ type: "SET_TARGET", digits: target });
  }, []);

  return {
    state: snapshot.phase,
    stoppedCount: snapshot.stoppedCount,
    target: snapshot.target,
    digits: snapshot.digits,
    start,
    stop,
    setTarget,
  };
}

export { usePrefersReducedMotion };
