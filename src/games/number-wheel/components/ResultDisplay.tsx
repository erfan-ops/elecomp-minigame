import { Confetti } from "../../../components/Confetti";
import { toPersianDigits } from "../../../utils/persian";
import { formatDigits } from "../gameEngine";
import { formatPrize } from "../prizeCalculator";
import type { Digits, WheelPrizeResult } from "../types";

interface ResultDisplayProps {
  target: Digits;
  final: Digits;
  result: WheelPrizeResult;
  reducedMotion: boolean;
}

/** Shown when no digit matches — fun instead of a prize line. */
const ZERO_MATCH_MESSAGE = "خیلی کند بودی، دفعه ی بعدی بیشتر دقت کن";

function ResultRow({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="result__row">
      <span className="result__label">{label}</span>
      <span className={`result__value${big ? " result__value--xl" : ""}`}>{value}</span>
    </div>
  );
}

/**
 * In-game result screen shown after the third STOP.
 * Prizes come from EXACT digit matches only; navigation happens outside the
 * game (the host renders its own continue button), so this screen carries
 * no buttons of its own.
 */
export function ResultDisplay({ target, final, result, reducedMotion }: ResultDisplayProps) {
  const perfect = result.perfect;

  return (
    <div
      className={`result${perfect ? " result--perfect" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={perfect ? "برد کامل" : "نتیجهٔ بازی"}
    >
      {perfect && !reducedMotion && <Confetti />}

      <div className="result__card">
        {perfect ? (
          <>
            <span className="result__perfect-title">عالی!</span>
            <span className="result__value result__value--xl">
              {toPersianDigits(formatDigits(final))}
            </span>
            <span className="result__note">هر سه رقم درست بود!</span>
            <span className="result__label">جایزه</span>
            <span className="result__prize">{formatPrize(result.prize)}</span>
          </>
        ) : (
          <>
            <ResultRow label="عدد شما" value={toPersianDigits(formatDigits(final))} big />
            <ResultRow label="عدد هدف" value={toPersianDigits(formatDigits(target))} />
            <ResultRow
              label="رقم‌های درست"
              value={`${toPersianDigits(result.correctDigits)} از ۳`}
            />
            {result.correctDigits === 0 ? (
              <p className="result__fun-message">{ZERO_MATCH_MESSAGE}</p>
            ) : (
              <div className="result__row">
                <span className="result__label">جایزه</span>
                <span className="result__prize">{formatPrize(result.prize)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
