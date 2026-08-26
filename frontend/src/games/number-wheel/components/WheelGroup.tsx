import type { RefObject } from "react";
import type { Digits, GameState } from "../types";
import { NumberWheel } from "./NumberWheel";
import type { NumberWheelHandle } from "./NumberWheel";

const WHEEL_LABELS = ["چرخ عدد اول", "چرخ عدد دوم", "چرخ عدد سوم"] as const;

interface WheelGroupProps {
  digits: Digits;
  /** Spin state per wheel; index 0 = left (hundreds), 2 = right (ones). */
  rolling: readonly [boolean, boolean, boolean];
  /** Spin speed per wheel, in digits per second. */
  speeds: readonly [number, number, number];
  /** Refs used to read the live digit of each wheel when STOP is pressed. */
  wheelRefs: readonly RefObject<NumberWheelHandle | null>[];
  state: GameState;
  reducedMotion: boolean;
}

export function WheelGroup({
  digits,
  rolling,
  speeds,
  wheelRefs,
  state,
  reducedMotion,
}: WheelGroupProps) {
  // The next wheel a STOP press will lock is the leftmost one still rolling.
  const activeIndex = state === "RUNNING" ? rolling.findIndex(Boolean) : -1;
  return (
    <div className="wheel-group" role="group" aria-label="چرخ‌های عدد">
      {digits.map((digit, index) => (
        <NumberWheel
          key={index}
          ref={wheelRefs[index]}
          digit={digit}
          rolling={rolling[index]}
          speed={speeds[index]}
          locked={state !== "IDLE" && !rolling[index]}
          active={activeIndex === index}
          reducedMotion={reducedMotion}
          ariaLabel={WHEEL_LABELS[index]}
        />
      ))}
    </div>
  );
}
