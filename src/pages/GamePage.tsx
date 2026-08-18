import { useCallback, useMemo, useRef } from "react";
import { useAppSession } from "../app/AppSession";
import type { GameContext, GameResult } from "../domain/game";
import type { GameSessionResult } from "../domain/gameResult";
import { formatMaskedMobile } from "../domain/user";
import { getActiveGame } from "../games/registry";

/**
 * The game host: renders whatever game the registry currently selects and
 * adapts between the platform (users, sectors, persistence) and the game
 * contract. The game itself never sees this page.
 */
export function GamePage() {
  const session = useAppSession();
  const { user, category } = session;
  const activeGame = getActiveGame();
  const GameComponent = activeGame.Component;
  const submittedRef = useRef(false);

  const context = useMemo<GameContext>(
    () => ({
      userId: user?.id ?? "",
      mobile: user?.mobile ?? "",
      sector: category ?? { id: "", name: "" },
    }),
    [user, category],
  );

  /** Combine the game's result with the user, sector, and game id, then persist. */
  const handleComplete = useCallback(
    (result: GameResult) => {
      if (!user || !category || submittedRef.current) return;
      submittedRef.current = true;
      const sessionResult: GameSessionResult = {
        userId: user.id,
        mobile: user.mobile,
        sectorId: category.id,
        sectorName: category.name,
        gameId: activeGame.id,
        score: result.score,
        winAmount: result.winAmount,
        playedAt: new Date().toISOString(),
        metadata: result.metadata,
      };
      void session.submitResult(sessionResult);
    },
    [user, category, activeGame.id, session],
  );

  // Defensive: GAME is only reachable with a registered user and sector.
  if (!user || !category) return null;

  return (
    <div className="page page--game">
      <div className="game-page__topbar">
        <span className="chip chip--user">{formatMaskedMobile(user.mobile)}</span>
        <span className="chip chip--sector">{category.name}</span>
      </div>

      <div className="game-page__stage">
        {/* key: a new user always mounts a completely fresh game */}
        <GameComponent
          key={user.id}
          context={context}
          onComplete={handleComplete}
          onExit={session.startNewUser}
        />
      </div>

      {session.saveStatus !== "idle" && (
        <div className="game-page__statusbar">
          {session.saveStatus === "saving" && (
            <span className="game-page__status">در حال ثبت نتیجه…</span>
          )}
          {session.saveStatus === "error" && (
            <>
              <span className="game-page__status game-page__status--error" role="alert">
                ثبت نتیجه با خطا مواجه شد.
              </span>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void session.retrySave()}
              >
                تلاش مجدد
              </button>
              <button type="button" className="btn btn--primary" onClick={session.goToLeaderboard}>
                ادامه
              </button>
            </>
          )}
          {session.saveStatus === "saved" && (
            <button type="button" className="btn btn--primary" onClick={session.goToLeaderboard}>
              ادامه
            </button>
          )}
        </div>
      )}
    </div>
  );
}
