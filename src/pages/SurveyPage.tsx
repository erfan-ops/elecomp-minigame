import { useState } from "react";
import { useAppSession } from "../app/AppSession";
import { ChoiceGrid } from "../components/ui/ChoiceGrid";
import { FloatingDecorations } from "../components/ui/FloatingDecorations";
import { GameHeader } from "../components/ui/GameHeader";
import { NavButtons } from "../components/ui/NavButtons";
import { PageShell } from "../components/ui/PageShell";
import { JOURNEY_STEPS, StepTracker } from "../components/ui/StepTracker";
import type { SurveyAnswers } from "../domain/survey";

/**
 * Answer ranges → the stored `employeeCount` (upper bound of each range;
 * «بیش از 300 نفر» stores 301). Ranges replace the previously typed count
 * so the whole survey works with one tap per question.
 */
const COUNT_OPTIONS = [
  "1 تا 10 نفر",
  "11 تا 50 نفر",
  "51 تا 300 نفر",
  "بیش از 300 نفر",
] as const;

const COUNT_TO_EMPLOYEES: Record<(typeof COUNT_OPTIONS)[number], number> = {
  "1 تا 10 نفر": 10,
  "11 تا 50 نفر": 50,
  "51 تا 300 نفر": 300,
  "بیش از 300 نفر": 301,
};

const BENEFITS_OPTIONS = ["بله", "خیر"] as const;

const COUNT_QUESTION = "تعداد تقریبی افرادی که در سازمان شما مشغول به کار هستند؟";
const BENEFITS_QUESTION = "آیا سازمان شما خدمات رفاهی به کارکنان ارائه می‌دهد؟";
const NOT_EMPLOYED_LABEL = "در سازمان یا شرکتی کار نمی‌کنم";

/**
 * Page 2 — the organization survey (redesigned). Two local steps:
 *  1. تعداد افراد سازمان — four range cards, mapped to a representative count
 *  2. آیا خدمات رفاهی ارائه می‌دهد؟ — بله / خیر
 * «در سازمان یا شرکتی کار نمی‌کنم» skips both questions entirely
 * (stores { employeeCount: 0, hasBenefits: false }).
 * بازگشت on step 1 returns to registration via startNewUser (documented
 * session reset); on step 2 it returns to step 1. ادامه stays disabled
 * until the current step is answerable (spec §13).
 */
export function SurveyPage() {
  const { completeSurvey, startNewUser } = useAppSession();
  const [step, setStep] = useState<1 | 2>(1);
  const [countChoice, setCountChoice] = useState<
    (typeof COUNT_OPTIONS)[number] | null
  >(null);
  const [hasBenefits, setHasBenefits] = useState<boolean | null>(null);
  /** Non-working users can skip both questions entirely. */
  const [notEmployed, setNotEmployed] = useState(false);

  const chooseCount = (option: (typeof COUNT_OPTIONS)[number]) => {
    setCountChoice(option);
    setNotEmployed(false);
  };

  const toggleNotEmployed = () => {
    const next = !notEmployed;
    setNotEmployed(next);
    if (next) setCountChoice(null);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    // Step 1 بازگشت: back to the previous page (registration) with a clean
    // session — the same reset the kiosk performs for every new user.
    startNewUser();
  };

  const handleContinue = () => {
    if (step === 1) {
      // Skipped survey: record the non-working defaults and move on.
      if (notEmployed) {
        completeSurvey({ employeeCount: 0, hasBenefits: false });
        return;
      }
      if (countChoice === null) return;
      setStep(2);
      return;
    }
    if (hasBenefits === null || countChoice === null) return;
    const answers: SurveyAnswers = {
      employeeCount: COUNT_TO_EMPLOYEES[countChoice],
      hasBenefits,
    };
    completeSurvey(answers);
  };

  const continueDisabled =
    step === 1 ? !notEmployed && countChoice === null : hasBenefits === null;

  const benefitsSelected = hasBenefits === null ? null : hasBenefits ? "بله" : "خیر";

  return (
    <PageShell variant="survey" logo={<GameHeader />} decorations={<FloatingDecorations />}>
      <StepTracker steps={JOURNEY_STEPS} currentIndex={step} />

      <div className="survey-step">
        <span className="survey-step__kicker">
          {step === 1 ? "سوال اول" : "سوال دوم"}
        </span>
        <h1 className="survey-step__question">
          {step === 1 ? COUNT_QUESTION : BENEFITS_QUESTION}
        </h1>

        {step === 1 ? (
          <>
            <ChoiceGrid
              options={COUNT_OPTIONS}
              selected={countChoice}
              onSelect={chooseCount}
              disabled={notEmployed}
            />
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
              <span className="survey-checkbox__label">{NOT_EMPLOYED_LABEL}</span>
            </button>
          </>
        ) : (
          <ChoiceGrid
            options={BENEFITS_OPTIONS}
            selected={benefitsSelected}
            onSelect={(option) => setHasBenefits(option === "بله")}
          />
        )}

        <NavButtons
          onBack={handleBack}
          onContinue={handleContinue}
          continueDisabled={continueDisabled}
        />
      </div>
    </PageShell>
  );
}
