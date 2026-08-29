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
# - src/pages/CategorySelectionPage.tsx
# - src/domain/user.ts
# - src/domain/category.ts
# - src/config/appConfig.ts
# - public/stores/ (sponsor logos, page 4)
# - public/fonts/IranYekanXVF/Farsi numerals/ (IRANYekanXFaNum weights 400–900)

## Design Canvas And Scaling Mechanism

The UI is composed against a fixed **1080×1800** design canvas and never depends on the device
resolution:

- `src/app/designScale.ts` exports `DESIGN_WIDTH = 1080`, `DESIGN_HEIGHT = 1800`, and
  `applyDesignScale()`, which is called once in `src/main.tsx`. It sets the CSS variable `--s` on
  `<html>` to `min(viewportWidth/DESIGN_WIDTH, viewportHeight/DESIGN_HEIGHT)` and keeps it in sync
  on `resize`.
- `src/styles/design-tokens.css` sets `html { font-size: calc(var(--s) * 16px) }`. One `rem`
  therefore equals **16 design pixels × --s**, and every fixed dimension in the design system is
  expressed in rem. Sizes marked "content-dependent" in the spec use intrinsic sizing
  (`width: auto`, flex, `max-width`).
- `.page-shell` **is** the canvas: it is sized `var(--ds-canvas-w) × var(--ds-canvas-h)`
  (67.5rem × 112.5rem — tokens in `design-tokens.css` that mirror `DESIGN_WIDTH` /
  `DESIGN_HEIGHT`) with `flex-shrink: 0`. `.app` is a full-viewport flex container that centers the
  shell both horizontally and vertically, so on screens whose aspect differs from the canvas the
  content keeps the design shape and `.app`'s dark background extends into the letterboxed space.
- Everything inside the shell follows the canvas automatically: the corner glows and the floating
  decorations are `position: absolute` against `.page-shell`, so their hardcoded positions stay
  relative to the centered canvas at every scale.

**To change the design canvas:** edit `DESIGN_WIDTH` / `DESIGN_HEIGHT` in
`src/app/designScale.ts` **and** the mirror `--ds-canvas-w` / `--ds-canvas-h` tokens in
`src/styles/design-tokens.css`; the whole redesigned UI refits.

Every surface now lives in this language: registration (page 1), survey (page 2), category
(page 4), and the game page (frames 5–8) are all rem-based. The last legacy surface — the
standalone leaderboard page — was deleted on 2026-08-26; the leaderboard lives on registration as
the rem-based `LeaderboardPanel` (see below).

## Design Tokens (single source of truth: `src/styles/design-tokens.css`)

All colors, gradients, shadows, radii, spacing, and typography for the new visual language are
CSS custom properties on `:root` here. Component styles in `design-system.css` consume ONLY these
tokens.

