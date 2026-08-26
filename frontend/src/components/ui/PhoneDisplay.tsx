import { toPersianDigits } from "../../utils/persian";

interface PhoneDisplayProps {
  /** Entered digits (Latin); rendered as Persian numerals. */
  value: string;
  placeholder?: string;
}

/**
 * The keypad-driven mobile display (no real <input> — the browser/OS
 * keyboard never appears). Digits are written as English numbers; the
 * bundled fonts render them with Persian glyph shapes.
 */
export function PhoneDisplay({ value, placeholder = "09---------" }: PhoneDisplayProps) {
  return (
    <div
      className="phone-display"
      role="textbox"
      aria-label={`شماره موبایل${value ? `: ${toPersianDigits(value)}` : ""}`}
    >
      {value ? (
        <span className="phone-display__value">{value}</span>
      ) : (
        <span className="phone-display__placeholder">{placeholder}</span>
      )}
    </div>
  );
}
