import { useMemo } from "react";
import type { CSSProperties } from "react";

/** The platform's game palette (cyan/teal/green/gold) + white. */
const COLORS = [
  "#36AEBF",
  "#2FD6C4",
  "#6FE4F2",
  "#34D17A",
  "#FFCF3A",
  "#ffffff",
] as const;

interface ConfettiProps {
  count?: number;
}

/**
 * Lightweight, dependency-free confetti for exact-match celebrations.
 * A small set of absolutely positioned pieces animated with pure CSS.
 * Shared platform primitive — games render it inside their own result
 * overlays (skipped entirely when the user prefers reduced motion).
 */
export function Confetti({ count = 64 }: ConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => {
        // Pieces ≈ 8–14 × 9–18 px (the Figma's ~12×18 confetti).
        const size = 8 + Math.random() * 6;
        return {
          key: index,
          style: {
            left: `${Math.random() * 100}%`,
            width: size,
            height: size * (1.1 + Math.random() * 0.5),
            backgroundColor: COLORS[Math.floor(Math.random() * COLORS.length)],
            animationDelay: `${Math.random() * 0.6}s`,
            animationDuration: `${2.2 + Math.random() * 1.8}s`,
            "--drift": `${(Math.random() - 0.5) * 180}px`,
            "--spin": `${(Math.random() - 0.5) * 720}deg`,
          } as CSSProperties,
        };
      }),
    [count],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <span key={piece.key} className="confetti__piece" style={piece.style} />
      ))}
    </div>
  );
}
