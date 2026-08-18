/**
 * On-screen Persian letter keyboard for the name fields.
 * The kiosk has no physical keyboard — names are entered exclusively
 * through this component (the name fields are not real <input>s, so the
 * browser keyboard never appears).
 */
const KEY_ROWS = [
  ["ض", "ص", "ث", "ق", "ف", "غ", "ع", "ه", "خ", "ح", "ج", "چ"],
  ["ش", "س", "ی", "ب", "ل", "ا", "ت", "ن", "م", "ک", "گ"],
  ["ظ", "ط", "ز", "ر", "ذ", "د", "پ", "و"],
] as const;

interface VirtualKeyboardProps {
  onKey: (letter: string) => void;
  onSpace: () => void;
  onBackspace: () => void;
  onConfirm: () => void;
}

export function VirtualKeyboard({
  onKey,
  onSpace,
  onBackspace,
  onConfirm,
}: VirtualKeyboardProps) {
  return (
    <div className="keyboard keyboard--letters" role="group" aria-label="صفحه‌کلید حروف">
      {KEY_ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="keyboard__row">
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className="keyboard__key"
              onClick={() => onKey(letter)}
              aria-label={`حرف ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className="keyboard__row">
        <button
          type="button"
          className="keyboard__key keyboard__key--wide"
          onClick={onSpace}
          aria-label="فاصله"
        >
          فاصله
        </button>
        <button
          type="button"
          className="keyboard__key keyboard__key--action"
          onClick={onBackspace}
          aria-label="حذف"
        >
          ⌫
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
    </div>
  );
}
