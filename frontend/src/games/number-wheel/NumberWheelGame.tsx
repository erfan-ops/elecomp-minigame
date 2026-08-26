import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GameProps } from "../../domain/game";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { formatPersianNumber, toPersianDigits } from "../../utils/persian";
import { WheelGroup } from "./components/WheelGroup";
import type { NumberWheelHandle } from "./components/NumberWheel";
import {
  CURRENCY_SYMBOL,
  MIN_STOP_INTERVAL_MS,
  PRIZE_EXACT_1,
  PRIZE_EXACT_2,
  PRIZE_EXACT_3,
  REDUCED_MOTION_SPEED_FACTOR,
  WHEEL_SPEEDS,
} from "./config";
import { digitsToNumber, randomDigits, rollingFlags } from "./gameEngine";
import { calculatePrizeResult } from "./prizeCalculator";
import { useNumberGame } from "./useNumberGame";
import "./number-wheel.css";

/** Prize tiers shown on the rules panel, cheapest first (config values, not design mocks). */
const PRIZE_TIERS = [
  { emoji: "🎉", digitCount: 1, amount: PRIZE_EXACT_1 },
  { emoji: "🔥", digitCount: 2, amount: PRIZE_EXACT_2 },
  { emoji: "💰", digitCount: 3, amount: PRIZE_EXACT_3 },
] as const;

/**
 * The number-wheel game, packaged as a pluggable game module.
 *
 * It plays the game and reports the outcome through `onComplete` — it knows
 * nothing about registration, categories, navigation, storage, the
 * leaderboard, or billing. Resetting between kiosk sessions is handled by
 * the platform remounting this component.
 *
 * Input model: the player presses START on the touchscreen (the button stays
 * visible and becomes «توقف» while running), and the presenter can drive the
 * whole round from a keyboard — Page Up / Page Down / b / the refresh key
 * start the game from IDLE and act as the three STOP presses while RUNNING.
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

  /** Total attempts the platform grants — used for the rules line and status dots. */
  const attemptsTotal = context.attemptsTotal ?? (context.attemptsRemaining ?? 0) + 1;
  /** Attempts already spent, including this one (platform fills both numbers). */
  const spentAttempts = Math.max(
    0,
    Math.min(attemptsTotal, attemptsTotal - (context.attemptsRemaining ?? attemptsTotal - 1)),
  );
  /** Shots already taken (a running round counts its own shot in progress). */
  const shotsTaken = Math.min(3, stoppedCount + (state === "RUNNING" ? 1 : 0));

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

  /** The big touchscreen button: START while idle, STOP while running. */
  const handlePrimaryPress = useCallback(() => {
    if (state === "IDLE") {
      start();
    } else {
      handleStop();
    }
  }, [state, start, handleStop]);

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
    <div className="slot-game">

      <span className="slot-game__kicker">ماشین شانس</span>

      <h1 className="slot-game__heading">
        <span>عدد</span>
        {/* Target digits: tappable (cycle 0→9) only before the game starts. */}
        <span className="slot-game__target" dir="ltr">
          {target.map((digit, index) =>
            state === "IDLE" ? (
              <button
                key={index}
                type="button"
                className="slot-game__target-digit"
                onClick={() => handleDigitTap(index)}
                aria-label={`رقم ${index + 1} هدف، ${toPersianDigits(digit)}، برای تغییر ضربه بزنید`}
              >
                {toPersianDigits(digit)}
              </button>
            ) : (
              <span key={index} className="slot-game__target-digit">
                {toPersianDigits(digit)}
              </span>
            ),
          )}
        </span>
        <span>را پیدا کنید</span>
      </h1>

      {state === "IDLE" && (
        <button type="button" className="slot-game__random" onClick={handleRandomTarget}>
          عدد تصادفی
        </button>
      )}

      <div className="slot-game__status" role="group" aria-label="وضعیت بازی">
        <div className="status-pill">
          <span className="status-pill__label">فرصت‌های بازی</span>
          <span className="status-pill__dots" aria-hidden="true">
            {Array.from({ length: attemptsTotal }, (_, index) => (
              <span
                key={index}
                className={`status-pill__dot status-pill__dot--cyan${index < spentAttempts ? " status-pill__dot--live" : ""}`}
              />
            ))}
          </span>
        </div>
        <div className="status-pill">
          <span className="status-pill__label">
            شلیک برای رقم {toPersianDigits(Math.min(stoppedCount + 1, 3))}
          </span>
          <span className="status-pill__dots" aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <span
                key={index}
                className={`status-pill__dot status-pill__dot--green${index < shotsTaken ? " status-pill__dot--live" : ""}`}
              />
            ))}
          </span>
        </div>
      </div>

      <div className="reel-machine">
        {/* LTR row so رقم ۱ (the first wheel to stop, the hundreds) is leftmost. */}
        <div className="reel-labels" dir="ltr" aria-hidden="true">
          <span className="reel-labels__item">رقم ۱</span>
          <span className="reel-labels__item">رقم ۲</span>
          <span className="reel-labels__item">رقم ۳</span>
        </div>
        <WheelGroup
          digits={digits}
          rolling={rolling}
          speeds={speeds}
          wheelRefs={wheelRefs}
          state={state}
          reducedMotion={reducedMotion}
        />
      </div>

      {state !== "RESULT" && (
        <button
          type="button"
          className="slot-game__stop"
          onClick={handlePrimaryPress}
          aria-label={state === "IDLE" ? "شروع بازی" : "توقف چرخ"}
        >
          {state === "IDLE" ? "شروع" : "توقف"}
        </button>
      )}

      <p className="remote-hint">
        <span>دکمه ریموت را فشار دهید تا چرخ متوقف شود</span>
        <kbd className="remote-hint__key" dir="ltr" aria-hidden="true">
          Space
        </kbd>
      </p>

      <div className="rules-panel">
        <div className="rules-panel__header">
          <span className="rules-panel__icon" aria-hidden="true">
            📜
          </span>
          <div className="rules-panel__titles">
            <h2 className="rules-panel__title">قوانین بازی</h2>
            <p className="rules-panel__subtitle">قبل از شروع بخوانید</p>
          </div>
        </div>
        <ul className="rules-panel__list">
          <li>
            <span aria-hidden="true">🎯</span> عدد ۳ رقمی را پیدا کنید
          </li>
          <li>
            <span aria-hidden="true">🕹️</span> برای هر رقم باید دکمه توقف را بزنید
          </li>
          <li>
            <span aria-hidden="true">🔄</span> در مجموع {toPersianDigits(attemptsTotal)} فرصت برای
            کل بازی دارید
          </li>
        </ul>
        <div className="rules-panel__prizes">
          {PRIZE_TIERS.map((tier, index) => (
            <div
              key={tier.digitCount}
              className={`prize-card${index === PRIZE_TIERS.length - 1 ? " prize-card--gold" : ""}`}
            >
              <span className="prize-card__emoji" aria-hidden="true">
                {tier.emoji}
              </span>
              <span className="prize-card__label">{toPersianDigits(tier.digitCount)} رقم درست</span>
              <span className="prize-card__value" dir="ltr">
                {formatPersianNumber(tier.amount)}
              </span>
              <span className="prize-card__currency">{CURRENCY_SYMBOL}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
