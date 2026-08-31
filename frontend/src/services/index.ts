/**
 * Service layer entry point.
 *
 * The application reads `resultRepository` everywhere; swapping the
 * implementation here (e.g. for a backend API) is the only change needed.
 */
import { localResultRepository } from "./localResultRepository";
import type { GameResultRepository } from "./resultRepository";

export const resultRepository: GameResultRepository = localResultRepository;

export type { GameResultRepository } from "./resultRepository";
export { buildLeaderboard } from "./leaderboard";
export { buildGameStats, EMPTY_GAME_STATS } from "./stats";
export type { GameStats } from "./stats";
export { getBudgetState, recordPrize } from "./budget";
export { exportGameResult } from "./gameExporter";
