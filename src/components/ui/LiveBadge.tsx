/** The «زنده» live pill shown in the leaderboard panel header. */
export function LiveBadge() {
  return (
    <span className="live-badge">
      <span className="live-badge__label">زنده</span>
      <span className="live-badge__dot" aria-hidden="true" />
    </span>
  );
}
