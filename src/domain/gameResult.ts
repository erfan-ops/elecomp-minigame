/**
 * Domain: persisted session results and leaderboard entries.
 *
 * `GameSessionResult` is the complete record the outer application builds by
 * combining the game's `GameResult` with the user, the sector, and the game
 * identity. It carries everything needed to display the leaderboard and,
 * later, to bill the appropriate sector.
 */
export interface GameSessionResult {
  userId: string;
  mobile: string;
  firstName: string;
  lastName: string;

  sectorId: string;
  sectorName: string;

  gameId: string;

  score: number;
  winAmount: number;

  /** ISO timestamp of when the game finished. */
  playedAt: string;

  /** Game-specific details carried over from GameResult. */
  metadata?: Record<string, unknown>;
}

/** One row of the leaderboard, with rank computed after sorting. */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  score: number;
}
