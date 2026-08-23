import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GameProps } from "../../domain/game";
import {
  GAME_TITLE,
  MIN_STOP_INTERVAL_MS,
  PRIZE_EXACT_1,
  PRIZE_EXACT_2,
  PRIZE_EXACT_3,
  REDUCED_MOTION_SPEED_FACTOR,
  WHEEL_SPEEDS,
} from "./config";
import { digitsToNumber, randomDigits, rollingFlags } from "./gameEngine";
import { calculatePrizeResult, formatPrize } from "./prizeCalculator";
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
 *
 * Input model: the player presses START on the touchscreen (the button stays
 * visible), and the presenter can drive the whole round from a keyboard —
 * Page Up / Page Down / b / the refresh key start the game from IDLE and
 * act as the three STOP presses while RUNNING. There is no on-screen stop
 * button.
 */
export function NumberWheelGame({ context, onComplete, onExit }: GameProps) {
  const { state, stoppedCount, target, digits, start, stop, setTarget } = useNumberGame();
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
    () => (state === "RESULT" ? calculatePrizeResult(target, digits) : null),
    [state, target, digits],
  );

  // Report the outcome exactly once, the moment the game reaches RESULT.
  const completedRef = useRef(false);
  useEffect(() => {
    if (state !== "RESULT" || completedRef.current) return;
    completedRef.current = true;
    const targetNumber = digitsToNumber(target);
    const finalNumber = digitsToNumber(digits);
    const prize = calculatePrizeResult(target, digits);
    onComplete({
      // In this game the score IS the prize amount; other games may differ.
      score: prize.prize,
      winAmount: prize.prize,
      metadata: {
        target: targetNumber,
        finalNumber,
        correctDigits: prize.correctDigits,
        perfect: prize.perfect,
      },
    });
  }, [state, target, digits, onComplete]);

  /** Tapping a target digit cycles it 0→9 — only before the game starts. */
  const handleDigitTap = useCallback(
    (index: number) => {
      if (state !== "IDLE") return;
      const next = [...target] as typeof target;
      next[index] = (next[index] + 1) % 10;
      setTarget(next);
    },
    [state, target, setTarget],
  );

  /** «عدد تصادفی» — fills the target with a random number. */
  const handleRandomTarget = useCallback(() => {
    if (state !== "IDLE") return;
    setTarget(randomDigits());
  }, [state, setTarget]);

  const handleStop = useCallback(() => {
    if (state !== "RUNNING") return;

    // Guard against accidental double presses registering as two stops.
    const now = performance.now();
    if (now - lastStopAt.current < MIN_STOP_INTERVAL_MS) return;
    lastStopAt.current = now;

    const wheelIndex = stoppedCount;
    if (wheelIndex >= 3) return;
    const lockedDigit = wheelRefs[wheelIndex].current?.getCurrentDigit() ?? 0;

    navigator.vibrate?.(wheelIndex === 2 ? 45 : 15);
    stop(lockedDigit);
  }, [state, stoppedCount, stop]);

  // The presenter drives the game from a keyboard: Page Up, Page Down, "b",
  // and the refresh keys start the game while IDLE and act as the stop
  // button while RUNNING. The refresh shortcuts (F5 / Ctrl+R / Cmd+R) are
  // suppressed so the kiosk page never reloads.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isRefresh =
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "r");
      const isActionKey =
        event.key === "PageUp" ||
        event.key === "PageDown" ||
        event.key.toLowerCase() === "b" ||
        isRefresh;
      if (isRefresh) {
        event.preventDefault();
      }
      if (!isActionKey || event.repeat) return;
      if (state === "IDLE") {
        start();
      } else {
        handleStop();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, start, handleStop]);

  return (
    <div className="number-wheel-game">
      <header className="number-wheel-game__header">
        <h1 className="number-wheel-game__title">{GAME_TITLE}</h1>
        <button type="button" className="number-wheel-game__exit" onClick={onExit}>
          خروج
        </button>
      </header>

      <div className="number-wheel-game__main">
        {state === "IDLE" && (
          <div className="number-wheel-game__instructions">
            <p>
              شروع را بزنید تا سه چرخ بچرخند؛ مجری چرخ‌ها را یکی‌یکی متوقف می‌کند و هر بار چرخِ
              برجسته از چپ به راست قفل می‌شود.
            </p>
            <p>
              جایزه فقط برای رقم‌هایی است که دقیقاً با عدد هدف یکی باشند: ۳ رقم ={" "}
              {formatPrize(PRIZE_EXACT_3)}، ۲ رقم = {formatPrize(PRIZE_EXACT_2)}، ۱ رقم ={" "}
              {formatPrize(PRIZE_EXACT_1)}.
            </p>
          </div>
        )}
        <TargetDisplay
          digits={target}
          editable={state === "IDLE"}
          onDigitTap={handleDigitTap}
          onRandom={handleRandomTarget}
        />
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
        />
      </div>

      {state === "RESULT" && result && (
        <ResultDisplay
          target={target}
          final={digits}
          result={result}
          reducedMotion={reducedMotion}
          attemptsRemaining={context.attemptsRemaining}
        />
      )}
    </div>
  );
}
