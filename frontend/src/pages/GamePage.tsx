import { useCallback, useMemo, useRef, useState } from "react";
import { useAppSession } from "../app/AppSession";
import { MAX_GAME_ATTEMPTS } from "../config/appConfig";
import type { GameContext, GameResult } from "../domain/game";
import type { GameSessionResult } from "../domain/gameResult";
import { FloatingDecorations } from "../components/ui/FloatingDecorations";
import { GameHeader } from "../components/ui/GameHeader";
import { PageShell } from "../components/ui/PageShell";
import { JOURNEY_STEPS, StepTracker } from "../components/ui/StepTracker";
import { getActiveGame } from "../games/registry";
import { GameResultScreen } from "./GameResult";

/**
 * The game host: renders whatever game the registry currently selects and
 * adapts between the platform (users, sectors, persistence) and the game
 * contract. Once the game completes, the host swaps the game subtree for the
 * redesigned result screen (pages 6–8) — the game itself never sees this page
 * and never learns whether persistence succeeded.
 */
export function GamePage() {
  const session = useAppSession();
  const { user, category, survey, attempt } = session;
  const activeGame = getActiveGame();
  const GameComponent = activeGame.Component;
  const submittedRef = useRef(false);
  /** The completed game result, once shown (null while playing). */
  const [result, setResult] = useState<GameResult | null>(null);

  const context = useMemo<GameContext>(
    () => ({
      userId: user?.id ?? "",
      mobile: user?.mobile ?? "",
      sector: category ?? { id: "", name: "" },
      attemptsRemaining: Math.max(0, MAX_GAME_ATTEMPTS - attempt),
      attemptsTotal: MAX_GAME_ATTEMPTS,
    }),
    [user, category, attempt],
  );

  /** Combine the game's result with the user, survey, sector, and game id, then persist. */
  const handleComplete = useCallback(
    (gameResult: GameResult) => {
      if (!user || !category || !survey || submittedRef.current) return;
      submittedRef.current = true;
      setResult(gameResult);
      const sessionResult: GameSessionResult = {
        userId: user.id,
        mobile: user.mobile,
        employeeCount: survey.employeeCount,
        hasBenefits: survey.hasBenefits,
        attempt,
        sectorId: category.id,
        sectorName: category.name,
        gameId: activeGame.id,
        score: gameResult.score,
        winAmount: gameResult.winAmount,
        playedAt: new Date().toISOString(),
        metadata: gameResult.metadata,
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
    setResult(null);
    session.retry();
  };

  // Defensive: GAME is only reachable with a registered user, survey, and sector.
  if (!user || !category || !survey) return null;

  return (
    <PageShell variant="survey" logo={<GameHeader />} decorations={<FloatingDecorations />}>
      <StepTracker steps={JOURNEY_STEPS} currentIndex={4} />

      {result ? (
        <GameResultScreen
          result={result}
          attemptsRemaining={Math.max(0, MAX_GAME_ATTEMPTS - attempt)}
          saveStatus={session.saveStatus}
          retryEnabled={canRetry}
          onRetrySave={() => void session.retrySave()}
          onRetry={handleRetry}
          onExit={session.startNewUser}
          onContinue={session.goToLeaderboard}
        />
      ) : (
        // key: every attempt mounts a completely fresh game
        <GameComponent
          key={`${user.id}:${attempt}`}
          context={context}
          onComplete={handleComplete}
          onExit={session.startNewUser}
        />
      )}
    </PageShell>
  );
}
