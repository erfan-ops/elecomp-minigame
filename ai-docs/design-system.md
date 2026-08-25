# DOC_ID: AI-DESIGN_SYSTEM
# SCOPE: The redesigned visual language — design canvas, scaling mechanism, tokens, shared components, page-1 and page-2 compositions, deviations, and how to restyle pages 3–5
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - src/app/designScale.ts
# - src/styles/design-tokens.css
# - src/styles/design-system.css
# - src/components/ui/PageShell.tsx
# - src/components/ui/StepTracker.tsx
# - src/components/ui/GradientText.tsx
# - src/components/ui/LiveBadge.tsx
# - src/components/ui/PhoneDisplay.tsx
# - src/components/ui/Keypad.tsx
# - src/components/ui/LeaderboardPanel.tsx
# - src/components/ui/GameHeader.tsx
# - src/components/ui/FloatingDecorations.tsx
# - src/components/ui/ChoiceGrid.tsx
# - src/components/ui/NavButtons.tsx
# - src/pages/RegistrationPage.tsx
# - src/pages/SurveyPage.tsx
# - src/domain/user.ts
# - public/Container.svg
# - public/fonts/IranYekanXVF/Farsi numerals/ (IRANYekanXFaNum weights 400–900)

## Design Canvas And Scaling Mechanism

The redesigned UI is composed against a fixed **1080×1800** design canvas. The final device
resolution is unknown, so nothing in the new system hardcodes the canvas:

- `src/app/designScale.ts` exports `DESIGN_WIDTH = 1080`, `DESIGN_HEIGHT = 1800`, and
  `applyDesignScale()`, which is called once in `src/main.tsx`. It sets the CSS variable `--s` on
  `<html>` to `min(viewportWidth/DESIGN_WIDTH, viewportHeight/DESIGN_HEIGHT)` and keeps it in sync
  on `resize`.
- `src/styles/design-tokens.css` sets `html { font-size: calc(var(--s) * 16px) }`. One `rem`
  therefore equals **16 design pixels × --s**, and every fixed dimension in the design system is
  expressed in rem. Sizes marked "content-dependent" in the spec use intrinsic sizing
  (`width: auto`, flex, `max-width`).

**To change the design canvas:** edit only `DESIGN_WIDTH` / `DESIGN_HEIGHT` in
`src/app/designScale.ts`; the whole redesigned UI refits. Verified at 1080×1800 (scale 1.0),
800×1280 (scale 0.711), and 1440×2560 (scale 1.333) — measured sizes track the scale exactly.

The pre-existing pages (category, game, leaderboard) do not use rem, so the scaled root font-size
does not affect them; they keep their existing `clamp()/vmin` sizing until restyled. Page 2
(survey) was redesigned into this language — see the page-2 composition below.

## Design Tokens (single source of truth: `src/styles/design-tokens.css`)

All colors, gradients, shadows, radii, spacing, and typography for the new visual language are
CSS custom properties on `:root` here. Component styles in `design-system.css` consume ONLY these
tokens.

