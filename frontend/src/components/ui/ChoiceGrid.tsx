interface ChoiceGridProps<O extends string> {
  options: readonly O[];
  selected: O | null;
  onSelect: (option: O) => void;
  /**
   * Renders the last option as a card spanning both columns — used when an
   * odd trailing option (the survey's «کار نمی‌کنم») completes the set.
   */
  wideLastOption?: boolean;
}

/**
 * A 2-column grid of large glass answer cards. RTL grid order: the first
 * option renders top-right, the second top-left, and so on. Generic over the
 * option type so literal-union options keep their types at the call site.
 */
export function ChoiceGrid<O extends string>({
  options,
  selected,
  onSelect,
  wideLastOption = false,
}: ChoiceGridProps<O>) {
  const lastIndex = options.length - 1;

  return (
    <div className="choice-grid" role="group">
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          className={[
            "choice-card",
            option === selected ? "choice-card--selected" : "",
            wideLastOption && index === lastIndex ? "choice-card--wide" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={option === selected}
          onClick={() => onSelect(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
