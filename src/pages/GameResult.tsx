import { useMemo } from "react";
import type { SaveStatus } from "../app/AppSession";
import { Confetti } from "../components/Confetti";
import type { GameResult } from "../domain/game";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { formatPersianNumber, toPersianDigits } from "../utils/persian";

/**
 * The result screens (Figma frames 6–8): the game host renders exactly one of
 * three views from the completed result — won (frame 7), lost with retries
 * left (frame 6), or lost with no retries left (frame 8, game over).
 * Everything rendered here is derived from the actual `GameResult` (never
 * hard-coded design values); save-status variants below the actions preserve
 * the old host status bar (saving line, retry-save on error).
 */
export function GameResultScreen({
  result,
  attemptsRemaining,
  saveStatus,
  retryEnabled,
  onRetrySave,
  onRetry,
  onExit,
  onContinue,
}: {
  result: GameResult;
  /** Retries left after this attempt. */
  attemptsRemaining: number;
  saveStatus: SaveStatus;
  /** Whether تلاش دوباره is offered (save done + zero win + under the attempt cap). */
  retryEnabled: boolean;
  onRetrySave: () => void;
  onRetry: () => void;
  onExit: () => void;
  onContinue: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const won = result.winAmount > 0;

  const metadata = result.metadata;
  const target = typeof metadata?.target === "number" ? metadata.target : null;

  /** The final number's three digits, each marked correct/wrong vs the target. */
  const digits = useMemo(() => {
    const finalNumber = typeof metadata?.finalNumber === "number" ? metadata.finalNumber : 0;
    const value = Math.max(0, Math.min(999, Math.round(finalNumber)));
    const targetDigits =
      target == null
        ? null
        : String(Math.max(0, Math.min(999, Math.round(target))))
          .padStart(3, "0")
          .split("")
          .map(Number);
    return String(value)
      .padStart(3, "0")
      .split("")
      .map((digit, index) => ({
        value: Number(digit),
        correct: targetDigits ? Number(digit) === targetDigits[index] : false,
      }));
  }, [metadata, target]);

  const correctCount = digits.filter((digit) => digit.correct).length;
  const gameOver = !won && attemptsRemaining <= 0;

  const digitsRow = (
    <div className="game-result__digits" dir="ltr" role="group" aria-label="رقمهای حدسزدهشده">
      {digits.map((digit, index) => (
        <span
          key={index}
          className={`result-digit${digit.correct ? " result-digit--correct" : " result-digit--wrong"}`}
          aria-label={`رقم ${index + 1}: ${toPersianDigits(digit.value)}${digit.correct ? "، درست" : "، اشتباه"}`}
        >
          {toPersianDigits(digit.value)}
        </span>
      ))}
    </div>
  );

  const targetLine = target == null ? null : (
    <p className="game-result__target">
      <span className="game-result__target-label">عدد هدف:</span>
      <span className="game-result__target-value" dir="ltr">
        {toPersianDigits(String(target).padStart(3, "0"))}
      </span>
    </p>
  );

  const subtitle = `شما ${toPersianDigits(correctCount)} رقم را درست حدس زدید`;

  const prizeCard = (
    <div className="game-result__prize">
      <span className="game-result__prize-label">جایزه شما</span>
      <span className="game-result__prize-amount" dir="ltr">
        {formatPersianNumber(result.winAmount)}
      </span>
      <span className="game-result__prize-currency">تومان</span>
    </div>
  );

  const savingLine = (
    <p className="game-result__status" role="status">
      در حال ثبت نتیجه…
    </p>
  );

  const errorBlock = (
    <>
      <p className="game-result__status game-result__status--error" role="alert">
        ثبت نتیجه با خطا مواجه شد.
      </p>
      <div className="game-result__actions">
        <button type="button" className="result-action" onClick={onRetrySave}>
          تلاش مجدد
        </button>
        <button type="button" className="result-action result-action--primary" onClick={onContinue}>
          ادامه
        </button>
      </div>
    </>
  );

  const savedActions = (
    <div className="game-result__actions">
      {won ? (
        <>
          <button type="button" className="result-action" onClick={onExit}>
            خروج از بازی
          </button>
          <button type="button" className="result-action result-action--primary" onClick={onContinue}>
            ادامه
          </button>
        </>
      ) : retryEnabled ? (
        <>
          <button type="button" className="result-action" onClick={onExit}>
            خروج از بازی
          </button>
          <button
            type="button"
            className="result-action result-action--primary"
            onClick={onRetry}
            aria-label={`تلاش دوباره، ${toPersianDigits(attemptsRemaining)} تلاش باقی مانده`}
          >
            تلاش دوباره
          </button>
        </>
      ) : (
        <button type="button" className="result-action result-action--primary" onClick={onExit}>
          خروج از بازی
        </button>
      )}
    </div>
  );

  return (
    <section className="game-result" aria-label="نتیجه بازی">
      {won && !reducedMotion && <Confetti />}
      <span className="game-result__kicker">{won ? "نتیجه بازی" : "این بار نشد"}</span>
      <h1 className={`game-result__heading${won ? " game-result__heading--gradient" : ""}`}>
        {won ? "برنده شدید!" : "متأسفانه برنده نشدید"}
      </h1>
      <p className="game-result__subtitle">{subtitle}</p>
      {digitsRow}
      {targetLine}
      {won && prizeCard}
      {!won && (
        <p className="game-result__message">
          {gameOver
            ? "فرصت‌های بازی شما به پایان رسید و در این بازی موفق به دریافت جایزه نشدید."
            : `هنوز ${toPersianDigits(attemptsRemaining)} فرصت دیگر دارید!`}
        </p>
      )}
      {saveStatus === "saving" ? savingLine : saveStatus === "error" ? errorBlock : savedActions}
    </section>
  );
}
