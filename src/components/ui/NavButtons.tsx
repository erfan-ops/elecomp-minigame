interface NavButtonsProps {
  onBack: () => void;
  onContinue: () => void;
  /** Disables the continue button until the step is answerable. */
  continueDisabled?: boolean;
  backLabel?: string;
  continueLabel?: string;
}

/** بازگشت / ادامه — the page-2 navigation pair. */
export function NavButtons({
  onBack,
  onContinue,
  continueDisabled = false,
  backLabel = "بازگشت",
  continueLabel = "ادامه",
}: NavButtonsProps) {
  return (
    <div className="nav-buttons">
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
