interface ChoiceGridProps<O extends string> {
  options: readonly O[];
  selected: O | null;
  onSelect: (option: O) => void;
  /** Dims and disables the whole grid (the skip checkbox on survey step 1). */
  disabled?: boolean;
}

/**
 * A 2×2 grid of large glass answer cards. RTL grid order: the first option
 * renders top-right, the second top-left, and so on. Generic over the
 * option type so literal-union options keep their types at the call site.
 */
export function ChoiceGrid<O extends string>({
  options,
  selected,
  onSelect,
  disabled = false,
}: ChoiceGridProps<O>) {
  return (
    <div
      className={`choice-grid${disabled ? " choice-grid--disabled" : ""}`}
      role="group"
      aria-disabled={disabled}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`choice-card${option === selected ? " choice-card--selected" : ""}`}
          aria-pressed={option === selected}
          onClick={() => onSelect(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
