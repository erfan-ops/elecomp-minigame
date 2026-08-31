# DOC_ID: AI-08_STYLING_AND_UI_CONVENTIONS
# SCOPE: Styling system, tokens, class naming, layout, responsive strategy, accessibility, asset conventions
# STATUS: VERIFIED
# PRIMARY_SOURCE_PATHS:
# - src/styles/global.css
# - src/styles/app.css
# - src/games/number-wheel/number-wheel.css
# - src/main.tsx
# - index.html
# - src/components/Confetti.tsx
# - src/games/number-wheel/components/NumberWheel.tsx
# - public/BYekan+.ttf
# - public/favicon.svg

## Styling System

Hand-written **plain CSS**. Three stylesheets, no preprocessor, no build-time CSS tooling beyond Vite's
default handling.

| Absent | Verified by |
|---|---|
| Tailwind / any utility framework | No `tailwind.config.*`, no `postcss.config.*`, no `@tailwind` directives |
| CSS Modules | No `*.module.css` file exists |
| CSS-in-JS (styled-components, emotion, vanilla-extract) | Not in `package.json` |
| SCSS / LESS / Stylus | No `*.scss` / `*.less` files, no preprocessor dependency |
| PostCSS plugins, autoprefixer | No config file |
| A component library (MUI, Chakra, shadcn, Radix) | No dependency; every control is a hand-written `<button>` |
| An icon library | None; all glyphs are Unicode characters in JSX |

Stylesheets and their import sites:

| File | Imported by | Contains |
|---|---|---|
| `src/styles/global.css` | `src/main.tsx` (first) | `@font-face`, all `:root` design tokens, reset, kiosk `body` rules, the single global `@media (prefers-reduced-motion)` block |
| `src/styles/design-tokens.css` | `src/main.tsx` (second) | The redesigned visual language's `--ds-*` token set and `html { font-size: calc(var(--s) * 16px) }` |
| `src/styles/app.css` | `src/main.tsx` (third) | Platform-level component classes |
| `src/styles/design-system.css` | `src/main.tsx` (fourth) | Component styles for `src/components/ui/` (rem-based, `--ds-*` tokens only) |
| `src/games/number-wheel/number-wheel.css` | `src/games/number-wheel/NumberWheelGame.tsx` | Play-screen classes (`.slot-game*`, `.reel-machine`, `.number-wheel*`, `.rules-panel`) + three game-scoped `:root` tokens (rem-based) |

Import order is load-bearing: `global.css` must come first because the other sheets consume its
`:root` tokens; `design-tokens.css` must precede `design-system.css`.

## Global Styles

`src/styles/global.css`:

```css
@font-face { font-family: "B Yekan"; src: url("/BYekan+.ttf") format("truetype");
             font-weight: 400; font-style: normal; font-display: swap; }
```

- `color-scheme: dark` on `:root`.
- `* { box-sizing: border-box }`.
- `html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0 }`.
- `body`: `overflow: hidden`, `overscroll-behavior: none`, `user-select: none`,
  `-webkit-tap-highlight-color: transparent`, and the font stack
  `"B Yekan", "Segoe UI", "Segoe UI Variable Display", Bahnschrift, system-ui, -apple-system,
  "Helvetica Neue", Arial, sans-serif`.
- One global media query:
  ```css
  @media (prefers-reduced-motion: reduce) {
    /* collapses animation-duration / animation-delay / transition-duration to 0.01ms !important */
  }
  ```

`index.html` sets the document-level conventions: `<html lang="fa" dir="rtl">`,
`<meta name="theme-color" content="#0a0e17">`, and a locked viewport
(`width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`).

## Theme Variables / Design Tokens

