/**
 * Leaderboard building — pure, deterministic, independent of any game.
 */
import type { GameSessionResult, LeaderboardEntry } from "../domain/gameResult";

/**
 * Builds leaderboard entries from stored results:
 *  1. keep only each user's best score,
 *  2. sort by score descending,
 *  3. break ties by the earlier play first, then by user id,
 *  4. assign sequential ranks.
 */
export function buildLeaderboard(results: GameSessionResult[]): LeaderboardEntry[] {
  const bestByUser = new Map<string, GameSessionResult>();
  for (const result of results) {
    const existing = bestByUser.get(result.userId);
    if (!existing || result.score > existing.score) {
      bestByUser.set(result.userId, result);
    }
  }

  const sorted = [...bestByUser.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.playedAt !== b.playedAt) return a.playedAt < b.playedAt ? -1 : 1;
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });

  return sorted.map((result, index) => ({
    rank: index + 1,
    userId: result.userId,
    mobile: result.mobile,
    score: result.score,
  }));
}
