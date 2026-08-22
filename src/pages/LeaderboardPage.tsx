import { useCallback, useEffect, useState } from "react";
import { useAppSession } from "../app/AppSession";
import type { LeaderboardEntry } from "../domain/gameResult";
import { formatMaskedMobile } from "../domain/user";
import { buildLeaderboard, resultRepository } from "../services";
import { formatPersianNumber, toPersianDigits } from "../utils/persian";

type LoadState = "loading" | "loaded" | "error";

const RANK_TIERS = { 1: "gold", 2: "silver", 3: "bronze" } as const;

/**
 * Leaderboard — generated from stored game results (never hard-coded rows).
 * Top three ranks get distinct metallic styling.
 */
export function LeaderboardPage() {
  const session = useAppSession();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      const results = await resultRepository.getResults();
      setEntries(buildLeaderboard(results));
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page page--leaderboard">
      <h1 className="page__title">جدول برترین‌ها</h1>

      <div className="leaderboard">
        {loadState === "loading" && (
          <p className="leaderboard__status">در حال بارگذاری…</p>
        )}

        {loadState === "error" && (
          <div className="leaderboard__status leaderboard__status--error" role="alert">
            <p>خطا در دریافت نتایج.</p>
            <button type="button" className="btn btn--ghost" onClick={() => void load()}>
              تلاش مجدد
            </button>
          </div>
        )}

        {loadState === "loaded" && entries.length === 0 && (
          <p className="leaderboard__status">هنوز نتیجه‌ای ثبت نشده است.</p>
        )}

        {loadState === "loaded" && entries.length > 0 && (
          <table className="leaderboard__table">
            <thead>
              <tr>
                <th className="leaderboard__col-rank">رتبه</th>
                <th>شماره موبایل</th>
                <th className="leaderboard__col-score">جایزه</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const tier = RANK_TIERS[entry.rank as keyof typeof RANK_TIERS] ?? null;
                const rowClass = [
                  "leaderboard-row",
                  tier ? `leaderboard-row--${tier}` : "",
                  // isMe ? "leaderboard-row--me" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <tr key={entry.userId} className={rowClass}>
                    <td>
                      <span className={`rank-badge${tier ? ` rank-badge--${tier}` : ""}`}>
                        {toPersianDigits(entry.rank)}
                      </span>
                    </td>
                    <td className="leaderboard__mobile">
                      {formatMaskedMobile(entry.mobile)}
                      {/* {isMe && (
                        <span className="leaderboard__me" aria-label="شما">
                          شما
                        </span>
                      )} */}
                    </td>
                    <td className="leaderboard__score">{formatPersianNumber(entry.score)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="page__actions">
        <button type="button" className="btn btn--primary" onClick={session.startNewUser}>
          کاربر جدید
        </button>
      </div>
    </div>
  );
}
