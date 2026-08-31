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
  /** File name inside `public/deco/`, without the `.svg` extension. */
  asset: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
  /** Which animation this decoration plays (design-system.css `deco-*` keyframes). */
  motion: DecoMotion;
}

/**
 * The floating SVG decorations (every page), positioned against the
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
  { asset: "Star", x: 30, y: 425, size: 44, rotate: -8, motion: "bob" },
  { asset: "Party popper", x: 450, y: 320, size: 34, rotate: 6, motion: "sway" },
  { asset: "Game die", x: 893, y: 335, size: 34, rotate: -12, motion: "flip" },
  { asset: "Gem stone", x: 30, y: 804, size: 34, rotate: 10, motion: "twinkle" },
  { asset: "Sparkles", x: 1003, y: 902, size: 41, rotate: 0, motion: "drift" },
  { asset: "Video game", x: 267, y: 1238, size: 45, rotate: -6, motion: "hover" },
  { asset: "Wrapped gift", x: 950, y: 1386, size: 62, rotate: 8, motion: "bounce" },
  { asset: "Bullseye", x: 366, y: 1535, size: 34, rotate: 12, motion: "spin" },
];

/** Phase offset per decoration (seconds) — the stagger breaks sync. */
const MOTION_STAGGER_S = 0.7;

/**
 * Relative on purpose (not `/deco/…` like the logos): the pywebview build
 * loads index.html over `file://`, where a root-absolute path points outside
 * the app folder. `encodeURI` covers the space in names like «Party popper».
 */
const decoSrc = (asset: string) => encodeURI(`deco/${asset}.svg`);

export function FloatingDecorations() {
  return (
    <div className="floating-deco" aria-hidden="true">
      {DECORATIONS.map((decoration, index) => {
        const style = {
          left: `${decoration.x / 16}rem`,
          top: `${decoration.y / 16}rem`,
          // Both axes: the files are `width="100%" height="100%"` over a
          // 32×32 viewBox, so they carry no intrinsic size to fall back on.
          width: `${decoration.size / 16}rem`,
          height: `${decoration.size / 16}rem`,
          transform: `rotate(${decoration.rotate}deg)`,
          animationDelay: `-${index * MOTION_STAGGER_S}s`,
        } as CSSProperties;
        return (
          <img
            key={decoration.asset}
            className={`floating-deco__item floating-deco__item--${decoration.motion}`}
            src={decoSrc(decoration.asset)}
            alt=""
            style={style}
          />
        );
      })}
    </div>
  );
}
