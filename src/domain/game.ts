/**
 * Domain: the game contract.
 *
 * A game is a self-contained React component that receives exactly the
 * information it needs to play (`GameContext`) and reports exactly what
 * happened (`GameResult`). It must not know anything about registration,
 * categories, navigation, storage, billing, or the leaderboard.
 */
import type { Category } from "./category";

export interface GameContext {
  userId: string;
  /** Canonical mobile number, e.g. "+989121234567" — the player's identity. */
  mobile: string;
  /** The sector/category the player is playing for (id + name, for billing). */
  sector: Category;
}

export interface GameResult {
  /** Generic score used for ranking (higher is better). */
  score: number;
  /** Prize amount in configured currency units. */
  winAmount: number;
  /** Optional game-specific details (target, distance, …). */
  metadata?: Record<string, unknown>;
}

export interface GameProps {
  context: GameContext;
  /** Called exactly once when the game finishes. */
  onComplete: (result: GameResult) => void;
  /** Called when the user wants to leave the game. */
  onExit: () => void;
}
