import { formatPanelMobile } from "../../domain/user";
import { LiveBadge } from "./LiveBadge";

/** English digit grouping — the bundled font renders Persian glyph shapes. */
function formatAmount(value: number): string {
  return value.toLocaleString("en-US");
}

export interface LeaderboardPanelEntry {
  /** Mobile as entered (09…) — masked for display. */
  mobile: string;
  /** Stored win amount (تومان) of the user's best result. */
  amount: number;
}

interface LeaderboardPanelProps {
  entries: LeaderboardPanelEntry[];
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;
const AVATARS = ["💰", "💷", "💴", "🪙", "💸"] as const;

/**
 * Bob tuning — must match `leaderboard-bob` in design-system.css. Each avatar
 * starts a fraction of the period later (negative delay = mid-cycle at mount)
 * so the rows drift out of sync instead of bobbing together.
 */
const BOB_PERIOD_S = 3.2;
const BOB_STAGGER_S = BOB_PERIOD_S / AVATARS.length;

/**
 * «برترین‌های امروز» — the page-1 leaderboard panel. Rows come exclusively
 * from stored results (top 5, mobile + winAmount); when nothing has been
 * stored yet it shows a single empty-state line instead of any placeholder
 * rows.
 */
export function LeaderboardPanel({ entries }: LeaderboardPanelProps) {
  const rows = entries.slice(0, 5);
  return (
    <aside className="leaderboard-panel" aria-label="برترین‌های امروز">
      <header className="leaderboard-panel__header">
        <span className="leaderboard-panel__titles">
          <span className="leaderboard-panel__trophy" aria-hidden="true">
            🏆
          </span>
          <span className="leaderboard-panel__title-col">
            <span className="leaderboard-panel__title">برترین‌های امروز</span>
            <span className="leaderboard-panel__subtitle">بزرگ‌ترین برندگان غرفه</span>
          </span>
        </span>
        <LiveBadge />
      </header>
      <div className="leaderboard-panel__list">
        {rows.length === 0 ? (
          <p className="leaderboard-panel__empty">هنوز نتیجه‌ای ثبت نشده است.</p>
        ) : (
          rows.map((entry, index) => (
            <div
              key={`${entry.mobile}-${index}`}
              className={`leaderboard-row${index === 0 ? " leaderboard-row--first" : ""}`}
            >
              <span className="leaderboard-row__rank" aria-hidden="true">
                {index < MEDALS.length ? MEDALS[index] : index + 1}
              </span>
              <span
                className="leaderboard-row__avatar"
                aria-hidden="true"
                style={{ animationDelay: `-${index * BOB_STAGGER_S}s` }}
              >
                {AVATARS[index % AVATARS.length]}
              </span>
              <span className="leaderboard-row__phone">{formatPanelMobile(entry.mobile)}</span>
              <span className="leaderboard-row__amount">
                <span className="leaderboard-row__amount-value">{formatAmount(entry.amount)}</span>
                <span className="leaderboard-row__currency">ت</span>
              </span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
