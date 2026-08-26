import type { CSSProperties } from "react";

/** Motion ids — each maps to a `.floating-deco__item--<motion>` animation in design-system.css. */
type DecoMotion =
  | "bob"
  | "sway"
  | "flip"
  | "twinkle"
  | "drift"
  | "hover"
  | "bounce"
  | "spin";

interface Decoration {
  glyph: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  /** Which animation this decoration plays (design-system.css `deco-*` keyframes). */
  motion: DecoMotion;
}

/**
 * The floating emoji decorations (every page), positioned against the
 * 1080×1800 design canvas (x/y/size in design px) with a soft cyan glow.
 * Purely atmospheric — pointer-events never reach them. Each decoration
 * plays its own `motion` animation (up/down, sway, 3D tumble, twinkle,
 * drift, hover combo, bounce, spin), staggered by a negative inline
 * `animation-delay` so they never move in sync. Animations target the
 * individual translate/rotate/scale/opacity properties so the inline
 * `transform: rotate(...)` tilt still composes; the global reduced-motion
 * rule in global.css disables them all.
 */
const DECORATIONS: readonly Decoration[] = [
  { glyph: "⭐", x: 30, y: 425, size: 44, rotate: -8, motion: "bob" },
  { glyph: "🎉", x: 467, y: 457, size: 34, rotate: 6, motion: "sway" },
  { glyph: "🎲", x: 893, y: 335, size: 34, rotate: -12, motion: "flip" },
  { glyph: "💎", x: 30, y: 804, size: 34, rotate: 10, motion: "twinkle" },
  { glyph: "✨", x: 1003, y: 902, size: 41, rotate: 0, motion: "drift" },
  { glyph: "🎮", x: 267, y: 1238, size: 45, rotate: -6, motion: "hover" },
  { glyph: "🎁", x: 950, y: 1386, size: 62, rotate: 8, motion: "bounce" },
  { glyph: "🎯", x: 366, y: 1535, size: 34, rotate: 12, motion: "spin" },
];

/** Phase offset per decoration (seconds) — the stagger breaks sync. */
const MOTION_STAGGER_S = 0.7;

export function FloatingDecorations() {
  return (
    <div className="floating-deco" aria-hidden="true">
      {DECORATIONS.map((decoration, index) => {
        const style = {
          left: `${decoration.x / 16}rem`,
          top: `${decoration.y / 16}rem`,
          fontSize: `${decoration.size / 16}rem`,
          transform: `rotate(${decoration.rotate}deg)`,
          animationDelay: `-${index * MOTION_STAGGER_S}s`,
        } as CSSProperties;
        return (
          <span
            key={`${decoration.glyph}-${decoration.x}-${decoration.y}`}
            className={`floating-deco__item floating-deco__item--${decoration.motion}`}
            style={style}
          >
            {decoration.glyph}
          </span>
        );
      })}
    </div>
  );
}
