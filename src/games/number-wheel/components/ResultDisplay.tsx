import { Confetti } from "../../../components/Confetti";
import { toPersianDigits } from "../../../utils/persian";
import { BASE_PRIZE, CURRENCY_SYMBOL } from "../config";
import { formatDigits } from "../gameEngine";
import { formatPrize } from "../prizeCalculator";
import type { Digits, PrizeResult } from "../types";

interface ResultDisplayProps {
  target: Digits;
  final: Digits;
  result: PrizeResult;
  reducedMotion: boolean;
}

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
 * Navigation happens outside the game (the host renders its own continue
 * button), so this screen carries no buttons of its own.
 */
export function ResultDisplay({ target, final, result, reducedMotion }: ResultDisplayProps) {
  const perfect = result.distance === 0;

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
            <span className="result__note">به هدف زدی!</span>
            <span className="result__label">جایزه</span>
            <span className="result__prize">{toPersianDigits(formatPrize(result.prize))}</span>
          </>
        ) : (
          <>
            <ResultRow label="هدف" value={toPersianDigits(formatDigits(target))} />
            <ResultRow label="عدد شما" value={toPersianDigits(formatDigits(final))} big />
            <ResultRow label="اختلاف" value={toPersianDigits(result.distance)} />
            <div className="result__row">
              <span className="result__label">جایزه</span>
              <span className="result__prize">{toPersianDigits(formatPrize(result.prize))}</span>
              <span className="result__percent">
                {toPersianDigits(result.percentage)}٪ از {CURRENCY_SYMBOL}
                {toPersianDigits(BASE_PRIZE)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
