/**
 * Temporary local implementation of GameResultRepository backed by
 * localStorage. Replace with a backend-backed implementation later.
 */
import type { GameSessionResult } from "../domain/gameResult";
import type { GameResultRepository } from "./resultRepository";

const STORAGE_KEY = "smartis-game.results.v1";

function isGameSessionResult(value: unknown): value is GameSessionResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === "string" &&
    typeof v.mobile === "string" &&
    typeof v.sectorId === "string" &&
    typeof v.sectorName === "string" &&
    typeof v.gameId === "string" &&
    typeof v.score === "number" &&
    typeof v.winAmount === "number" &&
    typeof v.playedAt === "string"
  );
}

/** Reads all stored results; corrupt storage degrades to an empty list. */
function loadAll(): GameSessionResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGameSessionResult);
  } catch {
    return [];
  }
}

export const localResultRepository: GameResultRepository = {
  async save(result) {
    const results = loadAll();
    results.push(result);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  },
  async getResults() {
    return loadAll();
  },
};
