import { useState } from "react";
import { useAppSession } from "../app/AppSession";
import { VirtualNumericKeyboard } from "../components/VirtualNumericKeyboard";
import {
  formatMobileDigits,
  isValidMobileDigits,
  makeUserId,
  toCanonicalMobile,
} from "../domain/user";
import type { User } from "../domain/user";
import { resultRepository } from "../services";

const MOBILE_ERROR = "لطفا یک شماره معتبر وارد کنید";
const ALREADY_PLAYED_MESSAGE = "شما قبلاً در این مسابقه شرکت کرده‌اید.";

/**
 * Registration: the player enters only their mobile number through the
 * on-screen numeric keyboard (the field is not a real <input>, so the
 * browser/OS keyboard never appears). The mobile number is the identity
 * for the whole session — category, game, and leaderboard.
 */
export function RegistrationPage() {
  const { register } = useAppSession();
  const [mobileDigits, setMobileDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const appendDigit = (digit: string) => {
    if (mobileDigits.length >= 10) return; // exactly 10 digits, no more
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
    const canonical = toCanonicalMobile(mobileDigits);
    setChecking(true);
    try {
      // A mobile that already has a stored result means the player has
      // already finished the game (won or used up their tries) — block a
      // second participation.
      const results = await resultRepository.getResults();
      if (results.some((result) => result.mobile === canonical)) {
        setError(ALREADY_PLAYED_MESSAGE);
        return;
      }
      const user: User = { id: makeUserId(), mobile: canonical };
      register(user);
    } catch {
      // The check must never lock the kiosk out — fail open.
      const user: User = { id: makeUserId(), mobile: canonical };
      register(user);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="page page--registration">
      <header className="registration__header">
        <h1 className="page__title">خوش آمدید</h1>
        <p className="registration__subtitle">
          شماره موبایل خود را وارد کنید
        </p>
      </header>

      <div className="registration__form">
        <div className={`field field--ltr field--active${error ? " field--error" : ""}`}>
          <span className="field__label">شماره موبایل</span>
          <div
            className="field__control"
            role="textbox"
            aria-label={`شماره موبایل${mobileDigits ? `: ${formatMobileDigits(mobileDigits)}` : ""}`}
          >
            <span className="field__prefix" aria-hidden="true">
              +98
            </span>
            {mobileDigits ? (
              <span className="field__value">{formatMobileDigits(mobileDigits)}</span>
            ) : (
              <span className="field__placeholder">912 123 4567</span>
            )}
            {mobileDigits.length < 10 && (
              <span className="field__caret" aria-hidden="true" />
            )}
          </div>
          {error && (
            <span className="field__error" role="alert">
              {error}
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void handleSubmit()}
          disabled={checking}
        >
          ورود
        </button>
      </div>

      <div className="keyboard-dock">
        <VirtualNumericKeyboard
          onDigit={appendDigit}
          onBackspace={backspace}
          onConfirm={handleSubmit}
        />
      </div>
    </div>
  );
}