All platform tokens are CSS custom properties on `:root` in `src/styles/global.css`. There is no
light theme, no theme switcher, and no `data-theme` attribute — the kiosk is dark-only.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0a0e17` | Page background (also `theme-color`) |
| `--bg-glow` | `rgba(62, 198, 255, 0.07)` | `.app` radial-gradient accent |
| `--surface` | `#101726` | Cards, fields |
| `--surface-raised` | `#161f33` | Elevated surfaces, keys |
| `--wheel-bg` | `#0d1422` | Reel window background — **legacy, unused** (the redesigned reel uses `--ds-gradient-reel`) |
| `--wheel-bg-transparent` | `rgba(13, 20, 34, 0)` | Reel fade-gradient stop — **legacy, unused** |
| `--border` | `rgba(255, 255, 255, 0.1)` | Default border |
| `--border-strong` | `rgba(255, 255, 255, 0.26)` | Selected / active border |
| `--text` | `#eaf0fa` | Primary text |
| `--text-dim` | `#8b96ac` | Secondary text, labels |
| `--accent` | `#3ec6ff` | Cyan accent: focus rings, rolling reels, links of emphasis |
| `--stop` | `#e23d57` | **Unused** — the stop button is a cyan gradient (`.slot-game__stop`) |
| `--gold` | `#ffc857` | Keypad «تایید» label accent (`.keyboard__key--action`) |

(`--start`, `--start-text`, `--silver`, `--bronze`, `--danger`, and `--btn-min-h` were deleted
together with the leaderboard page and the `.btn` family.)

The redesigned palette (gold `--ds-gold #ffcf3a`, cyan `--ds-eyebrow #6fe4f2`, live green
`--ds-live #34d17a`, reel gradient, win-heading gradient, glows) lives in `src/styles/design-tokens.css`
— see `design-system.md`.

Game-scoped tokens declared in `src/games/number-wheel/number-wheel.css` `:root` (rem-based, 1 rem =
16 design px × `--s`; at the 1080×1793 canvas scale ≈ 0.996):

| Token | Value | Role |
|---|---|---|
| `--wheel-w` | `15.625rem` (250 px) | Reel width |
| `--wheel-h` | `23.75rem` (380 px) | Reel window height |
| `--digit-font` | `11.25rem` (180 px) | Reel digit size — each strip item is this tall; the centering offset is derived at runtime from the measured item/window ratio (see `05_MINIGAME.md`), never from these px values |

Per-instance CSS variables set from JSX (the only runtime-computed CSS values):
`--drift` and `--spin` on each `.confetti__piece` (`src/components/Confetti.tsx`).

## Class Naming Conventions

BEM-ish: `block`, `block__element`, `block--modifier`. Lowercase, hyphen-separated. No CSS-Modules
hashing, no utility classes, no `is-`/`has-` state prefixes.

Examples: `.number-wheel`, `.number-wheel__strip`, `.number-wheel--rolling`,
`.leaderboard-row--first`, `.choice-card--selected`, `.choice-card--wide`,
`.nav-button--primary`.

The `.btn*` and `.page*` families were deleted with the leaderboard page (2026-08-26). The
`.leaderboard-row*` panel rows are a stand-alone block in `design-system.css` (the `.chip*` pills
were removed with the old game top bar).

Conditional classes are composed in JSX with template literals and `.filter(Boolean).join(" ")`-style
concatenation, or ternaries. There is no `clsx`/`classnames` dependency.

State that CSS reacts to is expressed as **modifier classes**, with one exception: the reduced-motion
blur suppression uses a data attribute —
`.number-wheel__strip:not([data-reduced-motion="true"])`. Note the attribute is set to `"true"` or
omitted entirely, never `"false"`.

## Utility Classes

None in the Tailwind sense. The closest things to reusable primitives, all in `src/styles/app.css`:

| Class | Purpose |
|---|---|
| `.phone-display`, `.choice-card`, `.nav-button` | The redesigned fake-input/tappable surfaces (design-system.css) |
| `.confetti`, `.confetti__piece` | Celebration overlay |

(The `.page*` and `.btn*` primitives were deleted with the leaderboard page — no page-level button
family remains; the redesigned controls define their own styles.)

## Component Styling Patterns

