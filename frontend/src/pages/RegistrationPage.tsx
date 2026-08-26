import { useEffect, useState } from "react";
import { useAppSession } from "../app/AppSession";
import { FloatingDecorations } from "../components/ui/FloatingDecorations";
import { GameHeader } from "../components/ui/GameHeader";
import { GradientText } from "../components/ui/GradientText";
import { Keypad } from "../components/ui/Keypad";
import { LeaderboardPanel } from "../components/ui/LeaderboardPanel";
import type { LeaderboardPanelEntry } from "../components/ui/LeaderboardPanel";
import { PageShell } from "../components/ui/PageShell";
import { PhoneDisplay } from "../components/ui/PhoneDisplay";
import { JOURNEY_STEPS, StepTracker } from "../components/ui/StepTracker";
import { isValidMobileDigits, makeUserId } from "../domain/user";
import type { User } from "../domain/user";
import { buildLeaderboard, resultRepository } from "../services";

const MOBILE_ERROR = "لطفا یک شماره معتبر وارد کنید";
const ALREADY_PLAYED_MESSAGE = "شما قبلاً در این مسابقه شرکت کرده‌اید.";

/**
 * Page 1 — mobile number entry (redesigned).
 *
 * Container/presentation split: all interaction logic (digit cap,
 * validation, the anti-replay check with fail-open, session registration)
 * is unchanged; the redesigned presentation lives in the shared ui/
 * components and the design-system stylesheets.
 */
export function RegistrationPage() {
  const { register } = useAppSession();
  const [mobileDigits, setMobileDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [topEntries, setTopEntries] = useState<LeaderboardPanelEntry[]>([]);

  // Leaderboard panel data: top 5 by score, for social proof. Failures
  // degrade to an empty list — the panel then shows its mock rows.
  useEffect(() => {
    void (async () => {
      try {
        const results = await resultRepository.getResults();
        const entries = buildLeaderboard(results)
          .slice(0, 5)
          .map((entry) => ({ mobile: entry.mobile, amount: entry.winAmount }));
        setTopEntries(entries);
      } catch {
        setTopEntries([]);
      }
    })();
  }, []);

  const appendDigit = (digit: string) => {
    if (mobileDigits.length >= 11) return; // exactly 11 digits, no more
    setMobileDigits(mobileDigits + digit);
    setError(null);
  };

  const backspace = () => {
    setMobileDigits(mobileDigits.slice(0, -1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!isValidMobileDigits(mobileDigits)) {
      setError(MOBILE_ERROR);
      return;
    }
    setChecking(true);
    try {
      // A mobile that already has a stored result means the player has
      // already finished the game (won or used up their tries) — block a
      // second participation.
      const results = await resultRepository.getResults();
      if (results.some((result) => result.mobile === mobileDigits)) {
        setError(ALREADY_PLAYED_MESSAGE);
        return;
      }
      const user: User = { id: makeUserId(), mobile: mobileDigits };
      register(user);
    } catch {
      // The check must never lock the kiosk out — fail open.
      const user: User = { id: makeUserId(), mobile: mobileDigits };
      register(user);
    } finally {
      setChecking(false);
    }
  };

  return (
    <PageShell logo={<GameHeader />} decorations={<FloatingDecorations />}>
      <StepTracker steps={JOURNEY_STEPS} currentIndex={0} />

      <div className="welcome">
        <span className="welcome__eyebrow">خوش آمدید !</span>
        <h1 className="welcome__heading">
          شماره موبایل خود را{" "}
          <GradientText className="welcome__heading-strong">وارد کنید</GradientText>
        </h1>
        <p className="welcome__subtitle">
          برای شرکت در بازی و برنده شدن جوایز نقدی، شماره تماس خود را ثبت کنید.
        </p>
      </div>

      <div className="registration-content">
        <section className="registration-phone" aria-label="ورود با شماره موبایل">
          <PhoneDisplay value={mobileDigits} />
          {error && (
            <span className="registration-error" role="alert">
              {error}
            </span>
          )}
          <Keypad
            onDigit={appendDigit}
            onBackspace={backspace}
            onConfirm={() => void handleSubmit()}
            confirmDisabled={checking}
          />
        </section>
        <LeaderboardPanel entries={topEntries} />
      </div>
    </PageShell>
  );
}
