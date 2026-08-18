import { toPersianDigits } from "../../../utils/persian";
import type { GameState, StoppedCount } from "../types";

const TOTAL_WHEELS = 3;

interface GameControlsProps {
  state: GameState;
  stoppedCount: StoppedCount;
  onStart: () => void;
  onStop: () => void;
}

/** START / STOP — the primary touch interaction of the game. */
export function GameControls({ state, stoppedCount, onStart, onStop }: GameControlsProps) {
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
        <button
          type="button"
          className="btn btn--stop"
          onClick={onStop}
          aria-label={`توقف چرخ بعدی، ${toPersianDigits(TOTAL_WHEELS - stoppedCount)} چرخ باقی مانده`}
        >
          توقف
        </button>
      </div>
    );
  }

  return null;
}
