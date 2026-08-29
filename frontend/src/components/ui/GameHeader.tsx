/**
 * The shared page header (every page): the Smartis logo on the right (RTL)
 * with the centered Persian tagline «تجربه هیجان در غرفه اسمارتیز» (Vazirmatn
 * 600, letter-spacing 0 — see `.game-header` in design-system.css).
 */
export function GameHeader() {
  return (
    <header className="game-header">
      <img
        className="game-header__logo-img"
        src="/smartis_logo.svg"
        alt="اسمارتیز"
        draggable={false}
      />
      <span className="game-header__title">تجربه هیجان در غرفه اسمارتیز</span>
    </header>
  );
}
