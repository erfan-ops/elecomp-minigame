import { toPersianDigits } from "../../../utils/persian";
import { formatDigits } from "../gameEngine";
import type { Digits } from "../types";

interface TargetDisplayProps {
  digits: Digits;
}

/** The target number, always rendered as exactly three Persian digits. */
export function TargetDisplay({ digits }: TargetDisplayProps) {
  const value = toPersianDigits(formatDigits(digits));
  return (
    <div className="target" role="group" aria-label={`عدد هدف ${value}`}>
      <span className="target__label">هدف</span>
      <span className="target__value" aria-hidden="true">
        {value}
      </span>
    </div>
  );
}
