/**
 * Persistence boundary for game session results.
 *
 * The UI depends only on this interface — the concrete implementation can be
 * swapped for a backend API without touching pages or games.
 */
import type { GameSessionResult } from "../domain/gameResult";

export interface GameResultRepository {
  save(result: GameSessionResult): Promise<void>;
  getResults(): Promise<GameSessionResult[]>;
}
