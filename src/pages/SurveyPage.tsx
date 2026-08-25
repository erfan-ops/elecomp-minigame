import { useState } from "react";
import { useAppSession } from "../app/AppSession";
import { VirtualNumericKeyboard } from "../components/VirtualNumericKeyboard";
import type { SurveyAnswers } from "../domain/survey";

const MAX_COUNT_DIGITS = 6;

const COUNT_EMPTY_ERROR = "لطفاً تعداد افراد سازمان را وارد کنید.";
const COUNT_ZERO_ERROR = "تعداد افراد باید بیشتر از صفر باشد.";
const BENEFITS_ERROR = "لطفاً یکی از گزینه‌ها را انتخاب کنید.";

/**
 * Organization survey between registration and category selection:
 *  1. تعداد افراد سازمان (integer, entered through the numeric keyboard)
 *  2. آیا رفاهیات دریافت می‌نمایید (بله / خیر)
 * The answers are stored with the session and persisted with every result.
 */
export function SurveyPage() {
  const { completeSurvey } = useAppSession();
  // The count field is focused on arrival so the player can type immediately.
  const [countFocused, setCountFocused] = useState(true);
  const [countDigits, setCountDigits] = useState("");
  const [hasBenefits, setHasBenefits] = useState<boolean | null>(null);
  const [countError, setCountError] = useState<string | null>(null);
  const [benefitsError, setBenefitsError] = useState<string | null>(null);
  /** Non-working users can skip both questions entirely. */
  const [notEmployed, setNotEmployed] = useState(false);

  const count = countDigits === "" ? null : parseInt(countDigits, 10);

  const appendDigit = (digit: string) => {
    if (countDigits.length >= MAX_COUNT_DIGITS) return;
    setCountDigits(countDigits + digit);
    setCountError(null);
  };

  const backspace = () => {
    setCountDigits(countDigits.slice(0, -1));
    setCountError(null);
  };

  const chooseBenefits = (value: boolean) => {
    setHasBenefits(value);
    setBenefitsError(null);
    setCountFocused(false); // done typing — hide the keyboard
  };

  const toggleNotEmployed = () => {
    const next = !notEmployed;
    setNotEmployed(next);
    setCountFocused(false); // the keyboard is not needed while skipping
    setCountError(null);
    setBenefitsError(null);
  };

  const handleSubmit = () => {
    // Skipped survey: record the non-working defaults and move on.
    if (notEmployed) {
      completeSurvey({ employeeCount: 0, hasBenefits: false });
      return;
    }
    let valid = true;
    if (countDigits === "") {
      setCountError(COUNT_EMPTY_ERROR);
      valid = false;
    } else if (count === 0) {
      setCountError(COUNT_ZERO_ERROR);
      valid = false;
    }
    if (hasBenefits === null) {
      setBenefitsError(BENEFITS_ERROR);
      valid = false;
    }
    if (!valid || count === null || hasBenefits === null) return;
    const answers: SurveyAnswers = { employeeCount: count, hasBenefits };
    completeSurvey(answers);
  };

  return (
    <div className="page page--survey">
      <h1 className="page__title">نظرسنجی</h1>

      <div className={`survey__questions${notEmployed ? " survey__questions--skipped" : ""}`}>
        <p className="survey__question">
          <span className="survey__question-number">۱.</span>
          تعداد افراد سازمانی که در آن کار می‌کنید
        </p>

        <div className={`survey__field field field--ltr${countError ? " field--error" : ""}`}>
          <div
            className="field__control"
            role="textbox"
            aria-label={`تعداد افراد سازمان${countDigits ? `: ${countDigits}` : ""}`}
            onClick={() => setCountFocused(true)}
          >
            {countDigits ? (
              <span className="field__value">{countDigits}</span>
            ) : (
              <span className="field__placeholder">123</span>
            )}
            {countFocused && <span className="field__caret" aria-hidden="true" />}
          </div>
          {countError && (
            <span className="field__error" role="alert">
              {countError}
            </span>
          )}
        </div>

        <p className="survey__question">
          <span className="survey__question-number">۲.</span>
          آیا سازمان شما خدمات رفاهی به کارکنان ارائه می‌دهد؟
        </p>

        <div className={`choice-group${benefitsError ? " choice-group--error" : ""}`}>
          <button
            type="button"
            className={`choice-button${hasBenefits === true ? " choice-button--selected" : ""}`}
            aria-pressed={hasBenefits === true}
            onClick={() => chooseBenefits(true)}
          >
            بله
            <span className="choice-button__check" aria-hidden="true">
              ✓
            </span>
          </button>
          <button
            type="button"
            className={`choice-button${hasBenefits === false ? " choice-button--selected" : ""}`}
            aria-pressed={hasBenefits === false}
            onClick={() => chooseBenefits(false)}
          >
            خیر
            <span className="choice-button__check" aria-hidden="true">
              ✓
            </span>
          </button>
        </div>
        {benefitsError && (
          <span className="field__error" role="alert">
            {benefitsError}
          </span>
        )}
      </div>

      <button
        type="button"
        className={`survey-checkbox${notEmployed ? " survey-checkbox--checked" : ""}`}
        role="checkbox"
        aria-checked={notEmployed}
        onClick={toggleNotEmployed}
      >
        <span className="survey-checkbox__box" aria-hidden="true">
          <span className="survey-checkbox__check">✓</span>
        </span>
        <span className="survey-checkbox__label">در سازمان یا شرکتی کار نمی‌کنم</span>
      </button>

      <button type="button" className="btn btn--primary" onClick={handleSubmit}>
        ادامه
      </button>

      {countFocused && !notEmployed && (
        <div className="keyboard-dock">
          <VirtualNumericKeyboard
            onDigit={appendDigit}
            onBackspace={backspace}
            onConfirm={() => setCountFocused(false)}
          />
        </div>
      )}
    </div>
  );
}
