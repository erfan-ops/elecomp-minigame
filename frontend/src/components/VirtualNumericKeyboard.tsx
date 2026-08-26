/**
 * On-screen numeric keyboard for the mobile-number field.
 * The kiosk has no physical keyboard — digits are entered exclusively
 * through this component (the mobile field is not a real <input>, so the
 * browser keyboard never appears).
 */
const DIGIT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

interface VirtualNumericKeyboardProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onConfirm: () => void;
}

export function VirtualNumericKeyboard({
  onDigit,
  onBackspace,
  onConfirm,
}: VirtualNumericKeyboardProps) {
  return (
    <div className="keyboard keyboard--numeric" role="group" aria-label="صفحه‌کلید عددی">
      {DIGIT_KEYS.map((digit) => (
        <button
          key={digit}
          type="button"
          className="keyboard__key"
          onClick={() => onDigit(digit)}
          aria-label={`عدد ${digit}`}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        className="keyboard__key keyboard__key--action"
        onClick={onBackspace}
        aria-label="حذف رقم"
      >
        ⌫
      </button>
      <button
        type="button"
        className="keyboard__key"
        onClick={() => onDigit("0")}
        aria-label="عدد 0"
      >
        0
      </button>
      <button
        type="button"
        className="keyboard__key keyboard__key--action"
        onClick={onConfirm}
        aria-label="تأیید"
      >
        ✓
      </button>
    </div>
  );
}