| Group | Tokens |
|---|---|
| Canvas | `--ds-bg` (rgb(7,7,20)), `--ds-glow-deep` (rgb(15,35,50)), `--ds-glow-plum` (rgb(23,20,23)), `--ds-glow-teal`, `--ds-card` |
| Glass surface | `--ds-glass-bg` (the 180deg cyan-tinted gradient), `--ds-glass-border-top`, `--ds-glass-blur` (blur(24px)) |
| Gradients | `--ds-gradient-primary` (135deg #6FE4F2→#36AEBF→#1F7D8C), `--ds-gradient-heading` (120deg text gradient), `--ds-gradient-gold` (180deg gold text gradient) |
| Shadow | `--ds-shadow-primary` (inner white highlight + 20/55/-14 teal glow) |
| Colors | `--ds-live` (#34D17A), `--ds-live-pill`, `--ds-eyebrow` (#6FE4F2), `--ds-amount-2to5` (#6FE4F2), `--ds-danger`, text opacities `--ds-text-100/55/45/40`, `--ds-placeholder` (rgb(70,70,70)) |
| Radii | `--ds-radius` (24px), `--ds-radius-sm` (16px) |
| Surfaces | `--ds-row-surface`, `--ds-row-surface-gold`, `--ds-row-gold-border`, `--ds-step-surface`, `--ds-avatar-surface`, `--ds-connector` |
| Typography | `--ds-fs-*` / `--ds-lh-*` pairs (step 14/22, small 12/18, section 19/24, heading 60/66, input 36/40, key 48/48, rank 24/32, currency 12/16) plus `--ds-ls-input` (5.4px digit spacing) |
| Page-2 glows | `--ds-glow-tl` (rgba(54,174,191,0.32)), `--ds-glow-tr` (rgba(47,214,196,0.18)), `--ds-glow-bl` (rgba(54,174,191,0.22)), `--ds-glow-br` (rgba(255,207,58,0.08)), `--ds-glow-edge` (rgba(120,210,225,0.06) top strip), `--ds-glow-deco` (emoji drop-shadow 0 8px 24px cyan) |
| Page-2 shadow/glass | `--ds-shadow-strong` (inner white highlight + 0 20px 27.5px teal glow), `--ds-glass-blur-soft` (blur(12px)) |
| Page-2 fonts | `--ds-font-body` (Vazirmatn → IRANYekanX → IRANYekanXFaNum → B Yekan → Segoe UI), `--ds-font-logo` (Orbitron → Bahnschrift → Segoe UI) |
| Page-1 FaNum faces | `--ds-font-fanum` (static `IRANYekanXFaNum`, weights 400–900) for digit runs (keypad, phone display, «وارد کنید»); `--ds-font-fanum-vf` (variable `IRANYekanXVFaNum`, weight axis 100–900) for the page-1 Persian texts (welcome block, step tracker, leaderboard panel) |
| Page-2 typography | question 48/60, choice 36/32, nav 18/28, logo 30/36, logo-sub 14/20, star 30/36, `--ds-ls-logo` (0.75px Latin wordmark spacing) |

## Shared Components (`src/components/ui/`)

| Component | Props | Notes |
|---|---|---|
| `PageShell` | `children`, `variant?: "default" \| "survey"`, `logo?: ReactNode`, `decorations?: ReactNode` | Dark canvas, blurred glow layer (`pointer-events: none`), logo `public/Container.svg` as the first element by default (379 design px wide), and the content frame (padding top 138 / inline 56 / bottom 56 design px, 84 design px gap between major sections). The `"survey"` variant swaps in the page-2 lighting (four corner radials + top-edge cyan strip, 140px blur, frame gap 32) and `logo`/`decorations` replace the header and add an atmospheric layer. |
| `StepTracker` | `steps: readonly string[]`, `currentIndex: number` | RTL (right→left) journey tracker: 36px circles with 14/22 w500 numbers + labels, 32×1 connector lines with 12px gaps both sides. Steps `<= currentIndex` get the primary gradient + shadow and white text; later steps are muted (white 40%). Variable FaNum face. |
| `GradientText` | `gradient?`, `className?`, `children` | `background-clip: text` gradient text. The gradient is passed as the per-instance CSS var `--ds-text-gradient` (defaults to the heading gradient). |
| `LiveBadge` | — | «زنده» pill: 4×12 padding, full radius, `--ds-live-pill` background, 12/18 w550 green label + 6.8px dot at 36% opacity. |
| `PhoneDisplay` | `value: string` (English digits), `placeholder?` | 468×96 glass display, padding-inline 24, content horizontally centered; both the placeholder `09---------` and the entered digits use the static `IRANYekanXFaNum` face (English digits drawn with Persian glyphs), 36/40 w700, 5.4px spacing. `role="textbox"`, no real `<input>`. |
| `Keypad` | `onDigit`, `onBackspace`, `onConfirm`, `confirmDisabled?` | 3×4 LTR grid (forced `direction: ltr`), 16px gaps, 96px glass keys, English digit labels in the static `IRANYekanXFaNum` face (Persian glyphs), order 1 2 3 / 4 5 6 / 7 8 9 / تایید 0 ⌫. «تایید» carries the primary gradient + shadow. |
| `LeaderboardPanel` | `entries: { mobile: string; amount: number }[]` | «برترینهای امروز» panel (468 wide, 24 internal gap, ~25 padding-inline, dark card, radius 24): trophy 🏆 (−2.76°) + title/subtitle on the right, `LiveBadge` on the left; 5 rows (radius 16, gap 10, padding 12×16, gap 16), content right→left: rank medal | avatar circle (44px, emoji) | masked phone (19/24 w581 white) | amount + «ت». Row 1: height 70, gold surface + gold top border, 🥇, 💰 avatar (−6°), gold gradient amount. Rows 2–5: height 68, 🥈 then plain Persian rank numbers (24/32 w400 white 40%), amounts in `#6FE4F2`. |
| `GameHeader` | — | Page-2 header: 64×64 primary-gradient star badge (radius 20, ★ 30/36 w900 white, strong glow) + LTR `LUCKY REELS` wordmark (Orbitron stack → Bahnschrift fallback, 30/36 w800, 0.75px letter-spacing, LUCKY white + REELS heading-gradient via `GradientText`) + «تجربه هیجان در غرفه» (14/20 w500 white 45%) underneath. |
| `FloatingDecorations` | — | The 8 page-2 emoji (⭐🎉🎲💎✨🎮🎁🎯) at the spec's design-px positions/sizes with slight rotations, `drop-shadow` cyan glow, `pointer-events: none`; positions are rem-based so they scale with `--s`. |
| `ChoiceGrid` | `options: readonly O[]`, `selected: O \| null`, `onSelect: (o: O) => void`, `disabled?` | 2×2 grid of 398×160 glass cards (radius 24, glass gradient, 1px cyan border, blur 12, 36/32 w600 white text). RTL flow: first option top-right, second top-left. Selected card: cyan border `rgba(111,228,242,0.65)` + primary glow + `#d6fbff` w700. `disabled` dims the grid to 35% and blocks taps (skip-checkbox state). |
| `NavButtons` | `onBack`, `onContinue`, `continueDisabled?`, `backLabel?`, `continueLabel?` | بازگشت (141×64 glass, radius 16) + ادامه (154×64 primary gradient + strong glow), 18/28 text, 24 gap, RTL row (بازگشت right). Disabled ادامه sits at 35% opacity (spec §13). |
| (page composition) | — | `welcome` (eyebrow 14/22 w600 `#6FE4F2`, heading 60/66 — white w581 part + gradient w800 part, subtitle white 55%; all in the variable FaNum face except the gradient «وارد کنید» which uses the static face) and `registration-content` (2-column grid, 32 gaps, phone panel on the RIGHT in RTL, leaderboard on the LEFT, 40 design px below the welcome block). |

`LeaderboardPanel` binds to real data: `RegistrationPage` loads `buildLeaderboard(getResults())`,
takes the top 5, and maps `{ mobile, amount: winAmount }` (the stored prize). Rows come
exclusively from stored results — when the repository has no results (or fails to load) the panel
shows a single empty-state line («هنوز نتیجه‌ای ثبت نشده است.»), never placeholder rows. The panel's
texts use the variable face (`--ds-font-fanum-vf`); the final `LeaderboardPage` uses the static
face (`--ds-font-fanum`, set on `.page--leaderboard` in `app.css`).

Mobile masking for the panel: `formatPanelMobile(canonical)` in `src/domain/user.ts` →
09-form with the 4 middle digits masked (`+989121234567` → `0912****567`), rendered as Persian
numerals by the panel.

## Page 1 Composition (top → bottom)

`PageShell` → logo → `StepTracker` (steps `["شماره موبایل","سوال 1","سوال 2","سوال 3","بازی"]`,
`currentIndex = 0`) → welcome block → content grid (phone panel right, leaderboard left).
The phone panel stacks `PhoneDisplay` (468×96), the optional error line, and the `Keypad`
(3×4 × 96px + 16px gaps ≈ 468×432), gap 20.

The journey steps are shared as `JOURNEY_STEPS`, exported from `src/components/ui/StepTracker.tsx`,
so every page's tracker shows the same five labels.

## Page 2 Composition (survey, top → bottom)

`PageShell variant="survey"` (corner glows + edge strip) + `FloatingDecorations` → `GameHeader` →
`StepTracker` (`JOURNEY_STEPS`, `currentIndex = 1` on step 1 / `= 2` on step 2) → the
`.survey-step` block (364 design px atmospheric margin): kicker «سوال اول»/«سوال دوم» (14/22 w600
`#6FE4F2`) → question (48/60 w800, `IRANYekanXFaNum` stack, max-width 768, centered, wraps to two
lines) → `ChoiceGrid` → (step 1 only) the skip pill → `NavButtons`.

Survey logic is two local steps inside `SurveyPage` (the SURVEY phase is unchanged):
step 1 = four count-range cards, step 2 = بله/خیر. The ranges map to stored counts
(`1 تا 10 نفر`→10, `11 تا 50 نفر`→50, `51 تا 300 نفر`→300, `بیش از 300 نفر`→301); skip stores
`{ employeeCount: 0, hasBenefits: false }`; بازگشت on step 1 calls `startNewUser()` (back to
registration) and on step 2 returns to step 1; ادامه is disabled until the step is answerable.

## Deviations From The Reference Spec (logged)

| # | Deviation | Reason |
|---|---|---|
| 1 | Both FaNum faces are wired in `design-tokens.css`: the static `IRANYekanXFaNum` (weights 400–900) and the variable `IRANYekanXVFaNum` (VF file, weight axis 100–900). Page 1 uses the **static** face for digit runs (keypad labels, phone display value + placeholder, «وارد کنید») and the **variable** face for the Persian texts (welcome block, step tracker, leaderboard panel). The rest of the design system uses the bundled `"B Yekan"`. `Orbitron` remains absent — the currency «ت» stack lists it first so it activates if the asset is added. | Asset availability + user font directive |
| 2 | The reference image (`public/App.png`) cannot be viewed by the implementing agent's environment; the spec text was treated as the source of truth for colors/typography and the described arrangement for hierarchy/mood. | Environment limitation |
| 3 | The `+98` prefix chip is removed from the presentation; the display placeholder is `09---------`. The stored canonical value is unchanged (`+98…`), and the validation still requires exactly 10 digits starting with `9`. | Spec's placeholder style |
| 4 | The digit cap stays at **10** (the spec's "max 11 digits" would change the validation logic; HARD RULES forbid logic changes). | HARD RULES |
| 5 | «تایید» calls the existing submit handler — including the anti-replay lookup and its fail-open path. There is no separate «ورود» button. | Spec keypad layout |
| 6 | Numbers are written as **English digits everywhere** in the design system (keypad, display, tracker, panel phones/ranks/amounts); the bundled fonts render them with Persian glyph shapes. Amounts use English grouping (`5,000,000`). | User directive |
| 7 | `letter-spacing: 5.4px` is applied to the entered digits and the placeholder only (isolated digits, not joined script), with a matching `text-indent` so the centered run sits optically centered. | Spec typography vs repo rule |
| 8 | The «زنده» pill is static decoration (no live data source exists). | No live feed in the repo |
| 9 | Rows 2–5 rank medals use 🥈 then plain numbers — matching the spec's "🥇 🥈 then numbers". | Spec |
| 10 | The panel uses avatars from a fixed 5-emoji set cycled by row index (`💰🎁🎉🍕🎧`); the reference only shows the first row's 💰. | `INFERRED` from the image description |
| 11 | Page 2: the typed count field is replaced by the Figma's four range cards. The exact count is no longer collected — each range stores a representative value (10/50/300/301, upper bound of the range). The old validation errors (`COUNT_EMPTY_ERROR` etc.) disappear with the field; the disabled ادامه is the new validation (spec §13). | Figma design vs existing behavior |
| 12 | Page 2: the design's stepper shows 3 survey questions («سوال 3») while the app collects 2 — the tracker mirrors the design's five labels; the third slot is simply never reached. | Design vs app reality |
| 13 | Page 2: the «در سازمان یا شرکتی کار نمی‌کنم» skip checkbox is not in the Figma frame but must stay (existing behavior, HARD RULES). It is rendered as a glass pill under the grid; checking it dims the grid and enables ادامه. | HARD RULES |
| 14 | Page 2: `Orbitron` is absent, so the LUCKY REELS wordmark renders in Bahnschrift (fallback). Same as deviation 1. | Asset availability |
| 15 | Page 2: option labels use English digits (`1 تا 10 نفر` … `بیش از 300 نفر`) — the spec mixed Persian and English digits; the fonts render the Persian glyphs. Same as deviation 6. | User directive |
| 16 | Page 2: بازگشت did not exist before; it now appears on both survey steps. On step 1 it performs `startNewUser()` — the documented session reset — which returns to registration with a clean slate (a mid-survey back can never restore a previous user; none is stored). | New control vs existing session model |

## Restyling Pages 3–5

Pages 3–5 (category, game, leaderboard) remain in the legacy `clamp()/vmin` language. When they
are redesigned, page 2 is the worked example:

1. Compose each page inside `PageShell` (pick the `"default"` or `"survey"` variant — or add a
   new variant) and `StepTracker` (with that page's `currentIndex`).
2. Consume ONLY tokens from `design-tokens.css`; add new tokens there, never in component CSS.
3. Fixed dimensions in rem (16 design px per rem); content-dependent sizes intrinsic.
4. Follow the BEM-ish class convention (`block__element--modifier`), Persian numerals at the
   display layer, `direction: ltr` on numeric runs, no letter-spacing on Persian text.
5. Keep container logic untouched; presentation-only changes only.
