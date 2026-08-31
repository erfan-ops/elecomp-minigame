import type { GameStats } from "../../services/stats";
import { formatPersianNumber } from "../../utils/persian";

interface StatsPanelProps {
  stats: GameStats;
}

const WINNER_LABELS = ["برنده ۱ رقم", "برنده ۲ رقم", "برنده ۳ رقم"] as const;
const WINNER_DIGITS = ["۱", "۲", "۳"] as const;

interface StatTile {
  badge: string;
  label: string;
  value: string;
  unit?: string;
  /** The money total wears the gold gradient like the leaderboard's first row. */
  gold: boolean;
  /** Digit badges get the primary gradient circle; emoji badges a subtle one. */
  digit: boolean;
}

/**
 * «آمار مسابقه» — the page-1 cumulative stats panel. Shows the total prize
 * money paid out, how many distinct users played, and how many won with
 * exactly 1 / 2 / 3 correct digits. Values come exclusively from stored
 * results (the same source as the leaderboard panel); a fresh kiosk shows
 * zeros.
 */
export function StatsPanel({ stats }: StatsPanelProps) {
  const tiles: StatTile[] = [
    {
      badge: "💰",
      label: "جایزه پرداختی",
      value: formatPersianNumber(stats.totalPrize),
      unit: "تومان",
      gold: true,
      digit: false,
    },
    {
      badge: "👥",
      label: "شرکت‌کنندگان",
      value: formatPersianNumber(stats.players),
      gold: false,
      digit: false,
    },
    ...stats.winnersByDigits.map((count, index) => ({
      badge: WINNER_DIGITS[index],
      label: WINNER_LABELS[index],
      value: formatPersianNumber(count),
      gold: false,
      digit: true,
    })),
  ];

  return (
    <section className="stats-panel" aria-label="آمار مسابقه">
      <header className="stats-panel__header">
        <span className="stats-panel__icon" aria-hidden="true">
          📊
        </span>
        <span className="stats-panel__title-col">
          <span className="stats-panel__title">آمار مسابقه</span>
          <span className="stats-panel__subtitle">برندگان بر اساس تعداد رقم درست</span>
        </span>
      </header>
      <div className="stats-panel__grid">
        {tiles.map((tile) => (
          <div key={tile.label} className="stats-panel__tile">
            <span
              className={`stats-panel__badge stats-panel__badge--${tile.digit ? "digit" : "emoji"}`}
              aria-hidden="true"
            >
              {tile.badge}
            </span>
            <span className={`stats-panel__value${tile.gold ? " stats-panel__value--gold" : ""}`}>
              {tile.value}
            </span>
            {tile.unit && <span className="stats-panel__unit">{tile.unit}</span>}
            <span className="stats-panel__label">{tile.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
