import { useState } from "react";
import { useAppSession } from "../app/AppSession";
import { CATEGORIES } from "../config/appConfig";

/**
 * Sector/category selection — large touch cards, config-driven list
 * (src/config/appConfig.ts). Exactly one category must be chosen.
 */
export function CategorySelectionPage() {
  const { selectCategory } = useAppSession();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = CATEGORIES.find((category) => category.id === selectedId) ?? null;

  return (
    <div className="page page--category">
      <h1 className="page__title">تمایل دارید جایزه خود را از کدام دسته‌بندی دریافت کنید؟</h1>
      <p>فقط یک گزینه قابل انتخاب است</p>

      <div className="category-grid">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`category-card${category.id === selectedId ? " category-card--selected" : ""}`}
            onClick={() => setSelectedId(category.id)}
            aria-pressed={category.id === selectedId}
            aria-label={`انتخاب دسته‌بندی ${category.name}`}
          >
            <span className="category-card__name">{category.name}</span>
            <span className="category-card__check" aria-hidden="true">
              ✓
            </span>
          </button>
        ))}
      </div>

      <div className="page__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!selected}
          onClick={() => {
            if (selected) selectCategory(selected);
          }}
        >
          شروع
        </button>
      </div>
    </div>
  );
}