- One CSS block per component, named after the component's DOM role, defined in the stylesheet that owns
  the component's layer.
- Platform components (`pages/`, `components/`) → `src/styles/app.css`.
- Game components → the game's own stylesheet (`number-wheel.css`), which ships with the game module.
- Class-based state, not inline style objects.
- **Inline styles are used in exactly one place**: `src/components/Confetti.tsx` line 41,
  `style={piece.style}`, because each piece needs randomized per-instance values.
- **Direct DOM style mutation happens in exactly one place**:
  `src/games/number-wheel/components/NumberWheel.tsx` line 111,
  `` strip.style.transform = `translate3d(0, ${percent}%, 0)` ``, written once per animation frame to
  avoid a React render.

## Responsive Behavior

**There are no width/height breakpoints.** The only media query in the entire project is
`prefers-reduced-motion` (`src/styles/global.css`).

Two sizing mechanisms coexist:

1. **The redesigned visual language (every page)** uses the design-scale
   variable: `src/app/designScale.ts` sets `--s = min(viewportWidth/DESIGN_WIDTH,
   viewportHeight/DESIGN_HEIGHT)` (design canvas 1080×1800) on `<html>`, `design-tokens.css` sets
   `html { font-size: calc(var(--s) * 16px) }`, and every fixed dimension in `design-system.css`,
   `number-wheel.css`, and the game/result screens is expressed in **rem** (1 rem = 16 design pixels
   × `--s`). The page shell is the fixed canvas (the `--ds-canvas-w` / `--ds-canvas-h` tokens),
   centered by `.app`'s flex layout; on screens whose aspect differs from the canvas, the dark
   background extends into the letterbox. Content-dependent sizes use intrinsic sizing. Full detail
   in `design-system.md`.
2. **Gone:** the leaderboard page was the last `clamp()`-with-`vmin` surface and was deleted, so the
   design scale now covers everything (the remaining `clamp()` calls live in `global.css`/`app.css`).

