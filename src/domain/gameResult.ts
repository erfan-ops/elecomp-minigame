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
  /** Canonical mobile number — the player's identity. */
  mobile: string;

  /** Survey answers, collected between registration and category selection. */
  employeeCount: number;
  hasBenefits: boolean;

  /** 1-based attempt number — how many games this user has played (1..MAX_GAME_ATTEMPTS). */
  attempt: number;

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
  /** Canonical mobile number, displayed as the player's identity. */
  mobile: string;
  score: number;
}
