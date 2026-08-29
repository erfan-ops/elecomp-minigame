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

/**
 * Rendered reel geometry, measured from the DOM. The strip math needs only
 * the window/item ratio, so any rendered reel size — whatever the `--s`
 * scale or CSS tokens resolve to — centers the digit correctly. No pixel
 * values are hardcoded here.
 */
interface ReelGeometry {
  /** Rendered height of one digit item (CSS px). */
  itemH: number;
  /** Rendered height of the reel window (CSS px). */
  windowH: number;
}

/**
 * Strip offset (in item heights) that puts the centered digit in the window:
 * translating by −(offset + position) × itemH must center item
 * (position + 10) on windowH / 2, so offset = 10.5 − windowH / (2 × itemH).
 */
function centeringOffset({ itemH, windowH }: ReelGeometry): number {
  return 10.5 - windowH / (2 * itemH);
}
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
  /** Whether this wheel is the next one a STOP press will lock. */
  active?: boolean;
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
  active = false,
  reducedMotion = false,
  ariaLabel,
}: NumberWheelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const digitRef = useRef<HTMLSpanElement>(null);
  /** Measured rendered geometry — refreshed by a ResizeObserver (below). */
  const geometryRef = useRef<ReelGeometry>({ itemH: 0, windowH: 0 });
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

  /** Re-measure the rendered digit/window sizes from the DOM. */
  const measureGeometry = () => {
    const digitEl = digitRef.current;
    const windowEl = windowRef.current;
    if (!digitEl || !windowEl) return;
    geometryRef.current = {
      itemH: digitEl.getBoundingClientRect().height,
      windowH: windowEl.clientHeight,
    };
  };

  const writeTransform = () => {
    const strip = stripRef.current;
    const { itemH, windowH } = geometryRef.current;
    if (!strip || itemH <= 0 || windowH <= 0) return; // unmeasured — the observer below catches up
    const percent =
      (-(centeringOffset({ itemH, windowH }) + positionRef.current) * 100) /
      STRIP_LENGTH + 0.5;
    strip.style.transform = `translate3d(0, ${percent}%, 0)`;
  };

  // Measure the rendered reel and write the initial transform before the first
  // paint; a ResizeObserver keeps the centering exact if the reel is re-laid
  // out (font load, window resize). Only the digit/window ratio matters, so
  // any rendered size centers correctly.
  useLayoutEffect(() => {
    measureGeometry();
    writeTransform();
    const observer = new ResizeObserver(() => {
      measureGeometry();
      writeTransform();
    });
    if (digitRef.current) observer.observe(digitRef.current);
    if (windowRef.current) observer.observe(windowRef.current);
    return () => observer.disconnect();
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
    active && rolling ? "number-wheel--active" : "",
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
      <div className="number-wheel__window" ref={windowRef}>
        <div
          className="number-wheel__strip"
          ref={stripRef}
          aria-hidden="true"
          data-reduced-motion={reducedMotion || undefined}
        >
          {STRIP_ITEMS.map((item, index) => (
            <span
              key={index}
              ref={index === 0 ? digitRef : undefined}
              className="number-wheel__digit"
            >
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
