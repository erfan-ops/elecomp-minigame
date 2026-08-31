/**
 * Cumulative game stats for the page-1 stats panel — pure, deterministic,
 * independent of any game. Built from the same stored results as the
 * leaderboard.
 */
import type { GameSessionResult } from "../domain/gameResult";

export interface GameStats {
  /** Sum of every stored win amount — the total prize money paid out (تومان). */
  totalPrize: number;
  /** Distinct users with at least one stored result. */
  players: number;
  /**
   * Distinct winning users per exact-match count, index 0 = 1 correct digit,
   * index 2 = 3 correct digits. A user counts once per bucket; a win ends
   * the retry chain, so no user lands in two buckets.
   */
  winnersByDigits: readonly [number, number, number];
}

export const EMPTY_GAME_STATS: GameStats = {
  totalPrize: 0,
  players: 0,
  winnersByDigits: [0, 0, 0],
};

/**
 * A user is a "winner with N correct digits" when any of their results won
 * money AND reports `metadata.correctDigits === N` (the number-wheel game
 * stores it there). Results without that metadata — other games, or future
 * metadata changes — simply never enter a bucket.
 */
export function buildGameStats(results: GameSessionResult[]): GameStats {
  const players = new Set<string>();
  const winners = [new Set<string>(), new Set<string>(), new Set<string>()];
  let totalPrize = 0;

  for (const result of results) {
    players.add(result.userId);
    totalPrize += result.winAmount;

    const correctDigits = result.metadata?.correctDigits;
    if (
      result.winAmount > 0 &&
      typeof correctDigits === "number" &&
      correctDigits >= 1 &&
      correctDigits <= 3
    ) {
      winners[correctDigits - 1].add(result.userId);
    }
  }

  return {
    totalPrize,
    players: players.size,
    winnersByDigits: [winners[0].size, winners[1].size, winners[2].size],
  };
}
