/**
 * Prize-budget tracking service (kiosk-global, persisted in localStorage).
 *
 * The budget value itself is NOT stored here — it is passed in by the caller
 * (GamePage, from the active game's config), so the config constant stays the
 * single source of truth and retuning it takes effect immediately. Only the
 * consumed amount is persisted, tolerantly: corrupt storage degrades to zero.
 *
 * The game reads the difficulty-relevant `consumedRatio` through
 * `GameContext.budgetConsumedRatio`; pages never see this service unless they
 * need to record a payout.
 */
const STORAGE_KEY = "smartis-game.budget.v1";

export interface BudgetState {
  /** Organizer prize pool, in currency units (from the game config). */
  budget: number;
  /** Total prizes awarded so far, in currency units. */
  consumed: number;
  /** budget − consumed, clamped at 0. */
  remaining: number;
  /** consumed / budget, clamped to 0..1 — what the game difficulty reads. */
  consumedRatio: number;
}

/** Reads the persisted consumed amount; corrupt or absent storage means zero. */
function loadConsumed(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return 0;
    const consumed = (parsed as Record<string, unknown>).consumed;
    return typeof consumed === "number" && Number.isFinite(consumed) && consumed >= 0
      ? consumed
      : 0;
  } catch {
    return 0;
  }
}

/** Current budget state derived from the persisted consumed amount. */
export function getBudgetState(budget: number): BudgetState {
  const consumed = loadConsumed();
  return {
    budget,
    consumed,
    remaining: Math.max(0, budget - consumed),
    consumedRatio: Math.min(1, Math.max(0, consumed / budget)),
  };
}

/**
 * Records a paid prize against the budget. Non-positive amounts are ignored.
 * Storage failures degrade to the in-memory state — a broken accounting write
 * must never crash the result screen.
 */
export function recordPrize(winAmount: number, budget: number): BudgetState {
  const current = getBudgetState(budget);
  if (winAmount <= 0) return current;
  const consumed = current.consumed + winAmount;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ consumed }));
  } catch {
    // fall through — report the in-memory state anyway
  }
  return {
    budget,
    consumed,
    remaining: Math.max(0, budget - consumed),
    consumedRatio: Math.min(1, Math.max(0, consumed / budget)),
  };
}
