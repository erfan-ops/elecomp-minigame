import type { CSSProperties, ReactNode } from "react";

interface GradientTextProps {
  /** Optional gradient override (defaults to the heading gradient token). */
  gradient?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Text filled with a CSS gradient (background-clip: text). The gradient is
 * passed as a per-instance CSS variable, following the Confetti precedent
 * for computed per-instance values.
 */
export function GradientText({ gradient, className, children }: GradientTextProps) {
  const style = gradient
    ? ({ "--ds-text-gradient": gradient } as CSSProperties)
    : undefined;
  const classes = ["gradient-text", className].filter(Boolean).join(" ");
  return (
    <span className={classes} style={style}>
      {children}
    </span>
  );
}
