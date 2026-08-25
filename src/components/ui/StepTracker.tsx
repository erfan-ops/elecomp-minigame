import { Fragment } from "react";

/** The full kiosk journey, shown by the tracker on every page. */
export const JOURNEY_STEPS = [
  "شماره موبایل",
  "سوال 1",
  "سوال 2",
  "سوال 3",
  "بازی",
] as const;

interface StepTrackerProps {
  steps: readonly string[];
  /** 0-based index of the current step; steps before it render as passed. */
  currentIndex: number;
}

/**
 * The journey progress tracker: numbered circles + labels joined by
 * connector lines, laid out right→left (RTL). Steps up to and including
 * `currentIndex` get the primary gradient treatment.
 */
export function StepTracker({ steps, currentIndex }: StepTrackerProps) {
  return (
    <nav className="step-tracker" aria-label="مراحل مسابقه">
      {steps.map((label, index) => (
        <Fragment key={label}>
          {index > 0 && <span className="step-tracker__connector" aria-hidden="true" />}
          <span
            className={`step-tracker__step${index <= currentIndex ? " step-tracker__step--active" : ""}`}
          >
            <span className="step-tracker__circle">{index + 1}</span>
            <span className="step-tracker__label">{label}</span>
          </span>
        </Fragment>
      ))}
    </nav>
  );
}
