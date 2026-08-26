import { GradientText } from "./GradientText";

/**
 * The shared page header (every page): a gradient star badge with a strong
 * cyan glow plus the LTR "LUCKY REELS" wordmark (Orbitron stack — falls
 * back to Bahnschrift while Orbitron is absent) and the Persian tagline.
 */
export function GameHeader() {
  return (
    <header className="game-header">
      <span className="game-header__badge" aria-hidden="true">
        ★
      </span>
      <span className="game-header__text">
        <span className="game-header__logo" dir="ltr">
          <span className="game-header__logo-white">LUCKY</span>
          <GradientText className="game-header__logo-gradient">REELS</GradientText>
        </span>
        <span className="game-header__subtitle">تجربه هیجان در غرفه</span>
      </span>
    </header>
  );
}
