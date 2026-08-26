interface KeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onConfirm: () => void;
  /** Disables the confirm key (e.g. while an async submit check runs). */
  confirmDisabled?: boolean;
}

const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * The redesigned numeric keypad. Visual order is left→right as written
 * (forced LTR): 1 2 3 / 4 5 6 / 7 8 9 / تایید 0 ⌫. Keys carry English
 * digit labels (the bundled font renders them with Persian glyphs);
 * «تایید» is the primary-gradient confirm key.
 */
export function Keypad({ onDigit, onBackspace, onConfirm, confirmDisabled = false }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="صفحه‌کلید عددی">
      {KEYPAD_DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          className="keypad__key"
          onClick={() => onDigit(digit)}
          aria-label={`عدد ${digit}`}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        className="keypad__key keypad__key--confirm"
        onClick={onConfirm}
        disabled={confirmDisabled}
        aria-label="تأیید"
      >
        تایید
      </button>
      <button
        type="button"
        className="keypad__key"
        onClick={() => onDigit("0")}
        aria-label="عدد 0"
      >
        0
      </button>
      <button
        type="button"
        className="keypad__key"
        onClick={onBackspace}
        aria-label="حذف رقم"
      >
        ⌫
      </button>
    </div>
  );
}
