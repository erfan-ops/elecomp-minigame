import type { CSSProperties } from "react";

interface Decoration {
  glyph: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
}

/**
 * The page-2 floating emoji decorations, positioned against the 1080×1800
 * design canvas (x/y/size in design px) with a soft cyan glow. Purely
 * atmospheric — pointer-events never reach them.
 */
const DECORATIONS: readonly Decoration[] = [
  { glyph: "⭐", x: 30, y: 425, size: 44, rotate: -8 },
  { glyph: "🎉", x: 467, y: 457, size: 34, rotate: 6 },
  { glyph: "🎲", x: 893, y: 335, size: 34, rotate: -12 },
  { glyph: "💎", x: 30, y: 804, size: 34, rotate: 10 },
  { glyph: "✨", x: 1003, y: 902, size: 41, rotate: 0 },
  { glyph: "🎮", x: 267, y: 1238, size: 45, rotate: -6 },
  { glyph: "🎁", x: 950, y: 1386, size: 62, rotate: 8 },
  { glyph: "🎯", x: 366, y: 1535, size: 34, rotate: 12 },
];

export function FloatingDecorations() {
  return (
    <div className="floating-deco" aria-hidden="true">
      {DECORATIONS.map((decoration) => {
        const style = {
          left: `${decoration.x / 16}rem`,
          top: `${decoration.y / 16}rem`,
          fontSize: `${decoration.size / 16}rem`,
          transform: `rotate(${decoration.rotate}deg)`,
        } as CSSProperties;
        return (
          <span key={`${decoration.glyph}-${decoration.x}-${decoration.y}`} style={style}>
            {decoration.glyph}
          </span>
        );
      })}
    </div>
  );
}