| Aspect | Approach |
|---|---|
| Font sizes | `rem` (design-scale) on every page |
| Spacing / padding / gap | `rem` (design-scale) |
| Touch targets | Per-control `min-height` (e.g. `.slot-game__stop` is 288×128 rem); the `--btn-min-h` token died with `.btn` |
| Reel dimensions | `--wheel-w`/`--wheel-h`/`--digit-font` (rem, see token table above) |
| Grids | Fixed column counts: `.category-grid` (2 × 408px design-scale, LTR, last card full-width), `.keyboard` 3 columns, `.choice-grid` 2 columns (survey step 1's fifth card is full-width via `.choice-card--wide`), `.rules-panel__prizes` 3 cards — they do not reflow |
| Page height | `height: 100%` chain from `html` → `body` → `#root` → `.app`; the `PageShell` is the fixed 1080×1800 canvas (67.5rem × 112.5rem), scaled by `--s` and centered by `.app`. The Almas credit footer (`page-shell__footer`) is pinned to the canvas bottom — absolute, `pointer-events: none` — and the game page's `.rules-panel` margin-bottom (40px) clears it |

Design orientation: **portrait / vertical touchscreen**. Nothing adapts to landscape.

## No-Scroll Rule

- `body { overflow: hidden; overscroll-behavior: none }`; `.app` and the page shells also
  `overflow: hidden`.
- **Nothing scrolls** — the registration leaderboard panel shows only the top 5 (`.leaderboard`'s
  `overflow-y: auto` died with the leaderboard page).
- Any new content must fit its page or live inside a deliberately scrollable container.

## RTL / Persian Conventions

| Rule | Implementation |
|---|---|
| Document direction | `<html lang="fa" dir="rtl">` — everything inherits RTL |
| Numeric sequences stay LTR | `direction: ltr` on `.keyboard`, `.leaderboard-row__phone`, `.wheel-group` (CSS) and `.reel-labels`, `.slot-game__target`, `.phone-display__value`, `.game-result__digits`, `.game-result__target-value`, `.game-result__prize-amount`, `.prize-card__value` (JSX `dir` or rem-based CSS) |
| Never add `letter-spacing` to Persian text | It breaks the joined script. `letter-spacing` appears only on numeric runs: the redesigned `.phone-display__value` / `.phone-display__placeholder` (5.4px on isolated digits) (`.leaderboard__mobile`'s 1px died with the leaderboard page; the Latin LUCKY REELS wordmark died 2026-08-29 — header/footer text is Vazirmatn with `letter-spacing: 0`) |
| Emphasis | Font weight, size, and color only |
| Persian numerals | Applied in JSX via `toPersianDigits` / `formatPersianNumber`, never via CSS |
| Mobile numbers | Written as **English digits** everywhere (the bundled fonts draw Persian glyph shapes); the redesigned page 1 shows keypad labels, the entered display (centered), and the panel's masked `09`-form (`formatPanelMobile`). Page 1's digit runs (keypad, phone display) use the static `IRANYekanXFaNum` face; the page-1 Persian texts (welcome, stepper, panel) use the variable `IRANYekanXVFaNum` face — both `@font-face` in `design-tokens.css`. Masked on public screens |
| Thousands separator | `٬` (U+066C) substituted in `formatPersianNumber` |

## Animation Conventions

3 `@keyframes` total:

| Keyframes | File | Used by |
|---|---|---|
| `confetti-fall` | `app.css:110` | `.confetti__piece` |
| `wheel-active-pulse` | `number-wheel.css:294` | `.number-wheel--active` |
| `wheel-lock-pulse` | `number-wheel.css:304` | `.number-wheel--just-locked` |

(The old `stop-attention`, `result-fade-in`, `card-enter`, and `perfect-glow` keyframes were deleted
with the result overlay.)

Conventions:

- Decorative motion is CSS-driven and is neutralized by the global reduced-motion block.
- Functional motion (reel spinning/settling) is JS-driven via rAF and is NOT affected by that CSS block —
  it is gated separately by the `reducedMotion` prop and `REDUCED_MOTION_SPEED_FACTOR`.
- `will-change: transform` is set on `.number-wheel__strip` only.
- Only `transform` and `opacity` are animated in hot paths.
- Spin blur is `filter: blur(1.6px)` on the strip with a `transition: filter`, suppressed via
  `data-reduced-motion`.

## Layout Patterns

| Pattern | Where |
|---|---|
| Full-height column flex, centered | `.slot-game` / `.game-result` (game + result screens, `flex: 1` inside `PageShell`) |
| Bottom-docked actions | `.game-result__actions` (the `.page__actions` family died with the leaderboard page) |
| Fixed-column CSS grid | `.category-grid` (2 × 408px, LTR, `--wide` last card), `.keyboard` (3 cols), `.choice-grid` (2 cols of answer cards, `.choice-card--wide` last card on survey step 1), `.rules-panel__prizes` (3 cards) |
| Glass chrome box | `.reel-machine` — 864×518 design px (54×32.375rem), `border-radius: 2.5rem`, dark translucent surface, holds the reel labels + `WheelGroup` |
| Row flex with gaps | `.wheel-group`, `.status-pill__dots`, `.nav-buttons`, `.game-header`, `.slot-game__status`, `.game-result__digits` |
| Layered stack for the reel | `.number-wheel__window` with absolutely positioned `__fade--top` / `__fade--bottom` gradient masks over the transformed `__strip` (no `__center` band anymore) |

The `z-index` values (2026-08-29): inside `.page-shell` the stacking is glows (auto) →
`.floating-deco` (1, behind the content) → `.page-shell__frame` (2, so the glass panels'
backdrop-filter blurs the decos) → `.page-shell__footer` (3); plus `1`
(`.status-pill__dot--live` glow layer). No overlay z-index remains — the result screens are
full-page sections, not overlays.

## Accessibility Considerations Present In Styles And Markup

- `:focus-visible` outlines are defined per control in `design-system.css` (e.g.
  `.result-action:focus-visible`). Focus is visible for the presenter's keyboard (the `.btn` outline
  died with the leaderboard page).
- Touch targets meet per-control `min-height`s (e.g. `.slot-game__stop` is 288×128 rem).
- `touch-action: manipulation` on tappable surfaces (suppresses double-tap zoom delay).
- `user-select: none` globally, `-webkit-tap-highlight-color: transparent`.
- Reduced-motion support at two levels: the global CSS override for decorative animation and the
  `usePrefersReducedMotion` hook for JS-driven motion (confetti suppression, blur suppression, speed
  factor).
- Semantics carried in markup, not CSS: `aria-pressed` (category/answer cards, keypad),
  `role="textbox"` + `aria-label` on fake inputs, `role="alert"` on error text, `role="img"` +
  dynamic Persian labels on reels, `role="group"` with labels (status pills, digit cards),
  `aria-hidden="true"` on all decorative nodes. The result screens are a `<section aria-label>`, not
  a dialog (no focus trap needed — no modal exists anymore).
- Color contrast is not automatically verified — `UNVERIFIED`. `--text-dim` (`#8b96ac`) on `--surface`
  (`#101726`) is the lowest-contrast pairing in use.
- No skip links, no focus trap in the result overlay (`aria-modal` is declared but focus is not
  programmatically managed) — see `12_KNOWN_GAPS_AND_RISKS.md`.

## Iconography

No icon library and no icon components. All glyphs are literal Unicode characters in JSX or CSS
`content`:

| Glyph | Where |
|---|---|
| `⌫` | Keyboard backspace key |
| `✓` | Keypad confirm key |
| `▲` | `button.slot-game__target-digit::after` — the "tap to change" affordance, shown only at IDLE |

Vector assets: `public/favicon.svg`, `public/smartis_logo.svg` (page header), `public/almas_logo.svg` (page footer).

## Asset Conventions

- Everything in `public/` is copied verbatim to the build root and referenced by absolute path.
- `public/BYekan+.ttf` → referenced as `url("/BYekan+.ttf")` from `global.css`.
- `public/favicon.svg` → referenced as `/favicon.svg` from `index.html`.
- No images are imported through the bundler; there is no `src/assets/` directory.
- No sprite sheets, no audio, no video, no JSON data files.

## Rules For Adding New Styles

1. Platform-level, reusable, or page-level styles → `src/styles/app.css`.
2. Tokens (colors, shared sizing) → `:root` in `src/styles/global.css`. Never hard-code a hex value that
   duplicates an existing token.
3. Game-specific styles → that game's own stylesheet, imported by the game's root component. Game
   stylesheets MUST NOT define platform primitives (`.confetti`; the old `.btn`/`.page` families are
   gone).
4. Follow `block__element--modifier`. Prefix game-local blocks so they cannot collide with platform
   classes (all three CSS files share one global namespace).
5. **Inline styles are NOT allowed** except for genuinely per-instance computed values, following the
   `Confetti` precedent. State belongs in modifier classes.
6. **Do NOT add width/height media queries.** Use rem-based sizes off the design-scale `--s` (see
   `design-system.md`); no `clamp()`-with-`vmin` sizing remains — it died with the leaderboard
   page. If a breakpoint becomes genuinely necessary, document the decision in `ai-docs`.
7. Never add `letter-spacing` to a selector that can contain Persian text.
8. Any element containing a numeric sequence MUST set `direction: ltr`.
9. Do not introduce page-level scrolling. Nothing scrolls today (the `.leaderboard` scroll region
   died with the leaderboard page).
10. New decorative animation MUST be CSS-based so the global reduced-motion override neutralizes it.
    JS-driven motion MUST honour `usePrefersReducedMotion`.
11. Animate only `transform` and `opacity` in per-frame paths.
12. Do not add a CSS framework, preprocessor, or CSS-in-JS library — the project has zero runtime
    dependencies beyond React and no CSS build step.
