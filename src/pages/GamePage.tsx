import { useCallback, useMemo, useRef } from "react";
import { useAppSession } from "../app/AppSession";
import { MAX_GAME_ATTEMPTS } from "../config/appConfig";
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
  const { user, category, survey, attempt } = session;
  const activeGame = getActiveGame();
  const GameComponent = activeGame.Component;
  const submittedRef = useRef(false);

  const context = useMemo<GameContext>(
    () => ({
      userId: user?.id ?? "",
      mobile: user?.mobile ?? "",
      sector: category ?? { id: "", name: "" },
      attemptsRemaining: Math.max(0, MAX_GAME_ATTEMPTS - attempt),
    }),
    [user, category, attempt],
  );

  /** Combine the game's result with the user, survey, sector, and game id, then persist. */
  const handleComplete = useCallback(
    (result: GameResult) => {
      if (!user || !category || !survey || submittedRef.current) return;
      submittedRef.current = true;
      const sessionResult: GameSessionResult = {
        userId: user.id,
        mobile: user.mobile,
        employeeCount: survey.employeeCount,
        hasBenefits: survey.hasBenefits,
        attempt,
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
    [user, category, survey, attempt, activeGame.id, session],
  );

  /** Retry is only offered after a zero-win result, below the attempt cap. */
  const canRetry =
    session.saveStatus === "saved" &&
    (session.savedResult?.winAmount ?? 0) === 0 &&
    attempt < MAX_GAME_ATTEMPTS;

  const handleRetry = () => {
    submittedRef.current = false;
    session.retry();
  };

  // Defensive: GAME is only reachable with a registered user, survey, and sector.
  if (!user || !category || !survey) return null;

  return (
    <div className="page page--game">
      <div className="game-page__topbar">
        <span className="chip chip--user">{formatMaskedMobile(user.mobile)}</span>
        <span className="chip chip--sector">{category.name}</span>
      </div>

      <div className="game-page__stage">
        {/* key: every attempt mounts a completely fresh game */}
        <GameComponent
          key={`${user.id}:${attempt}`}
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
            <>
              {canRetry && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleRetry}
                  aria-label={`تلاش دوباره، ${MAX_GAME_ATTEMPTS - attempt} تلاش باقی مانده`}
                >
                  تلاش دوباره
                </button>
              )}
              <button
                type="button"
                className={canRetry ? "btn btn--ghost" : "btn btn--primary"}
                onClick={session.goToLeaderboard}
              >
                ادامه
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
