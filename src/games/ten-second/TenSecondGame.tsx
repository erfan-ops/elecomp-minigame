import { useEffect, useReducer, useRef, useState } from "react";
import type { GameProps } from "../../domain/game";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { toPersianDigits } from "../../utils/persian";
import { Confetti } from "../../components/Confetti";
import { BASE_PRIZE, CURRENCY_SYMBOL, GAME_TITLE } from "./config";
import {
  createInitialSnapshot,
  elapsedSeconds,
  tenSecondReducer,
  timerOpacity,
} from "./gameEngine";
import { calculateOutcome, formatPrize } from "./prizeCalculator";
import type { TimingOutcome } from "./types";
import "./styles.css";

/**
 * The ten-second game, packaged as a pluggable game module.
 *
 * The player starts a timer that fades away after a few seconds and must
 * stop it as close to the target time as possible — mentally.
 *
 * Timing principle: the authoritative elapsed time is derived only from
 * high-resolution timestamps captured at START and STOP; the rAF loop
 * below is purely presentation (it renders the visual timer and its fade)
 * and never feeds the scoring math.
 */

/** Displayed timer text, capped so long waits never overflow the layout. */
function formatTimerDisplay(elapsed: number): string {
  return Math.min(elapsed, 99.99).toFixed(2);
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ten-second-result__row">
      <span className="ten-second-result__label">{label}</span>
      <span className="ten-second-result__value">{value}</span>
    </div>
  );
}

export function TenSecondGame({ onComplete, onExit }: GameProps) {
  const [snapshot, dispatch] = useReducer(tenSecondReducer, undefined, createInitialSnapshot);
  const [outcome, setOutcome] = useState<TimingOutcome | null>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  // Presentation loop: updates the visible timer and its fade-out.
  // The real measurement always comes from the captured timestamps.
  useEffect(() => {
    if (snapshot.phase !== "RUNNING" || snapshot.startedAt === null) return;
    const startedAt = snapshot.startedAt;
    let raf = 0;
    const frame = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const timer = timerRef.current;
      if (timer) {
        timer.textContent = formatTimerDisplay(elapsed);
        timer.style.opacity = String(timerOpacity(elapsed));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [snapshot.phase, snapshot.startedAt]);

  // Report the outcome exactly once when the game reaches RESULT.
  useEffect(() => {
    if (snapshot.phase !== "RESULT" || completedRef.current) return;
    completedRef.current = true;
    const elapsed = elapsedSeconds(snapshot, snapshot.stoppedAt ?? 0) ?? 0;
    const result = calculateOutcome(elapsed);
    setOutcome(result);
    onComplete({
      score: result.score,
      winAmount: result.prize,
      metadata: {
        targetTime: result.targetTime,
        elapsedTime: result.elapsedTime,
        difference: result.difference,
        perfect: result.perfect,
      },
    });
  }, [snapshot, onComplete]);

  const handleStart = () => {
    dispatch({ type: "START", startedAt: performance.now() });
  };

  const handleStop = () => {
    if (snapshot.phase !== "RUNNING") return;
    // Capture the stop timestamp immediately — never wait for a frame.
    dispatch({ type: "STOP", stoppedAt: performance.now() });
  };

  const perfect = outcome !== null && outcome.perfect;

  return (
    <div className="ten-second-game">
      <header className="ten-second-game__header">
        <h1 className="ten-second-game__title">{GAME_TITLE}</h1>
        <button type="button" className="ten-second-game__exit" onClick={onExit}>
          خروج
        </button>
      </header>

      <div className="ten-second-game__main">
        <div
          className="ten-second-game__timer"
          ref={timerRef}
          role="timer"
          aria-label="زمان‌سنج"
        >
          0.00
        </div>

        {snapshot.phase === "IDLE" && (
          <div className="ten-second-game__intro">
            <p className="ten-second-game__instruction">
              زمان‌سنج را در ذهن خود دنبال کنید؛ بعد از چند ثانیه ناپدید می‌شود.
            </p>
            <p className="ten-second-game__instruction">
              وقتی فکر می‌کنید دقیقاً ۱۰ ثانیه گذشته است، توقف را بزنید.
            </p>
          </div>
        )}

        {snapshot.phase === "IDLE" && (
          <button type="button" className="btn btn--start" onClick={handleStart}>
            شروع
          </button>
        )}
        {snapshot.phase === "RUNNING" && (
          <button
            type="button"
            className="btn btn--stop"
            onClick={handleStop}
            aria-label="توقف زمان‌سنج"
          >
            توقف
          </button>
        )}
      </div>

      {snapshot.phase === "RESULT" && outcome && (
        <div
          className={`ten-second-result${perfect ? " ten-second-result--perfect" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={perfect ? "زمان‌بندی عالی" : "نتیجهٔ بازی"}
        >
          {perfect && !reducedMotion && <Confetti />}
          <div className="ten-second-result__card">
            {perfect ? (
              <>
                <span className="ten-second-result__perfect-title">عالی!</span>
                <span className="ten-second-result__value ten-second-result__value--xl">
                  {formatTimerDisplay(outcome.elapsedTime)} ثانیه
                </span>
                <span className="ten-second-result__note">دقیقاً درست!</span>
                <span className="ten-second-result__label">جایزه</span>
                <span className="ten-second-result__prize">
                  {toPersianDigits(formatPrize(outcome.prize))}
                </span>
              </>
            ) : (
              <>
                <span className="ten-second-result__title">نتیجه</span>
                <ResultRow label="زمان شما" value={formatTimerDisplay(outcome.elapsedTime)} />
                <ResultRow label="زمان هدف" value={formatTimerDisplay(outcome.targetTime)} />
                <ResultRow label="اختلاف" value={formatTimerDisplay(outcome.difference)} />
                <ResultRow label="امتیاز" value={toPersianDigits(outcome.score)} />
                <div className="ten-second-result__row">
                  <span className="ten-second-result__label">جایزه</span>
                  <span className="ten-second-result__prize">
                    {toPersianDigits(formatPrize(outcome.prize))}
                  </span>
                  <span className="ten-second-result__percent">
                    {toPersianDigits(outcome.percentage)}٪ از {CURRENCY_SYMBOL}
                    {toPersianDigits(BASE_PRIZE)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
