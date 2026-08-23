import { toPersianDigits } from "../../../utils/persian";
import { formatDigits } from "../gameEngine";
import type { Digits } from "../types";

interface TargetDisplayProps {
  digits: Digits;
  /** When true each digit is tappable (cycles +1) and the random button shows. */
  editable: boolean;
  onDigitTap: (index: number) => void;
  onRandom: () => void;
}

/**
 * The target number. Before the game starts it doubles as the target editor:
 * tapping a digit cycles it 0→9, and «عدد تصادفی» fills a random number.
 */
export function TargetDisplay({ digits, editable, onDigitTap, onRandom }: TargetDisplayProps) {
  const value = toPersianDigits(formatDigits(digits));
  return (
    <div className="target" role="group" aria-label={`عدد هدف ${value}`}>
      <span className="target__label">هدف</span>
      <div className="target__digits">
        {digits.map((digit, index) => (
          <button
            key={index}
            type="button"
            className="target__digit"
            disabled={!editable}
            onClick={() => onDigitTap(index)}
            aria-label={`رقم ${index + 1} عدد هدف`}
          >
            {toPersianDigits(digit)}
          </button>
        ))}
      </div>
      {editable && (
        <>
          <span className="target__hint">برای تغییر عدد، روی هر رقم بزنید</span>
          <button type="button" className="btn btn--ghost target__random" onClick={onRandom}>
            عدد تصادفی
          </button>
        </>
      )}
    </div>
  );
}
