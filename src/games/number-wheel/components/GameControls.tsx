import type { GameState, StoppedCount } from "../types";

const TOTAL_WHEELS = 3;

interface GameControlsProps {
  state: GameState;
  stoppedCount: StoppedCount;
  onStart: () => void;
}

/** START (touch) + progress dots. STOP comes from the presenter's keyboard. */
export function GameControls({ state, stoppedCount, onStart }: GameControlsProps) {
  if (state === "IDLE") {
    return (
      <div className="controls">
        <button type="button" className="btn btn--start" onClick={onStart}>
          شروع
        </button>
      </div>
    );
  }

  if (state === "RUNNING") {
    // The STOP presses come from the presenter's keyboard (Page Up /
    // Page Down / b / F5 — the same keys also start the game from IDLE).
    // There is deliberately no on-screen stop button.
    return (
      <div className="controls">
        <div className="stop-dots" aria-hidden="true">
          {Array.from({ length: TOTAL_WHEELS }, (_, index) => (
            <span
              key={index}
              className={`stop-dot${index < stoppedCount ? " stop-dot--done" : ""}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
