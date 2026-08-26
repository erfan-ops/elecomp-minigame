/**
 * Design-scale mechanism.
 *
 * The redesigned UI is composed against a fixed design canvas
 * (DESIGN_WIDTH × DESIGN_HEIGHT). At boot, a single CSS variable `--s` is
 * set to min(viewportWidth/DESIGN_WIDTH, viewportHeight/DESIGN_HEIGHT), and
 * the design-system CSS expresses every fixed dimension in rem against a
 * root font-size of calc(var(--s) * 16px). When the real device resolution
 * is known, updating the two constants below refits the whole UI.
 */

export const DESIGN_WIDTH = 1080;
export const DESIGN_HEIGHT = 1800;

/** Sets `--s` on <html> and keeps it in sync on resize. Called once at boot. */
export function applyDesignScale(): void {
  const update = () => {
    const scale = Math.min(
      window.innerWidth / DESIGN_WIDTH,
      window.innerHeight / DESIGN_HEIGHT,
    );
    document.documentElement.style.setProperty("--s", scale.toFixed(6));
  };
  update();
  window.addEventListener("resize", update);
}
