import { useState } from "react";
import { useAppSession } from "../app/AppSession";
import { CATEGORIES } from "../config/appConfig";
import { FloatingDecorations } from "../components/ui/FloatingDecorations";
import { GameHeader } from "../components/ui/GameHeader";
import { NavButtons } from "../components/ui/NavButtons";
import { PageShell } from "../components/ui/PageShell";
import { JOURNEY_STEPS, StepTracker } from "../components/ui/StepTracker";

/** Emoji per category (Figma frame 4). */
const CATEGORY_EMOJI: Record<string, string> = {
  clothing: "👕",
  "daily-shopping": "🛍️",
  jewelry: "💍",
  travel: "✈️",
  beauty: "💄",
  sports: "🏋️",
  digital: "📱",
};

/**
 * Sponsor logos per category, from public/stores/ (the Figma's partner
 * assets). File order = visual left→right (the row renders LTR).
 */
const CATEGORY_LOGOS: Record<string, readonly string[]> = {
  "daily-shopping": [
    "3c45f916a0c2bd938cea4e0057bc17ea28ab8690.png",
    "41a095b71dd7db142230cc86d5bf146064bcfcac.png",
    "917b73a947f53ea9807ed0f391aea62d7165b881.png"],
  clothing: [
    "3296fcde6db307653218e6126d38c33581a44453.png",
    "2b27d56036e2d7f79214bf6ac29d1a7528ba9a89.png",
    "77061b06e155b93b50a9a748390bbe954e7b826b.png",
    "7a2f96bfe37a9088f63175f68636135bb091d403.png",
    "53404edd2ef260247d3fa986579885fca0cf58ef.png",
  ],
  travel: [
    "266fdf4200e4048ddd6ed916196c27b37de2db10.png",
    "1cbb6993728f9a69f807397cd90a7b1863a6ec85.png",
    "3f50cfd31ee54dfdd8fd42ed98b78330e872b229.png",
    "dd8ca6c12181e3ebbdc5770b5a7db87b81e6d207.png",
  ],
  jewelry: [
    "b24df7355833afc50c0810c276c5eb5759949163.png",
    "bbf0e44097251c8cf5973685cb51efc4cf1ab4ff.png",
    "delaram-logo 1.svg"
  ],
  sports: [
    "7a2f96bfe37a9088f63175f68636135bb091d403.png",
    "824d6312000794a78c8d650ea054c9a01d42453c.png",
    "f5d4b6c22092a3e7c66e17ebaba31a740bbe031e.png"
  ],
  beauty: [
    "f042732aed451bfd3b393fb4a644e5c3ec14a021.png",
    "a56117fb085c893509199af3b0857439b6f59f99.png",
    "75cccde6e373961976dd525e4a67389597a8296b.png",
  ],
  digital: [
    "66598f8f8eb2e6802890bd438acfae09b9b3413f.png",
    "logo-mo7-1 1.svg"
  ],
};

/**
 * Sector/category selection (redesigned, Figma frame 4) — config-driven
 * list (src/config/appConfig.ts) with glass cards: emoji, name, and the
 * category's sponsor logos. Exactly one category must be chosen.
 * Selection state is unchanged: `selectedId` local state, aria-pressed,
 * and the شروع بازی button enables only when a category is selected.
 * بازگشت performs the documented session reset (`startNewUser`), the same
 * back transition the survey's first step uses.
 */
export function CategorySelectionPage() {
  const { selectCategory, startNewUser } = useAppSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = CATEGORIES.find((category) => category.id === selectedId) ?? null;

  const handleStart = () => {
    if (selected) selectCategory(selected);
  };

  return (
    <PageShell variant="survey" logo={<GameHeader />} decorations={<FloatingDecorations />}>
      <StepTracker steps={JOURNEY_STEPS} currentIndex={3} />

      <div className="category-screen">
        <span className="category-screen__kicker">سوال سوم</span>
        <h1 className="category-screen__heading">
          تمایل دارید جایزه خود را از کدام دسته‌بندی دریافت کنید؟
        </h1>
        <p className="category-screen__subtitle">فقط یک گزینه قابل انتخاب است</p>

        <div className="category-grid" role="group" aria-label="انتخاب دسته‌بندی">
          {CATEGORIES.map((category, index) => (
            <button
              key={category.id}
              type="button"
              className={`category-card${category.id === selectedId ? " category-card--selected" : ""}${index === CATEGORIES.length - 1 ? " category-card--wide" : ""}`}
              onClick={() => setSelectedId(category.id)}
              aria-pressed={category.id === selectedId}
              aria-label={`انتخاب دسته‌بندی ${category.name}`}
            >
              <span className="category-card__emoji" aria-hidden="true">
                {CATEGORY_EMOJI[category.id]}
              </span>
              <span className="category-card__name">{category.name}</span>
              {CATEGORY_LOGOS[category.id]?.length ? (
                <span className="category-card__logos" aria-hidden="true">
                  {CATEGORY_LOGOS[category.id].map((file) => (
                    <img
                      key={file}
                      className="category-card__logo"
                      src={`/stores/${encodeURIComponent(file)}`}
                      alt=""
                    />
                  ))}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <NavButtons
          className="nav-buttons--category"
          onBack={startNewUser}
          onContinue={handleStart}
          continueDisabled={!selected}
          continueLabel="شروع بازی"
        />
      </div>
    </PageShell>
  );
}
