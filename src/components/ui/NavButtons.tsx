interface NavButtonsProps {
  onBack: () => void;
  onContinue: () => void;
  /** Disables the continue button until the step is answerable. */
  continueDisabled?: boolean;
  backLabel?: string;
  continueLabel?: string;
  /** Extra class on the row (e.g. page-specific button widths). */
  className?: string;
}

/** بازگشت / ادامه — the page-2 navigation pair. */
export function NavButtons({
  onBack,
  onContinue,
  continueDisabled = false,
  backLabel = "بازگشت",
  continueLabel = "ادامه",
  className,
}: NavButtonsProps) {
  return (
    <div className={["nav-buttons", className].filter(Boolean).join(" ")}>
      <button type="button" className="nav-button" onClick={onBack}>
        {backLabel}
      </button>
      <button
        type="button"
        className="nav-button nav-button--primary"
        onClick={onContinue}
        disabled={continueDisabled}
      >
        {continueLabel}
      </button>
    </div>
  );
}
