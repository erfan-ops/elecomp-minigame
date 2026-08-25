import type { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  /**
   * Replaces the default `Container.svg` logo with a custom header
   * (page 2+ uses `GameHeader`).
   */
  logo?: ReactNode;
  /** Atmospheric layer above the background and below the content. */
  decorations?: ReactNode;
  /** Background variant: "default" (page 1) or "survey" (pages 2+). */
  variant?: "default" | "survey";
}

/**
 * The redesigned page shell: dark canvas, blurred atmospheric glows behind
 * the content, a header/logo as the first element, and the scaled content
 * frame (padding top 138 / inline 56 / bottom 56 design px, 84 design px
 * between major sections). The "survey" variant uses the page-2 lighting
 * spec (four corner radials + a top-edge cyan overlay) and a tighter
 * header→stepper gap.
 */
export function PageShell({
  children,
  logo,
  decorations,
  variant = "default",
}: PageShellProps) {
  const classes = ["page-shell"];
  if (variant === "survey") classes.push("page-shell--survey");
  return (
    <div className={classes.join(" ")}>
      <div className="page-shell__glows" aria-hidden="true">
        {variant === "survey" ? (
          <>
            <span className="page-shell__glow page-shell__glow--cyan-tl" />
            <span className="page-shell__glow page-shell__glow--teal-tr" />
            <span className="page-shell__glow page-shell__glow--cyan-bl" />
            <span className="page-shell__glow page-shell__glow--yellow-br" />
            <span className="page-shell__glow page-shell__glow--edge" />
          </>
        ) : (
          <>
            <span className="page-shell__glow page-shell__glow--deep" />
            <span className="page-shell__glow page-shell__glow--plum" />
            <span className="page-shell__glow page-shell__glow--teal" />
          </>
        )}
      </div>
      {decorations}
      <div className="page-shell__frame">
        {logo ?? (
          <img className="page-shell__logo" src="/Container.svg" alt="اسمارتیس" />
        )}
        {children}
      </div>
    </div>
  );
}