| Group | Tokens |
|---|---|
| Canvas | `--ds-bg` (rgb(7,7,20)), `--ds-card` (rgba(9,11,20,0.62)) — the old `--ds-glow-deep/plum/teal` page-1 blobs were removed 2026-08-26 with the default shell variant |
| Glass surface | `--ds-glass-bg` (the 180deg cyan-tinted gradient), `--ds-glass-border-top`, `--ds-glass-blur` (blur(24px)) |
| Gradients | `--ds-gradient-primary` (135deg #6FE4F2→#36AEBF→#1F7D8C), `--ds-gradient-heading` (120deg text gradient), `--ds-gradient-gold` (180deg gold text gradient) |
| Shadow | `--ds-shadow-primary` (inner white highlight + 20/55/-14 teal glow) |
| Colors | `--ds-live` (#34D17A), `--ds-live-pill`, `--ds-eyebrow` (#6FE4F2), `--ds-amount-2to5` (#6FE4F2), `--ds-danger`, text opacities `--ds-text-100/55/45/40`, `--ds-placeholder` (rgb(70,70,70)) |
| Radii | `--ds-radius` (24px), `--ds-radius-sm` (16px) |
| Surfaces | `--ds-row-surface`, `--ds-row-surface-gold`, `--ds-row-gold-border`, `--ds-step-surface`, `--ds-avatar-surface`, `--ds-connector` |
| Typography | `--ds-fs-*` / `--ds-lh-*` pairs (step 14/22, small 12/18, section 19/24, heading 60/66, input 36/40, key 48/48, rank 24/32, currency 12/16) plus `--ds-ls-input` (5.4px digit spacing) |
| Game gold | `--ds-gold` (#FFCF3A), `--ds-gradient-gold-strong` (180deg #FFE790→#FFCF3A 45%→#E0A400 text gradient), `--ds-shadow-prize` (gold ring + glow) |
| Game gradients | `--ds-gradient-win-heading` (161deg #D6FBFF 7.7%→#36AEBF 45.8%→#2FD6C4 92.3%, the win heading), `--ds-gradient-reel` (180deg #141330→#0A0A1C, the reel window) |
| Game glows/shadows | `--ds-glow-active-reel` (cyan ring + 80px glow for the active reel), `--ds-shadow-stop` (cyan under-glow + halo for the stop button), `--ds-shadow-result-wrong` (red glow), `--ds-shadow-result-correct` (green glow) |
| Game typography | `--ds-fs-result-heading` 72px / `--ds-lh-result-heading` 84px, `--ds-fs-result-digit` 60px, `--ds-fs-prize-amount` 96px / `--ds-lh-prize-amount` 120px |
| Shell glows (every page) | `--ds-glow-tl` (rgba(54,174,191,0.32)), `--ds-glow-tr` (rgba(47,214,196,0.18)), `--ds-glow-bl` (rgba(54,174,191,0.22)), `--ds-glow-br` (rgba(255,207,58,0.08)), `--ds-glow-edge` (rgba(120,210,225,0.06) top strip), `--ds-glow-deco` (emoji glow — a full filter list: tight cyan `drop-shadow(0 0 16px rgba(111,228,242,0.6))` + wide teal `drop-shadow(0 8px 32px rgba(54,174,191,0.65))`, brightened 2026-08-29) |
| Page-2 shadow/glass | `--ds-shadow-strong` (inner white highlight + 0 20px 27.5px teal glow), `--ds-glass-blur-soft` (blur(12px)) |
| Page-2 fonts | `--ds-font-body` (Vazirmatn → IRANYekanX → IRANYekanXFaNum → B Yekan → Segoe UI), `--ds-font-logo` (Orbitron → Bahnschrift → Segoe UI) |
| Page-1 FaNum faces | `--ds-font-fanum` (static `IRANYekanXFaNum`, weights 400–900) for digit runs (keypad, phone display, «وارد کنید») and the page-4 card names/heading; `--ds-font-fanum-vf` (variable `IRANYekanXVFaNum`, weight axis 100–900) for the Persian texts (welcome block, step tracker, leaderboard panel, page-4 kicker/subtitle) |
| Page-2 typography | question 48/60, choice 36/32, nav 18/28, logo 30/36, logo-sub 14/20, star 30/36, `--ds-ls-logo` (0.75px Latin wordmark spacing) |
| Page-4 category | `--ds-fs-category-emoji` (60px), `--ds-fs-category-name` (24px) / `--ds-lh-category-name` (32px) |

## Shared Components (`src/components/ui/`)

| Component | Props | Notes |
|---|---|---|
| `PageShell` | `children`, `logo: ReactNode`, `decorations: ReactNode` | Dark canvas + the shared lighting on **every** page (four corner radials + top-edge cyan strip, 140px blur, `pointer-events: none`), `logo` (all pages pass `GameHeader`) as the first element, and the content frame (padding top 90 / inline 56 / bottom 56 design px, 32 design px gap between sections). `decorations` (all pages pass `FloatingDecorations`) adds the atmospheric layer. The old `"default"` variant and the `Container.svg` logo fallback were removed 2026-08-26 — page 1 uses the same shell as the rest. Since 2026-08-29 the shell also renders the **Almas credit footer** (`<footer class="page-shell__footer">`) pinned to the canvas bottom (absolute, `pointer-events: none`, z-3): `public/almas_logo.svg` (40px tall) with «کاری از شرکت داده پردازی الماس شهر» below it (18/28 w600, `rgba(255,255,255,0.45)`, same face/weight/letter-spacing as the header tagline). **Stacking (2026-08-29):** glows (auto) → decorations (z-1) → frame (z-2) → footer (z-3) — the decorations sit behind the content, so the glass panels blur them through their backdrop-filter. |
| `StepTracker` | `steps: readonly string[]`, `currentIndex: number` | RTL (right→left) journey tracker: 36px circles with 14/22 w500 numbers + labels, 32×1 connector lines with 12px gaps both sides. Steps `<= currentIndex` get the primary gradient + shadow and white text; later steps are muted (white 40%). Variable FaNum face. |
| `GradientText` | `gradient?`, `className?`, `children` | `background-clip: text` gradient text. The gradient is passed as the per-instance CSS var `--ds-text-gradient` (defaults to the heading gradient). |
| `LiveBadge` | — | «زنده» pill: 4×12 padding, full radius, `--ds-live-pill` background, 12/18 w550 green label + 6.8px dot at 36% opacity. |
| `PhoneDisplay` | `value: string` (English digits), `placeholder?` | 468×96 glass display, padding-inline 24, content horizontally centered; both the placeholder `09---------` and the entered digits use the static `IRANYekanXFaNum` face (English digits drawn with Persian glyphs), 36/40 w700, 5.4px spacing. `role="textbox"`, no real `<input>`. |
| `Keypad` | `onDigit`, `onBackspace`, `onConfirm`, `confirmDisabled?` | 3×4 LTR grid (forced `direction: ltr`), 16px gaps, 96px glass keys, English digit labels in the static `IRANYekanXFaNum` face (Persian glyphs), order 1 2 3 / 4 5 6 / 7 8 9 / تایید 0 ⌫. «تایید» carries the primary gradient + shadow. |
| `LeaderboardPanel` | `entries: { mobile: string; amount: number }[]` | «برترینهای امروز» panel (468 wide, 24 internal gap, ~25 padding-inline, dark card, radius 24, frosted glass — `backdrop-filter: blur(12px)` since 2026-08-29 so decos behind it blur through): trophy 🏆 (−2.76°) + title/subtitle on the right, `LiveBadge` on the left; 5 rows (radius 16, gap 10, padding 12×16, gap 16), content right→left: rank medal | avatar circle (44px, emoji) | masked phone (19/24 w581 white) | amount + «ت». Row 1: height 70, gold surface + gold top border, 🥇, 💰 avatar (−6°), gold gradient amount. Rows 2–5: height 68, 🥈 then plain Persian rank numbers (24/32 w400 white 40%), amounts in `#6FE4F2`. **Avatar bob (2026-08-26):** each avatar circle moves with its emoji — `leaderboard-bob` keyframes in design-system.css follow the `(1 − cos)` curve sampled at 8 segments (0 → −0.75rem → 0 per 3.2s cycle — dips below the centered rest position per the 2026-08-26 tuning; rest-start/rest-end with zero velocity), rotating clockwise with the same curve (0 → 15° at the extreme); animated on the `translate` + `rotate` properties so the first row's `transform` rotate(−6°) composes; rows are phase-offset by an inline negative `animation-delay` (`BOB_PERIOD_S`/`BOB_STAGGER_S` in the component, period ÷ 5) so they drift out of sync. Only the avatars move — the global reduced-motion rule in global.css disables this. |
| `GameHeader` | — | Page header (every page): `public/smartis_logo.svg` (72px tall, native 172×122 keeps aspect) on the **right** (RTL row, `direction: rtl`) with the centered tagline «تجربه هیجان در غرفه اسمارتیز» (30/36 w600 Vazirmatn, letter-spacing 0, white 100%). The template star-badge + LTR LUCKY REELS wordmark are gone (2026-08-29). |
| `FloatingDecorations` | — | The 8 page emoji (⭐🎉🎲💎✨🎮🎁🎯) at the spec's design-px positions/sizes with slight rotations, a two-layer `drop-shadow` cyan/teal glow (`--ds-glow-deco`, brightened 2026-08-29 — the glow follows each emoji wherever it moves), `pointer-events: none`; positions are rem-based so they scale with `--s`. The layer sits at z-index 1 — behind the content frame (z-2) since 2026-08-29, so the glass panels blur the decos. Each plays its own motion — ⭐ gentle up/down bob, 🎉 ±14° rocking sway, 🎲 3D tumble around the vertical axis (container `perspective: 24rem`), 💎 twinkle (fades to 25% while swelling 1.1×), ✨ left/right drift, 🎮 hover combo (rises + tilts ±8° + mid-cycle blink to 60%), 🎁 springy scale pop with a settling wiggle, 🎯 slow continuous spin — `deco-*` keyframes below, staggered by inline negative `animation-delay`s (0.7s per item) so they never move in sync. The animations target the individual translate/rotate/scale/opacity properties so the static inline `transform: rotate(...)` tilt still composes; the global reduced-motion rule in global.css disables them all. |
| `ChoiceGrid` | `options: readonly O[]`, `selected: O \| null`, `onSelect: (o: O) => void`, `disabled?` | 2×2 grid of 398×160 glass cards (radius 24, glass gradient, 1px cyan border, backdrop blur 12 — visible since 2026-08-29 because the decos sit behind the frame; 36/32 w600 white text). RTL flow: first option top-right, second top-left. Selected card: cyan border `rgba(111,228,242,0.65)` + primary glow + `#d6fbff` w700. `disabled` dims the grid to 35% and blocks taps (skip-checkbox state). |
| `NavButtons` | `onBack`, `onContinue`, `continueDisabled?`, `backLabel?`, `continueLabel?`, `className?` | بازگشت (141×64 glass, radius 16) + ادامه (154×64 primary gradient + strong glow), 18/28 text, 24 gap, RTL row (بازگشت right). Disabled ادامه sits at 35% opacity (spec §13). The optional `className` lands on the row for page-specific widths — the category page passes `nav-buttons--category` (138 + 16 + 189 = 343, Figma frame-4 spec). |
| (page composition) | — | `welcome` (eyebrow 14/22 w600 `#6FE4F2`, heading 60/66 — white w581 part + gradient w800 part, subtitle white 55%; all in the variable FaNum face except the gradient «وارد کنید» which uses the static face) and `registration-content` (2-column grid, 32 gaps, phone panel on the RIGHT in RTL, leaderboard on the LEFT, 40 design px below the welcome block). |

`LeaderboardPanel` binds to real data: `RegistrationPage` loads `buildLeaderboard(getResults())`,
takes the top 5, and maps `{ mobile, amount: winAmount }` (the stored prize). Rows come
exclusively from stored results — when the repository has no results (or fails to load) the panel
shows a single empty-state line («هنوز نتیجه‌ای ثبت نشده است.»), never placeholder rows. The panel's
texts use the variable face (`--ds-font-fanum-vf`) — there is no separate leaderboard page
anymore (deleted 2026-08-26); the static face (`--ds-font-fanum`) remains only for the keypad
labels, the phone display, «وارد کنید», and the page-4 card names/heading.

Mobile masking for the panel: `formatPanelMobile(mobile)` in `src/domain/user.ts` → the stored
09-form with the 4 middle digits hidden (`09108086113` → `0910****113`), rendered as Persian
numerals by the panel.

## Page 1 Composition (top → bottom)

`PageShell` (the shared shell: corner radials + edge wash, `logo={<GameHeader />}`,
`decorations={<FloatingDecorations />}`) → `StepTracker` (steps `["شماره موبایل","سوال 1","سوال 2","سوال 3","بازی"]`,
`currentIndex = 0`) → welcome block → content grid (phone panel right, leaderboard left).
The phone panel stacks `PhoneDisplay` (468×96), the optional error line, and the `Keypad`
(3×4 × 96px + 16px gaps ≈ 468×432), gap 20.

The journey steps are shared as `JOURNEY_STEPS`, exported from `src/components/ui/StepTracker.tsx`,
so every page's tracker shows the same five labels.

## Page 2 Composition (survey, top → bottom)

`PageShell` (corner glows + edge strip) + `FloatingDecorations` → `GameHeader` →
`StepTracker` (`JOURNEY_STEPS`, `currentIndex = 1` on step 1 / `= 2` on step 2) → the
`.survey-step` block (364 design px atmospheric margin): kicker «سوال اول»/«سوال دوم» (14/22 w600
`#6FE4F2`) → question (48/60 w800, `IRANYekanXFaNum` stack, max-width 768, centered, wraps to two
lines) → `ChoiceGrid` → (step 1 only) the skip pill → `NavButtons`.

Survey logic is two local steps inside `SurveyPage` (the SURVEY phase is unchanged):
step 1 = four count-range cards, step 2 = بله/خیر. The ranges map to stored counts
(`1 تا 10 نفر`→10, `11 تا 50 نفر`→50, `51 تا 300 نفر`→300, `بیش از 300 نفر`→301); skip stores
`{ employeeCount: 0, hasBenefits: false }`; بازگشت on step 1 calls `startNewUser()` (back to
registration) and on step 2 returns to step 1; ادامه is disabled until the step is answerable.

## Page 4 Composition (category, top → bottom)

`PageShell` (corner glows + edge strip) + `FloatingDecorations` → `GameHeader` →
`StepTracker` (`JOURNEY_STEPS`, `currentIndex = 3` — «سوال ۳» active, «بازی» inactive) → the
`.category-screen` block (~30px below the stepper): kicker «سوال سوم» (14/22 w600 `#6FE4F2`,
variable FaNum) → heading (48/60 w800 static FaNum, max-width 672, wraps to two lines) →
subtitle «فقط یک گزینه قابل انتخاب است» (19/24 w500 white 55%, variable FaNum) → `.category-grid`
→ `NavButtons` (`nav-buttons--category`: بازگشت 138 + شروع بازی 189, 16 gap; شروع بازی disabled
at 35% while no category is selected) → `selectCategory` on start, `goBackToSurvey` on back
(returns to the survey — the previous step; the user stays registered).

The grid is **2 columns of 408px glass cards with 24px gaps, forced `direction: ltr`** so the
`CATEGORIES` config order reads left→right (پوشاک top-left, per the Figma); the last card
(کالای دیجیتال) spans both columns via `category-card--wide`. Each card stacks emoji (60px) →
name (24/32 DemiBold, static FaNum) → sponsor logo row (40px circles, `#F8F8F8`, 8px gaps, LTR,
file order = left→right) with ~16px gaps. The selected card uses the question-page treatment:
cyan border `rgba(111,228,242,0.65)` + primary glow + the cyan glass gradient (`.choice-card--selected`
language). Logos come from `public/stores/` keyed by category id (`CATEGORY_LOGOS` in the page
file); `src` URLs are `encodeURIComponent`-encoded (spaces / Persian filenames).

## Game Page Composition (Figma frames 5–8)

`PageShell` (corner glows + edge strip) + `FloatingDecorations` → `GameHeader` →
`StepTracker` (`JOURNEY_STEPS`, `currentIndex = 4` — «بازی» active) → either the play screen
(`NumberWheelGame`, frame 5) or, after `onComplete`, one of three result views
(`GameResultScreen`, frames 6–8). All game-page styles are rem-based; the play-screen classes live
in `src/games/number-wheel/number-wheel.css` (game-scoped `:root` tokens `--wheel-w/h/digit-font`),
the result-screen classes in `design-system.css` (`.game-result*`, `.result-digit*`, `.result-action*`).

**Frame 5 (play screen)** — `.slot-game` column (no exit control while playing — «خروج از بازی»
lives on the result screens): kicker «ماشین شانس» (14/22 w600 `#6FE4F2`) → heading «عدد NNN را پیدا کنید»
(48/60 w800 static FaNum; the target digits are `slot-game__target-digit` — gold
`--ds-gradient-gold-strong` text-clip, 64×72, LTR — rendered as **buttons** at IDLE (tap cycles the
digit 0→9, `▲` affordance) and **spans** once running) → «عدد تصادفی» ghost pill (IDLE only) →
`.slot-game__status` with two glass pills: «فرصتهای بازی» (cyan `--ds-eyebrow` dots, one per
attempt, live = spent) and «شلیک برای رقم N» (green `--ds-live` dots, one per shot) → `.reel-machine`
(864×518 design px glass box; `reel-labels` رقم ۱/۲/۳ LTR over `WheelGroup` of three 250×380 reels
with 180px digits, active reel cyan `--ds-glow-active-reel` + pulse) → `.slot-game__stop`
(288×128, radius 999, `--ds-gradient-primary` + `--ds-shadow-stop`; «شروع» at IDLE / «توقف» while
running, hidden at RESULT) → remote hint «دکمه ریموت را فشار دهید…» + `kbd` Space badge (decorative)
→ `.rules-panel` (glass, 📜 header, 3 rules — the last «در مجموع N فرصت» uses
`context.attemptsTotal` — and 3 `prize-card`s with **config** amounts, last card gold).

**Frame 6 (loss, retries left)** — kicker «این بار نشد» → heading «متأسفانه برنده نشدید» (72/84
w900 white) → subtitle «شما N رقم را درست حدس زدید» → three `.result-digit` cards (128×128, red
`#FF4D6D` border + `--ds-shadow-result-wrong`, digits `#FF8B96` for wrong, green for correct) →
«عدد هدف: NNN» (cyan, `--ds-eyebrow`, zero-padded 3 digits, LTR) → message «هنوز N فرصت دیگر
دارید!» (`attemptsRemaining`, dynamic) → actions: «خروج از بازی» (glass) + «تلاش دوباره»
(`result-action--primary`).

**Frame 7 (win)** — same skeleton with kicker «نتیجه بازی», heading «برنده شدید!»
(`game-result__heading--gradient` = `--ds-gradient-win-heading` text-clip), all three digit cards
green, and the gold `.game-result__prize` card (453×258 design px, `--ds-shadow-prize`, amount
96px gold-strong clip + «تومان») with the actual `winAmount`; `Confetti` when
`!reducedMotion`. Actions: «خروج از بازی» + «ادامه» (both → registration via `startNewUser`).

**Frame 8 (game over)** — same skeleton, message «فرصتهای بازی شما به پایان رسید و در این بازی
موفق به دریافت جایزه نشدید.», **only** «خروج از بازی» (primary).

Save-status variants: `"saving"` shows «در حال ثبت نتیجه…»; `"error"` shows the error line +
«تلاش مجدد»/«ادامه» under the view. All values (digits, target, amount, attempts) derive from the
actual `GameResult` + session — never hard-coded design values.

## Deviations From The Reference Spec (logged)

| # | Deviation | Reason |
|---|---|---|
| 1 | Both FaNum faces are wired in `design-tokens.css`: the static `IRANYekanXFaNum` (weights 400–900) and the variable `IRANYekanXVFaNum` (VF file, weight axis 100–900). Page 1 uses the **static** face for digit runs (keypad labels, phone display value + placeholder, «وارد کنید») and the **variable** face for the Persian texts (welcome block, step tracker, leaderboard panel). The rest of the design system uses the bundled `"B Yekan"`. `Orbitron` remains absent — the currency «ت» stack lists it first so it activates if the asset is added. | Asset availability + user font directive |
| 2 | The reference image (`public/App.png`) cannot be viewed by the implementing agent's environment; the spec text was treated as the source of truth for colors/typography and the described arrangement for hierarchy/mood. | Environment limitation |
| 3 | The `+98` prefix chip is removed entirely — no prefix is added or stored. The user enters the full 11-digit 09-form (`09108086113`), the display placeholder is `09---------`, and the entered digits are stored/reported **exactly as entered** (no modification); only the panel's display masking (`0910****113`) transforms them. | User directive |
| 4 | The digit cap is **11** — exactly the full 09-form (`isValidMobileDigits` = `/^09\d{9}$/`). | Spec's placeholder style |
| 5 | «تایید» calls the existing submit handler — including the anti-replay lookup and its fail-open path. There is no separate «ورود» button. | Spec keypad layout |
| 6 | Numbers are written as **English digits everywhere** in the design system (keypad, display, tracker, panel phones/ranks/amounts); the bundled fonts render them with Persian glyph shapes. Amounts use English grouping (`5,000,000`). | User directive |
| 7 | `letter-spacing: 5.4px` is applied to the entered digits and the placeholder only (isolated digits, not joined script), with a matching `text-indent` so the centered run sits optically centered. | Spec typography vs repo rule |
| 8 | The «زنده» pill is static decoration (no live data source exists). | No live feed in the repo |
| 9 | Rows 2–5 rank medals use 🥈 then plain numbers — matching the spec's "🥇 🥈 then numbers". | Spec |
| 10 | The panel uses avatars from a fixed 5-emoji set cycled by row index (`💰💷💴🪙💸`, updated 2026-08-26); the reference only shows the first row's 💰. Since 2026-08-26 the avatar circles bob via the `leaderboard-bob` keyframes. | `INFERRED` from the image description |
| 11 | Page 2: the typed count field is replaced by the Figma's four range cards. The exact count is no longer collected — each range stores a representative value (10/50/300/301, upper bound of the range). The old validation errors (`COUNT_EMPTY_ERROR` etc.) disappear with the field; the disabled ادامه is the new validation (spec §13). | Figma design vs existing behavior |
| 12 | Page 2: the design's stepper shows 3 survey questions («سوال 3») while the app collects 2 — the tracker mirrors the design's five labels; the third slot is simply never reached. | Design vs app reality |
| 13 | Page 2: the «در سازمان یا شرکتی کار نمی‌کنم» skip checkbox is not in the Figma frame but must stay (existing behavior, HARD RULES). It is rendered as a glass pill under the grid; checking it dims the grid and enables ادامه. | HARD RULES |
| 14 | Page 2: the template star-badge + LUCKY REELS wordmark is replaced by the organizer's `public/smartis_logo.svg` with the tagline «تجربه هیجان در غرفه اسمارتیز» (Vazirmatn 600, letter-spacing 0, centered; the Orbitron/Bahnschrift wordmark is removed). | User directive (2026-08-29) |
| 15 | Page 2: option labels use English digits (`1 تا 10 نفر` … `بیش از 300 نفر`) — the spec mixed Persian and English digits; the fonts render the Persian glyphs. Same as deviation 6. | User directive |
| 16 | Page 2: بازگشت did not exist before; it now appears on both survey steps. On step 1 it performs `startNewUser()` — the documented session reset — which returns to registration with a clean slate (a mid-survey back can never restore a previous user; none is stored). | New control vs existing session model |
| 17 | Page 4: بازگشت did not exist on the category page before; it now performs `goBackToSurvey()` — a session-level phase-back (`CATEGORY` → `SURVEY`) that keeps the user registered and restarts the survey at its step 1. The survey's own step-1 back still performs `startNewUser()` (full reset). | User request vs existing session model |
| 18 | Page 4: `CATEGORIES` in `src/config/appConfig.ts` was replaced with the Figma frame-4 set (پوشاک، خرید روزانه، طلا و زیورآلات، سفر و گردشگری، زیبایی و سلامت، ورزشی، کالای دیجیتال) — the config previously held 8 generic categories that matched no frame. Array order = visual order (the grid renders LTR). Stored `GameSessionResult.sector` ids change accordingly (no other code referenced the old ids). | User decision (asked and confirmed) |
| 19 | Page 4: sponsor logo rows use the local assets in `public/stores/` per the organizer's mapping; `image 9.png` appears in both پوشاک and ورزشی exactly as mapped. The last card spans both columns because the set has 7 categories (the Figma's layout); a different count would reflow automatically. | Organizer's logo mapping |
| 20 | Game page: the rules-panel prize cards and the win prize card show the **config** amounts (۵۰۰٬۰۰۰ / ۱٬۰۰۰٬۰۰۰ / ۵٬۰۰۰٬۰۰۰ تومان), not the Figma's ۵٬۰۰۰ — the frame's numbers are design examples and HARD RULES forbid hard-coding them. | HARD RULES |
| 21 | Game page: reel geometry is 250×380 with 180px digits (0.996 scale → 249.02×378.52, measured), the frame's 864×518 machine box; the Figma's raw sizes were already the design-scale equivalents. | Design canvas parity |
| 22 | Game page: the `kbd` Space badge next to the remote hint is **decorative** — the presenter keys remain PageUp/PageDown/b/F5/Ctrl+R (existing input model untouched; no Space handler was added). | Existing behavior |
| 23 | Game page: the frame-6 «تلاش دوباره» is absent on frame 8 (game over) — only «خروج از بازی» renders, per the explicit spec; the retry chain otherwise calls the existing `session.retry()` path (remount via `key`). | User directive |
| 24 | Game page: a win is any `winAmount > 0` — one exact digit (۵۰۰٬۰۰۰) already wins, so the win screen shows for 1–3 correct digits; the frame's 477/453 example digits are never used. | Game logic is the source of truth |
| 25 | Every page: the footer (Almas logo `public/almas_logo.svg` + «کاری از شرکت داده پردازی الماس شهر», 18/28 w600 at 45% white) is not in the Figma frames. It is pinned to the canvas bottom (absolute, `pointer-events: none`) — the game page's `.rules-panel` carries a 40px `margin-bottom` to clear it (all other pages fit within the frame's 56px bottom padding). | User directive (2026-08-29) |
| 26 | Glass layering (2026-08-29): the floating decorations now sit BEHIND the content (deco z-1 < frame z-2), so the choice cards / rules panel / leaderboard (all `backdrop-filter: blur(12px)`) frost them — the Figma has no deco-behind-glass spec, this is the organizer's desired depth. The deco glow is a brighter two-layer halo (`--ds-glow-deco`, a full filter list — a comma-separated shadow list inside one `drop-shadow()` is invalid and computes to `none`). Deco positions drift with the user's hand-edits; the glow follows each emoji automatically (filter on the same span). | User directive (2026-08-29) |
| 25 | Game page: the target line zero-pads to three digits («عدد هدف: ۰۴۳») — a target below 100 would otherwise show one or two digits, breaking the frame's three-digit presentation. | Frame presentation |
| 26 | Game page: «شلیک برای رقم N» labels the shot dots (N = next wheel to stop, ۱→۳) instead of the frame's «رقم ۱» pills wording; the semantics match the LTR labels above the reels. | Frame wording, same meaning |

## Restyling Status

Registration, survey, category, and the game page (frames 5–8) are redesigned into the design-scale
language; the standalone leaderboard page was deleted on 2026-08-26 (the leaderboard panel on
registration was part of page 1's redesign, and nothing uses the legacy `clamp()/vmin` language
anymore). The worked-example steps that produced the pages:

1. Compose each page inside `PageShell` (the shell is fixed — `logo`/`decorations` are the
   per-page slots) and `StepTracker` (with that page's `currentIndex`).
2. Consume ONLY tokens from `design-tokens.css`; add new tokens there, never in component CSS.
3. Fixed dimensions in rem (16 design px per rem); content-dependent sizes intrinsic.
4. Follow the BEM-ish class convention (`block__element--modifier`), Persian numerals at the
   display layer, `direction: ltr` on numeric runs, no letter-spacing on Persian text.
5. Keep container logic untouched; presentation-only changes only.
6. The category page (Figma frame 4) added: a LTR-forced grid so config order = visual order,
   `category-card--wide` for the full-width last card, and per-category sponsor logo rows from
   `public/stores/` (40px circles).
7. The game page (frames 5–8) kept the platform chrome (shell/header/tracker) while the play and
   result screens ship their own styles — play-screen CSS in the game module
   (`number-wheel.css`), result-screen CSS in `design-system.css`.
