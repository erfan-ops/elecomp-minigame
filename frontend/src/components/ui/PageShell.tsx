import type { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  /** The journey header — every page passes `GameHeader`. */
  logo: ReactNode;
  /** Atmospheric layer above the background and below the content. */
  decorations: ReactNode;
}

/**
 * The redesigned page shell: dark canvas, the shared lighting spec (four
 * corner radial glows + a top-edge cyan wash), the header as the first
 * element, and the scaled content frame (padding top 138 / inline 56 /
 * bottom 56 design px). Every page renders the same shell — the first page
 * no longer differs from the rest.
 */
export function PageShell({ children, logo, decorations }: PageShellProps) {
  return (
    <div className="page-shell">
      <div className="page-shell__glows" aria-hidden="true">
        <span className="page-shell__glow page-shell__glow--cyan-tl" />
        <span className="page-shell__glow page-shell__glow--teal-tr" />
        <span className="page-shell__glow page-shell__glow--cyan-bl" />
        <span className="page-shell__glow page-shell__glow--yellow-br" />
        <span className="page-shell__glow page-shell__glow--edge" />
      </div>
      {decorations}
      <div className="page-shell__frame">
        {logo}
        {children}
      </div>
    </div>
  );
}
