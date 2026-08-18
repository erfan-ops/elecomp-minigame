import { useEffect, useMemo, useRef } from "react";
import type { GameProps } from "../../domain/game";
import {
  GAME_TITLE,
  MIN_STOP_INTERVAL_MS,
  REDUCED_MOTION_SPEED_FACTOR,
  WHEEL_SPEEDS,
} from "./config";
import { digitsToNumber, rollingFlags } from "./gameEngine";
import { calculatePrizeResult } from "./prizeCalculator";
import { useNumberGame } from "./useNumberGame";
import { GameControls } from "./components/GameControls";
import type { NumberWheelHandle } from "./components/NumberWheel";
import { ResultDisplay } from "./components/ResultDisplay";
import { TargetDisplay } from "./components/TargetDisplay";
import { WheelGroup } from "./components/WheelGroup";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import "./number-wheel.css";

/**
 * The number-wheel game, packaged as a pluggable game module.
 *
 * It plays the game and reports the outcome through `onComplete` — it knows
 * nothing about registration, categories, navigation, storage, the
 * leaderboard, or billing. Resetting between kiosk sessions is handled by
 * the platform remounting this component.
 */
export function NumberWheelGame({ onComplete, onExit }: GameProps) {
  const { state, stoppedCount, target, digits, start, stop } = useNumberGame();
  const reducedMotion = usePrefersReducedMotion();

  const wheelRefs = [
    useRef<NumberWheelHandle>(null),
    useRef<NumberWheelHandle>(null),
    useRef<NumberWheelHandle>(null),
  ];
  const lastStopAt = useRef(0);

  const rolling = rollingFlags({ phase: state, stoppedCount });
  const speeds = useMemo(
    () =>
      WHEEL_SPEEDS.map(
        (speed) => speed * (reducedMotion ? REDUCED_MOTION_SPEED_FACTOR : 1),
      ) as [number, number, number],
    [reducedMotion],
  );

  const result = useMemo(
    () =>
      state === "RESULT"
        ? calculatePrizeResult(digitsToNumber(target), digitsToNumber(digits))
        : null,
    [state, target, digits],
  );

  // Report the outcome exactly once, the moment the game reaches RESULT.
  const completedRef = useRef(false);
  useEffect(() => {
    if (state !== "RESULT" || completedRef.current) return;
    completedRef.current = true;
    const targetNumber = digitsToNumber(target);
    const finalNumber = digitsToNumber(digits);
    const prize = calculatePrizeResult(targetNumber, finalNumber);
    onComplete({
      // In this game the score IS the prize amount; other games may differ.
      score: prize.prize,
      winAmount: prize.prize,
      metadata: {
        target: targetNumber,
        finalNumber,
        distance: prize.distance,
        percentage: prize.percentage,
      },
    });
  }, [state, target, digits, onComplete]);

  const handleStop = () => {
    if (state !== "RUNNING") return;

    // Guard against accidental double taps registering as two stops.
    const now = performance.now();
    if (now - lastStopAt.current < MIN_STOP_INTERVAL_MS) return;
    lastStopAt.current = now;

    const wheelIndex = stoppedCount;
    if (wheelIndex >= 3) return;
    const lockedDigit = wheelRefs[wheelIndex].current?.getCurrentDigit() ?? 0;

    navigator.vibrate?.(wheelIndex === 2 ? 45 : 15);
    stop(lockedDigit);
  };

  return (
    <div className="number-wheel-game">
      <header className="number-wheel-game__header">
        <h1 className="number-wheel-game__title">{GAME_TITLE}</h1>
        <button type="button" className="number-wheel-game__exit" onClick={onExit}>
          خروج
        </button>
      </header>

      <div className="number-wheel-game__main">
        <TargetDisplay digits={target} />
        <WheelGroup
          digits={digits}
          rolling={rolling}
          speeds={speeds}
          wheelRefs={wheelRefs}
          state={state}
          reducedMotion={reducedMotion}
        />
        <GameControls
          state={state}
          stoppedCount={stoppedCount}
          onStart={start}
          onStop={handleStop}
        />
      </div>

      {state === "RESULT" && result && (
        <ResultDisplay
          target={target}
          final={digits}
          result={result}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}
