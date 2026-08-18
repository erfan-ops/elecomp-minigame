import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Ref } from "react";
import { toPersianDigits } from "../../../utils/persian";
import {
  LOCK_PULSE_MS,
  SPRING_DAMPING,
  SPRING_STIFFNESS,
  STRIP_REPEATS,
} from "../config";

/**
 * A vertical number reel.
 *
 * The wheel renders a strip holding three copies of 0–9. While rolling, the
 * strip's position advances continuously and wraps modulo 10 digits — which
 * lands on visually identical content, so the loop is seamless. Stopping
 * integrates a damped spring (deceleration + a small settling bounce) toward
 * the digit that was showing when STOP was pressed.
 *
 * The transform is written straight to the DOM through a ref on every
 * animation frame: React never re-renders while a wheel is spinning, and
 * only GPU-friendly translate3d is used.
 */

const STRIP_LENGTH = 10 * STRIP_REPEATS;
/** Vertical offset (in item heights) that centers item 10 (digit 0) at position 0. */
const BASE_OFFSET = 9;
/** How close (in item heights) a spring may be to its target before we snap. */
const SETTLE_EPSILON = 0.004;
/** How slow (in item heights/second) a settle may be before we consider it done. */
const SETTLE_MIN_VELOCITY = 0.06;

/** Items rendered in the strip, top to bottom: ۰ ۱ ۲ … ۹, repeated (Persian display). */
const STRIP_ITEMS = Array.from({ length: STRIP_LENGTH }, (_, index) =>
  toPersianDigits(index % 10),
);

/** Digit currently centered for a given (continuous) strip position. */
function digitFromPosition(position: number): number {
  return ((Math.round(position) % 10) + 10) % 10;
}

/**
 * The closest strip position that displays `digit` — the settle target.
 * Positions are periodic (period 10), so this is at most 5 digits away.
 */
function nearestTarget(position: number, digit: number): number {
  return digit + 10 * Math.round((position - digit) / 10);
}

export interface NumberWheelHandle {
  /** The digit currently centered in the wheel, 0–9. */
  getCurrentDigit(): number;
}

export interface NumberWheelProps {
  /** Imperative handle used to read the live digit when STOP is pressed. */
  ref?: Ref<NumberWheelHandle>;
  /** Authoritative digit — the wheel animates to rest on this value when not rolling. */
  digit: number;
  /** Whether the wheel is currently spinning. */
  rolling: boolean;
  /** Spin speed in digits per second. */
  speed: number;
  /** Whether the wheel has been locked by a STOP press. */
  locked?: boolean;
  /** When true, the spin blur is skipped (respects prefers-reduced-motion). */
  reducedMotion?: boolean;
  /** Accessible name for the wheel. */
  ariaLabel?: string;
}

export function NumberWheel({
  ref,
  digit,
  rolling,
  speed,
  locked = false,
  reducedMotion = false,
  ariaLabel,
}: NumberWheelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  /** Continuous strip position in item heights, kept in [0, 10) while rolling. */
  const positionRef = useRef<number>(digit);
  /** Tracks the previous `rolling` value so a lock can be detected. */
  const wasRollingRef = useRef<boolean>(false);
  /** Short-lived flag that triggers the lock pulse animation. */
  const [justLocked, setJustLocked] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      getCurrentDigit: () => digitFromPosition(positionRef.current),
    }),
    [],
  );

  const writeTransform = () => {
    const strip = stripRef.current;
    if (!strip) return;
    const percent = (-(BASE_OFFSET + positionRef.current) * 100) / STRIP_LENGTH;
    strip.style.transform = `translate3d(0, ${percent}%, 0)`;
  };

  // Apply the initial transform before the first paint.
  useLayoutEffect(() => {
    writeTransform();
  }, []);

  // Continuous spin loop — runs only while `rolling` is true.
  useEffect(() => {
    if (!rolling) return;
    wasRollingRef.current = true;

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      positionRef.current = (positionRef.current + speed * dt) % 10;
      writeTransform();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [rolling, speed]);

  // Settle loop — springs to rest on `digit` whenever the wheel is not rolling.
  useEffect(() => {
    if (rolling) return;

    const wasRolling = wasRollingRef.current;
    wasRollingRef.current = false;

    let pulseTimer: number | undefined;
    if (wasRolling) {
      setJustLocked(true);
      pulseTimer = window.setTimeout(() => setJustLocked(false), LOCK_PULSE_MS);
    }

    let raf = 0;
    let last = performance.now();
    let q = positionRef.current;
    // A wheel that just stopped inherits its spin momentum for a physical deceleration.
    let velocity = wasRolling ? speed : 0;
    const target = nearestTarget(q, digit);

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const error = target - q;
      velocity += (SPRING_STIFFNESS * error - SPRING_DAMPING * velocity) * dt;
      q += velocity * dt;
      positionRef.current = q;
      writeTransform();
      if (Math.abs(target - q) < SETTLE_EPSILON && Math.abs(velocity) < SETTLE_MIN_VELOCITY) {
        positionRef.current = digit;
        writeTransform();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (pulseTimer !== undefined) window.clearTimeout(pulseTimer);
    };
  }, [rolling, digit, speed]);

  const classNames = [
    "number-wheel",
    rolling ? "number-wheel--rolling" : "",
    locked && !rolling ? "number-wheel--locked" : "",
    justLocked ? "number-wheel--just-locked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      role="img"
      aria-label={`${ariaLabel ?? "چرخ عدد"}${rolling ? "، در حال چرخش" : `، عدد ${toPersianDigits(digit)}`}`}
    >
      <div className="number-wheel__window">
        <div className="number-wheel__center" aria-hidden="true" />
        <div
          className="number-wheel__strip"
          ref={stripRef}
          aria-hidden="true"
          data-reduced-motion={reducedMotion || undefined}
        >
          {STRIP_ITEMS.map((item, index) => (
            <span key={index} className="number-wheel__digit">
              {item}
            </span>
          ))}
        </div>
        <div className="number-wheel__fade number-wheel__fade--top" aria-hidden="true" />
        <div className="number-wheel__fade number-wheel__fade--bottom" aria-hidden="true" />
      </div>
    </div>
  );
}
